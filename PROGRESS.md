# Build progress

- P0: Existing Figma Make React/Vite scaffold retained; reference assets copied to `assets/reference`.
- P3: Design tokens, exact split login composition, responsive mobile switch, original SVG characters, field states, contact/help actions, and portal shells implemented.
- P6/P8 prototype: Functional teacher attendance/results views and learner home/results/reports/notices/fees views implemented with representative school data.
- P4/P5/P9-P11 client: Offline PWA shell, remembered device session, assignments, materials, timetable, CSV export, admin navigation and operational module views implemented.
- P7 client: Lazy, local CBC report PDF generation implemented for released reports.
- P1/P2 foundation: Pure CBC/fee/report/sync rules, Fastify auth and policy-shaped contracts, mock idempotent sync and payment endpoints, and unit tests implemented.
- P12: PWA manifest and cache, academic icon masters, Capacitor/Electron configurations, and reproducible platform bundle scripts implemented.
- P13/P14: Docker Compose, nginx, backups, k6 scenario, environment template, architecture/deployment/privacy/performance/report and role documentation implemented.
- Cross-portal workflow: persistent learner registration and lifecycle, admission-scoped login, subject-by-subject teacher marks, live CBC levels, automatic report completion, learner-specific PDFs, CSV export, and school identity customization implemented.

## Next step

Before live learner data is entered, replace mock API maps with the PostgreSQL repository, supply licensed font files and school branding, configure live providers, and build signed native artifacts on their required SDK hosts.
