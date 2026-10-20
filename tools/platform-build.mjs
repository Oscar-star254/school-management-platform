import { execFileSync } from "node:child_process"
import { cp, mkdir, rm, writeFile } from "node:fs/promises"
import process from "node:process"

const target = process.argv[2]
if (!["android", "desktop"].includes(target))
  throw new Error("Target must be android or desktop")
const temp = `.platform-build/${target}/web`
const output = `release/${target}`
await rm(temp, { recursive: true, force: true })
await mkdir(temp, { recursive: true })
await mkdir(output, { recursive: true })
await cp("dist", temp, { recursive: true, force: true })
execFileSync("tar", [
  "-czf",
  `${process.cwd()}/${output}/offline-web-bundle.tar.gz`,
  "-C",
  `.platform-build/${target}`,
  "web",
])
await rm(".platform-build", { recursive: true, force: true })
await writeFile(
  `release/${target}/BUILD-INSTRUCTIONS.txt`,
  target === "android"
    ? "The offline web bundle is ready. Use Android Studio and apps/android/capacitor.config.ts to generate a signed APK or AAB.\n"
    : "The offline web bundle is ready. Install Electron tooling and use apps/desktop/electron-builder.yml to generate the NSIS .exe.\n",
)
console.log(`Prepared ${target} offline bundle in ${output}.`)
