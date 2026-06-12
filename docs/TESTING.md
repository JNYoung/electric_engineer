# Testing

This project keeps electrical physics and rendered compatibility checks separate so regressions are easier to diagnose.

## Commands

- `npm run test:physics` runs deterministic Vitest checks for the circuit solver.
- `npm run test:e2e` builds the production H5 workbench, serves `dist/h5`, and runs Playwright flows in desktop and mobile Chromium viewports.
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
- Canvas devices can be dragged without changing electrical physics, and selected wires can switch between orthogonal and smooth render paths.
- Training scenarios generate preset circuits, score challenge rules, surface safety diagnostics, index reusable fault/verification scenarios, and update the score after a fault is repaired.
- Virtual meter worksheets cover healthy parallel-circuit voltage/current/KCL/continuity readings, open-wire OL remediation, short-circuit lockout, and over-voltage danger states.
- Knowledge verification covers foundation electrical, university, and professional electrician tracks, grades answers, builds a wrong/unanswered review notebook, maps the active simulation to level-specific knowledge checks, generates formula verification cards, and generates measurement worksheets for live voltage/current/KCL/safety evidence.
- Assessment blueprints generate deterministic exam sessions for foundation electrical, university, and electrician certification paths, score weighted items, evaluate simulation readiness, build station submission gates from theory/simulation/meter evidence, build certification submission readiness, build practice reports, and return remediation for weak or unanswered areas.
- Material specification coverage checks common devices, engineering industrial-control components, renovation-control components, level filters, family filters, text search, training-ready material finder aggregation, and complete material training kits for foundation, university, electrician, and renovation practice.
- Commercial catalogs split engineering-control and renovation-control domains, keep category counts aligned, gate premium components by plan tier, build account/billing access snapshots, and expose auth/billing API contract placeholders.
- Telemetry tests verify the shared business event API can map the same event into domestic `cn-edu-v1` and overseas `global-edu-v1` envelopes, select region-specific endpoints at build time, disable dispatch, and sanitize undefined properties.
- The H5 e2e flow switches between engineering industrial control and renovation control tabs, confirms domain-specific components, verifies locked-feature summaries, and exercises the mock sign-in/payment entry points.
- The H5 e2e flow verifies the virtual meter panel in normal simulation, after opening the main switch, after disconnecting a branch return wire, and inside the mobile simulation tab.
- The H5 e2e flow answers knowledge questions across tracks, verifies the review notebook transitions from cleared to retraining after a wrong answer, checks simulation knowledge checks, formula verification cards, and measurement evidence, loads a reusable over-voltage fault scenario, and confirms the mobile status strip plus bottom navigation on the mobile viewport profile.
- Mobile e2e now treats bottom navigation as real routing between work zones: learning, simulation, bank, library, and account panels are each opened and checked for visibility while inactive zones stay hidden.
- The H5 e2e flow opens professional assessment sessions, verifies station and certification readiness move from incomplete to submittable to simulation-gap states, checks the practice report state, answers an electrician safety question, checks the score update, verifies material specs and material training kits change with the industry domain, and exercises material finder quick filters.
- H5 compatibility is checked on desktop and mobile viewport profiles; mini program compatibility is checked by `build:weapp`.
