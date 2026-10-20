# Known issues

- Authentication and portal data use an offline-capable demonstration repository and are not connected to a production backend.
- The application shell and remembered session work offline; multi-device outbox synchronization still requires the production API.
- Report PDFs are generated locally. Server-side signed PDFs, M-Pesa callbacks, SMS, APK, and Windows installer require deployment services or platform SDKs not present in this scaffold.
- Montserrat and Inter use local system fallbacks until licensed/self-hosted WOFF2 assets are supplied.
- The included Fastify service is a contract-complete mock and does not yet persist to PostgreSQL; replace its maps with the production Prisma repository before storing real learner data.
- Android Studio, the Android SDK, Electron, Windows code-signing tools, k6, Docker, and production provider credentials are environment dependencies and are not bundled.
