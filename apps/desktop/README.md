# Windows wrapper

Install `electron` and `electron-builder`, run `pnpm build`, then package with:

```bash
pnpm exec electron-builder --config apps/desktop/electron-builder.yml --win nsis
```

Production installers should be Authenticode signed. Unsigned installers may trigger Microsoft SmartScreen.
