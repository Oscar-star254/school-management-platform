import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "ke.ac.greenfield.school",
  appName: "Greenfield Academy",
  webDir: "../../dist",
  server: { androidScheme: "https" },
  android: { backgroundColor: "#f6f8fa" },
}

export default config
