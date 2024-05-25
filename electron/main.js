import path from 'path';
import { app, BrowserWindow } from 'electron';
let win;
async function createWindow() {
    win = new BrowserWindow({
        webPreferences: {
            preload: path.join(__dirname, './preload.js'),
        },
    });
    // You can use `process.env.VITE_DEV_SERVER_URL` when the vite command is called `serve`
    if (process.env.VITE_DEV_SERVER_URL) {
        await win.loadURL(process.env.VITE_DEV_SERVER_URL);
        win.webContents.openDevTools();
    }
    else {
        // Load your file
        await win.loadFile('dist/index.html');
    }
    win.maximize();
    win.show();
}
app.on('window-all-closed', () => {
    app.quit();
    win = null;
});
app.whenReady().then(createWindow);
