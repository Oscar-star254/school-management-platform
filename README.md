# Smartschool

Smartschool is the school management app for Smart Schools Kindergarten.

Responsive, installable school management product for a single Kenyan CBC school. It includes role-routed learner, teacher, and administration portals, offline shell caching, representative learner records, results, downloadable report PDFs, notices, fees, teacher attendance, score entry, academic administration, finance, audit, and device views.

## Run

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm api:start
```

In a normal local checkout, run `pnpm dev` in a second terminal. Figma Make already supervises the web development server, so do not start another one in this preview workspace.

## Demo access

Enter any username of at least three characters and any password of at least four characters. The left panel opens the learner portal and the right panel opens the teacher portal.

- Learner example: `DEMO-1042` / `demo2026`
- Teacher example: `t.wafula` / `demo2026`
- Administrator example: `admin` / `demo2026`

All names and records shown are fictional demonstration data.

Select **Remember me** to retain an offline-capable session on the current device. The production build registers the service worker and caches the application shell. Report PDFs are generated locally when downloaded.

## Results and learner lifecycle

Teacher marks are persisted by admission number and learning area. Changing a mark in **Teacher → Results** immediately updates only that learner's student portal. When every required learning area has a mark, the learner's Term 2 report changes to **Complete** and its PDF download is enabled automatically.

Administrators use **People → Learners** to register a learner and create the portal identity. The status control moves a learner between Active, Completed, and Transferred; only Active learners can log in or appear in current teacher entry lists. **System → Settings** updates the school name and motto across all portal shells.

## Academic, finance, and family workflows

Administrators publish reports by class and term, either for the full class or selected learners; released reports then appear in each learner's family Reports page. Events are managed separately from notices and can include a poster and location. Class teachers can edit their assigned class timetable, while administrators have read-only timetable access.

Administrators can customize school colors and badge, select invoice and report layouts, and set invoice footer details. Bulk invoices include unpaid prior-term balances without counting those carried balances twice in account statements. Teachers can attach assignment resources, and learners can hand in documents or images through their portal.

For the API-backed deployment, apply the Payload migrations before enabling these workflows. Assignment files are private and accessible only to the relevant learner/family, assigned teaching staff, and academic administrators.

## Deployment and providers

Copy `.env.example` to `.env`. `MPESA_MODE=MOCK` and `SMS_MODE=MOCK` are safe defaults. To connect live providers, set their modes and provide credentials only through deployment secrets. See `docs/deployment.md`, `docs/privacy.md`, and the three role guides.

```bash
docker compose -f infra/docker-compose.yml up -d --build
pnpm android:build
pnpm desktop:build
```

The platform scripts prepare the signed-app-ready offline web bundles. Android Studio with its SDK produces the signed APK/AAB; Electron and electron-builder produce the Windows NSIS installer. Exact commands and signing cautions are in `apps/android/README.md` and `apps/desktop/README.md`.
