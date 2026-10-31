const { app, BrowserWindow, shell } = require("electron")
const path = require("node:path")

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    title: "Smartschool",
    webPreferences: { contextIsolation: true, sandbox: true },
  })
  window.loadFile(path.join(__dirname, "../../dist/index.html"))
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url)
    return { action: "deny" }
  })
}

app.whenReady().then(createWindow)
app.on("window-all-closed", () => app.quit())
