# Android wrapper

Install Capacitor CLI and Android Studio, run the root web build, then run:

```bash
pnpm exec cap sync android --config apps/android/capacitor.config.ts
pnpm exec cap open android --config apps/android/capacitor.config.ts
```

Generate a release keystore with `keytool`, provide passwords through Gradle environment properties, and select **Generate Signed Bundle / APK** in Android Studio. Never commit signing material.
