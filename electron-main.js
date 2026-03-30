const { app, BrowserWindow } = require('electron');
const path = require('path');
const net = require('net');

let mainWindow;
let currentPort;

function findFreePort(startPort, callback) {
  const server = net.createServer();
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      findFreePort(startPort + 1, callback);
    } else {
      callback(null, startPort);
    }
  });
  server.once('listening', () => {
    const port = server.address().port;
    server.close(() => callback(null, port));
  });
  server.listen(startPort, '127.0.0.1');
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 640,
    minHeight: 480,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL('http://localhost:' + (port || currentPort || process.env.PORT || 3000));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  const userData = app.getPath('userData');
  process.env.BILLS_APP_DATA_DIR = path.join(userData, 'data');
  process.env.BILLS_APP_UPLOADS_DIR = path.join(userData, 'uploads');
  findFreePort(3000, (err, port) => {
    if (err || port == null) {
      port = 3000;
    }
    currentPort = port;
    process.env.PORT = String(port);
    require('./server');
    setTimeout(() => createWindow(port), 400);
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow(currentPort || parseInt(process.env.PORT, 10) || 3000);
});
