import path from 'path'
import {app, BrowserWindow, shell} from 'electron'
import Remote from "@electron/remote/main";

Remote.initialize();

let win: BrowserWindow | null = null

async function createWindow() {
    win = new BrowserWindow({
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, './preload.js'),
            nodeIntegration: true,
            // enableRemoteModule: true,
            contextIsolation: false,
        },
    })

    win.webContents.session.on('will-download', (event, item, webContents) => {

        item.once('done', (event, state) => {
            if (state === 'completed') {
                shell.showItemInFolder(item.getSavePath())
            }
        })
    })

    Remote.enable(win.webContents);

    // win.setMenu(null)
    // win.maximize()
    win.show()

    // You can use `process.env.VITE_DEV_SERVER_URL` when the vite command is called `serve`
    if (process.env.VITE_DEV_SERVER_URL) {
        await win.loadURL(process.env.VITE_DEV_SERVER_URL)
        win.webContents.openDevTools()
    } else {
        // Load your file
        await win.loadFile('dist/index.html');
    }
}

app.on('window-all-closed', () => {
    app.quit()
    win = null
})

app.whenReady().then(createWindow)