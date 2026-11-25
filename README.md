# pi-orchestrator

A plan/approval/execute/review state machine for one Pi session. Plan state is stored in a version-1 session-scoped Durable document; persisted sessions use SQLite, while `--no-session` uses memory. Plan mode enables only read-oriented tools; an explicit `/orchestrator approve` confirmation is required before execution tools are enabled.

## Install

```sh
cd ~/Work/pi-orchestrator && npm install --legacy-peer-deps
pi install ~/Work/pi-orchestrator
```

Pi's local package installer does not install npm dependencies; run `npm install --legacy-peer-deps` in the package directory first. Ask the model to use `orchestrator_plan` with a goal, ordered steps, files, verification commands, and replan conditions. Review it with `/orchestrator status`, then run `/orchestrator approve`. During execution, the model marks the active step done with `orchestrator_review` and verification evidence, records a replan finding, or finishes once all steps are done. `/orchestrator on|off|status|models|approve` controls the mode.

When installed with teamwork or swarm, the approved-only `orchestrator_dispatch` tool invokes either package through Pi's normal tool permission hooks. A review result also names available dispatch tools; no extension event bus or cross-package import is assumed. Planner and executor models remain user-controlled using Pi's `/model` command.

## Safety boundary

Plan mode disables Pi's built-in bash/edit/write tools and filters tool calls; keep third-party write-capable tools disabled too. The approval gate is an execution-mode permission boundary, not a sandbox: approved execution commands still require normal review. Plans and evidence are model-authored session data. Persisted SQLite state is stored in the Pi session directory with owner-only permissions, and a second process cannot open the same session database concurrently. In-memory Pi sessions use in-memory Durable storage and do not survive process exit. Run checks with `node --experimental-strip-types --test orchestrator-utils.test.ts durable-runtime.test.ts`.
