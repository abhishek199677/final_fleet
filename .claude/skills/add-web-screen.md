# Skill: add a web screen

1. Route under packages/web/app/(owner)/..., app/(ops)/... or app/(admin)/... — pick by role. Route groups have guards; do not bypass.
2. Data via the generated client in packages/shared; ops screens import only from `@fleetos/shared/ops`.
3. Forms: react-hook-form + zod schema mirroring the DTO; money inputs use the MoneyInput component (currency select + amount + fx pre-filled from tenant FX table).
4. Photo capture: `<input type="file" accept="image/*" capture="environment">`; upload via presign → PUT → commit; show evidence badge.
5. Offline (ops screens only): wrap submit in `useOfflineQueue()` which stores the payload + files in IndexedDB and retries on `online` and every 60s; show "Saved on device, will upload" state.
6. Strings via next-intl keys in messages/en.json and messages/fr.json (add both).
7. Playwright test for the happy path and one validation error.
8. Design: one question per screen; numbers before tables before forms; status colours green/amber/red; ops screens ≤ 6 visible fields, photo first; no financial vocabulary on ops screens.
