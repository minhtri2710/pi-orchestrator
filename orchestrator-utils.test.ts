import assert from "node:assert/strict";
import test from "node:test";
import { advancePlan, approvePlan, availableDispatchTools, restoreTools, validatePlanSteps } from "./orchestrator-utils.ts";

function fixture() {
  return { id: "p1", goal: "change", approved: true, phase: "execute" as const, createdAt: "now", steps: [
    { id: "one", task: "first", status: "running" as const },
    { id: "two", task: "second", status: "pending" as const },
  ] };
}

test("completed step advances one pending step and records review phase", () => {
  const plan = fixture();
  advancePlan(plan, "complete_step", "one");
  assert.equal(plan.steps[1].status, "running");
  advancePlan(plan, "complete_step", "two");
  assert.equal(plan.phase, "review");
  assert.equal(advancePlan(plan, "finish").phase, "complete");
});

test("re-approval resumes the existing running step without advancing another pending step", () => {
  const plan: import("./orchestrator-utils.ts").Plan = fixture();
  approvePlan(plan);
  approvePlan(plan);
  assert.deepEqual(plan.steps.map((step) => step.status), ["running", "pending"]);
  plan.phase = "complete";
  assert.throws(() => approvePlan(plan), /already complete/);
});

test("invalid step transitions and premature finish fail closed", () => {
  assert.throws(() => advancePlan(fixture(), "complete_step", "wrong"), /not running/);
  assert.throws(() => advancePlan(fixture(), "finish"), /reviewed/);
});

test("tool restoration preserves the captured selection through plan mode and new sessions", () => {
  assert.deepEqual(restoreTools(["read", "edit"], true, ["read", "orchestrator_plan"], ["read", "edit"]), ["read", "edit"]);
  assert.deepEqual(restoreTools(undefined, true, ["read", "orchestrator_plan"], ["read", "edit"]), ["read", "edit"]);
  assert.deepEqual(restoreTools(undefined, false, ["read", "edit"], []), ["read", "edit"]);
});

test("dispatch availability only reflects loaded workflow tools", () => {
  assert.deepEqual(availableDispatchTools(["teamwork_workflow", "read", "swarm"]), ["teamwork_workflow", "swarm"]);
});

test("replan clears approval and resets unfinished steps", () => {
  const plan: import("./orchestrator-utils.ts").Plan = fixture(); plan.steps[0].status = "done";
  const updated = advancePlan(plan, "replan");
  assert.equal(updated.phase, "plan"); assert.equal(updated.approved, false);
  assert.deepEqual(updated.steps.map((step) => step.status), ["done", "pending"]);
});

test("re-approving a plan in review phase preserves review and allows finish", () => {
  const plan: import("./orchestrator-utils.ts").Plan = fixture();
  advancePlan(plan, "complete_step", "one");
  advancePlan(plan, "complete_step", "two");
  assert.equal(plan.phase, "review");
  plan.approved = false;
  approvePlan(plan);
  assert.equal(plan.phase, "review");
  assert.equal(plan.approved, true);
  assert.equal(advancePlan(plan, "finish").phase, "complete");
});

test("validatePlanSteps rejects duplicate step IDs", () => {
  assert.doesNotThrow(() => validatePlanSteps([{ id: "one" }, { id: "two" }]));
  assert.throws(() => validatePlanSteps([{ id: "one" }, { id: "one" }]), /Duplicate plan step id: one/);
});
