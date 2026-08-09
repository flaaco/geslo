const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// Garde une référence globale de la fenêtre pour éviter qu'elle soit
// fermée automatiquement par le garbage collector JS.
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 650,
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    backgroundColor: '#ffffff',
    autoHideMenuBar: true, // cache la barre de menu par défaut d'Electron (File/Edit/View...)
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
    },
  });

  // Retire complètement le menu par défaut (garde juste la fenêtre propre)
  Menu.setApplicationMenu(null);

  mainWindow.loadFile(path.join(__dirname, 'dashboard.html'));

  // Ouvre les liens externes (http/https) dans le navigateur du système
  // plutôt que dans l'app elle-même.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Sur macOS il est courant que l'application reste active tant que
  // l'utilisateur ne quitte pas explicitement avec Cmd+Q.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
