# Fleet OS Mobile (scaffold — deferred per CLAUDE.md stack rule)

Built after web launch (TSD §9, BRD §3 Mobile). Same API (`/v1` + OpenAPI at `packages/api/openapi.json`).

Scope when started (S11-15 equivalent for mobile):
- Riverpod + Drift, generated API client from OpenAPI.
- Upload queue: every write stored locally with `client_uuid` + photo paths; background push photos (presign → PUT → commit) then records (WRK-07).
- Camera with meter framing guide, original ≤3MB, device SHA-256, GPS + accuracy, capture_source (TSD §9).
- Reference data cached at login; push via FCM (ALT-01).

Do NOT start full build until: web launch acceptance green (BRD §8), `pnpm test` + isolation + finance-denial green.
