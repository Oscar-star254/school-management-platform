# Product decisions

- The canonical Figma Make React/Vite scaffold is retained rather than replacing it with a monorepo because the repository instructions designate this structure and the supervised preview relies on it.
- The first delivery is a polished, navigable product slice using representative in-memory data. Production API, database, packaging, and provider integrations remain separate engineering phases.
- Public social login is not shown. The two login pills provide school login help and telephone contact.
- Greenfield Academy is temporary configurable demonstration identity pending the school's real name, crest, colours, contact details, and report form.
- The current Fastify service uses deterministic mock storage so authentication, sync, report, and M-Pesa contracts run without external credentials. PostgreSQL and Redis services are provisioned in Compose for the production repository implementation.
- Platform build scripts always prepare verified offline web bundles. Native APK/AAB and NSIS signing remain explicit SDK steps so the repository never fabricates native artifacts.
