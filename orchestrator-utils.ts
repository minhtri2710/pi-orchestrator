export type Step = { id: string; task: string; files?: string[]; verify?: string[]; replanIf?: string[]; status: "pending" | "running" | "done" | "blocked" };
export type Plan = { id: string; goal: string; steps: Step[]; approved: boolean; phase: "plan" | "execute" | "review" | "complete"; createdAt: string };
export function availableDispatchTools(names: string[]): string[] {
  return names.filter((name) => name === "teamwork_workflow" || name === "swarm");
}
export function restoreTools(saved: string[] | null | undefined, enabled: boolean, current: string[], fallback: string[]): string[] {
  return saved ?? (enabled ? fallback : current);
}
export function validatePlanSteps(steps: readonly { id: string }[]): void {
  const seen = new Set<string>();
  for (const step of steps) {
    if (seen.has(step.id)) throw new Error(`Duplicate plan step id: ${step.id}`);
    seen.add(step.id);
  }
}
export function approvePlan(value: Plan): Plan {
  if (value.phase === "complete") throw new Error("Plan is already complete");
  value.approved = true;
  const next = value.steps.find((step) => step.status === "running") ?? value.steps.find((step) => step.status === "pending");
  if (next) {
    next.status = "running";
    value.phase = "execute";
  } else {
    value.phase = "review";
  }
  return value;
}
export function advancePlan(value: Plan, action: "complete_step" | "replan" | "finish", stepId?: string): Plan {
  if (action === "complete_step") {
    const step = value.steps.find((item) => item.id === stepId);
    if (!step || step.status !== "running") throw new Error(`Step ${stepId ?? "(missing)"} is not running`);
    step.status = "done";
    const next = value.steps.find((item) => item.status === "pending");
    if (next) { next.status = "running"; value.phase = "execute"; }
    else value.phase = "review";
  } else if (action === "replan") {
    value.phase = "plan"; value.approved = false;
    for (const step of value.steps) if (step.status !== "done") step.status = "pending";
  } else {
    if (value.phase !== "review" || value.steps.some((step) => step.status !== "done")) throw new Error("Cannot finish until all plan steps are reviewed");
    value.phase = "complete";
  }
  return value;
}
