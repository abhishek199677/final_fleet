# Fleet OS agent kit

Drop these files into the root of a new repository before writing any code.

- CLAUDE.md — standing orders read by the coding agent every session.
- .claude/skills/ — repeatable recipes the agent follows for tables, endpoints, screens, alerts, billing.
- .github/workflows/ci.yml — guardrails: migration linter, generated RLS isolation suite, finance denial, append-only, OpenAPI drift, boundary lint, e2e, CDK diff on PRs, auto-deploy to dev on main.
- docs/BRD.md, docs/TSD.md — the spec the agent cites.
- docs/BACKLOG.md — ordered slices with paste-ready prompts for weeks 0–8.

Workflow: pick the next slice from BACKLOG.md → new git worktree and fresh agent session → paste the prompt → review the plan → let it run to green → second agent reviews the diff against CLAUDE.md → you review → merge → CI deploys dev.
