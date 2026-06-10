# Testing

This project keeps electrical physics and rendered compatibility checks separate so regressions are easier to diagnose.

## Commands

- `npm run test:physics` runs deterministic Vitest checks for the circuit solver.
- `npm run test:e2e` starts the H5 workbench and runs Playwright flows in desktop and mobile Chromium viewports.
- `npm run test:compat` verifies the production H5 build and WeChat mini program build.
- `npm test` runs typecheck, physics tests, e2e tests, and compatibility builds.

## Covered Behavior

- 12V parallel loads receive the expected terminal voltage, current, power, and total current.
- Opening the main switch drops load current to zero and reports an open circuit.
- Disconnecting one return wire only disables that branch while the other parallel branch stays active.
- Direct source positive-to-negative bridging is reported as a protected short circuit.
- Weak-current additions such as stepper motors and DIP switches auto-connect, show schematic icons with no letter-only placeholders, and produce active simulated effects.
- H5 compatibility is checked on desktop and mobile viewport profiles; mini program compatibility is checked by `build:weapp`.
