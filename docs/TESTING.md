# Testing

This project keeps electrical physics and rendered compatibility checks separate so regressions are easier to diagnose.

## Commands

- `npm run test:physics` runs deterministic Vitest checks for the circuit solver.
- `npm run test:e2e` starts the H5 workbench and runs Playwright flows in desktop and mobile Chromium viewports.
- `npm run test:compat` verifies the production H5 build and WeChat mini program build.
- `npm test` runs typecheck, physics tests, e2e tests, and compatibility builds.

If Playwright's bundled Chromium is not installed but system Chrome exists, local runs can use:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:e2e
```

## Covered Behavior

- 12V parallel loads receive the expected terminal voltage, current, power, and total current.
- Opening the main switch drops load current to zero and reports an open circuit.
- Disconnecting one return wire only disables that branch while the other parallel branch stays active.
- Direct source positive-to-negative bridging is reported as a protected short circuit.
- Weak-current additions such as stepper motors and DIP switches auto-connect, show schematic icons with no letter-only placeholders, and produce active simulated effects.
- Training scenarios generate preset circuits, score challenge rules, surface safety diagnostics, index reusable fault/verification scenarios, and update the score after a fault is repaired.
- Knowledge verification covers high-school, university, and professional electrician tracks, grades answers, and maps the active simulation to level-specific knowledge checks.
- Assessment blueprints generate deterministic exam sessions for high-school, university, and electrician certification paths, score weighted items, evaluate simulation readiness, build practice reports, and return remediation for weak or unanswered areas.
- Material specification coverage checks common devices, engineering industrial-control components, renovation-control components, level filters, family filters, and text search.
- Commercial catalogs split engineering-control and renovation-control domains, keep category counts aligned, gate premium components by plan tier, build account/billing access snapshots, and expose auth/billing API contract placeholders.
- The H5 e2e flow switches between engineering industrial control and renovation control tabs, confirms domain-specific components, verifies locked-feature summaries, and exercises the mock sign-in/payment entry points.
- The H5 e2e flow answers knowledge questions across tracks, verifies simulation knowledge checks, loads a reusable over-voltage fault scenario, and confirms the mobile status strip plus bottom navigation on the mobile viewport profile.
- The H5 e2e flow opens professional assessment sessions, verifies simulation readiness reacts to an open switch, checks the practice report state, answers an electrician safety question, checks the score update, and verifies material specs change with the industry domain.
- H5 compatibility is checked on desktop and mobile viewport profiles; mini program compatibility is checked by `build:weapp`.
