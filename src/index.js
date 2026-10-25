const { app, BrowserWindow, shell, ipcMain, Menu, powerSaveBlocker, screen, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const log = require('electron-log');
// Fork releases must never auto-update from the upstream application.
app.setName('Кадр');
if (process.env.KADR_PROFILE_DIR) {
  const profile = path.resolve(process.env.KADR_PROFILE_DIR);
  fs.mkdirSync(profile, {recursive:true});
  app.setPath('userData', profile);
  app.setPath('sessionData', profile);
}
const store = require('./store');
const players = require('./players');
const menu = require('./menu');
const {createNetwork,validProxy} = require('./network');
const network=createNetwork({app,getSession:()=>require('electron').session.defaultSession,request:opts=>require('electron').net.request(opts),store,log});

if (require('electron-squirrel-startup')) {
  app.quit();
}

app.commandLine.appendSwitch('enable-blink-features', 'AudioVideoTracks');

let mainWindow;
let miniPlayerPrev = null;
let psbId = null;

const isExternalHttpUrl = (url) => {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch (error) {
    return false;
  }
};

const openExternalIfHttp = (url) => {
  if (isExternalHttpUrl(url)) shell.openExternal(url);
  else log.warn('Blocked attempt to open non-http(s) URL:', url);
};

// Only the app's own top-level page may talk to the privileged handlers below. Sub-frames
// (remote embeds / iframes) and any other webContents are refused.
const isTrustedSender = (event) => {
  try {
    const frame = event.senderFrame;
    return !!mainWindow && event.sender === mainWindow.webContents &&
      !!frame && !frame.parent && frame.url.startsWith('file:');
  } catch (error) {
    return false;
  }
};

// `ipcMain.on` handler for synchronous calls: `event.returnValue` must always be set or the
// renderer blocks forever, so rejected callers get `fallback`.
const onSync = (channel, fallback, handler) => ipcMain.on(channel, (event, ...args) => {
  if (!isTrustedSender(event)) {
    log.warn(`[ipc] rejected ${channel} from untrusted sender`);
    event.returnValue = fallback;
    return;
  }
  event.returnValue = handler(event, ...args);
});

const onInvoke = (channel, handler) => ipcMain.handle(channel, (event, ...args) => {
  if (!isTrustedSender(event)) {
    log.warn(`[ipc] rejected ${channel} from untrusted sender`);
    throw new Error('untrusted sender');
  }
  return handler(event, ...args);
});

// IPC: node shims consumed by Lampa's own external-player code.
// Lampa calls require('fs').existsSync(...) synchronously, so this must be sync.
// Answers only for player executables, so it can't be used to probe the filesystem.
onSync('node-fs:existsSync', false, (event, filePath) => {
  try {
    return typeof filePath === 'string' && players.isAllowed(filePath) && fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
});

// A player that is named right but sits outside the usual install directories is only
// started after the user confirms it in a native dialog the page cannot drive.
let trustPromptOpen = false;
const askToTrustPlayer = async (cmd) => {
  if (trustPromptOpen || !mainWindow) return;
  trustPromptOpen = true;
  try {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Разрешить', 'Отмена'],
      defaultId: 1,
      cancelId: 1,
      message: 'Запустить этот файл как внешний плеер?',
      detail: `${cmd}\n\nФайл находится вне стандартных каталогов установки. Разрешайте, только если это ваш плеер.`
    });
    if (response === 0) players.trust(cmd);
  } finally {
    trustPromptOpen = false;
  }
};

onSync('node-cp:spawn', { error: 'untrusted sender' }, (event, payload) => {
  const { cmd, args } = payload || {};
  const sender = event.sender;
  const res = players.launch(cmd, args, (id, data) => {
    if (!sender.isDestroyed()) sender.send(`node-cp:event:${id}`, data);
  });
  if (res.error) log.warn('Rejected player spawn:', res.error);
  if (res.untrusted) askToTrustPlayer(cmd);
  return res;
});

ipcMain.on('node-cp:kill', (event, { id, signal } = {}) => {
  if (isTrustedSender(event)) players.kill(id, signal);
});

// Pre-fill Lampa's empty external-player path with whatever is installed.
onSync('desktop:defaultPlayerPath', '', () => players.detectDefaultPath());

onInvoke('desktop:detectPlayers', () => players.detectAll());

let playerPickerOpen = false;
onInvoke('desktop:choosePlayer', async () => {
  if (playerPickerOpen || !mainWindow || mainWindow.isDestroyed()) return { canceled: true };
  playerPickerOpen = true;
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Выбрать внешний плеер',
      buttonLabel: 'Выбрать плеер',
      properties: ['openFile'],
      filters: [{ name: 'Приложения', extensions: process.platform === 'win32' ? ['exe'] : ['*'] }]
    });
    if (result.canceled || result.filePaths.length !== 1) return { canceled: true };
    return players.selectBinary(result.filePaths[0]);
  } finally {
    playerPickerOpen = false;
  }
});

onInvoke('desktop:theme', (event, theme) => {
  if (!['olive','dark','lemon','light','tiffany','matcha','aqua'].includes(theme)) return false;
  if (process.platform === 'win32' && mainWindow && !mainWindow.isDestroyed()) {
    const bars={light:['#f5f7fa','#3e4d63'],lemon:['#202020','#fff44f'],tiffany:['#121413','#22f1a9'],matcha:['#e6dfbd','#475435'],aqua:['#eef7f3','#3d5c56']};
    const [color,symbolColor]=bars[theme]||['#0c1012','#a6b49d'];
    mainWindow.setTitleBarOverlay({ color, symbolColor });
  }
  return true;
});

// The desktop build always uses its bundled engine assets.
onSync('core:assets', {js:'app.js',css:'css/app.css'}, () => ({js:'app.js',css:'css/app.css'}));

onInvoke('desktop:config', () => {
  return {
    ...network.config(),
    version: app.getVersion()
  };
});

// A proxy sees (and can rewrite) all app traffic, so a change coming from the page has to be
// confirmed in a native dialog; remote Lampa plugins run in that page.
const confirmProxyChange = async (proxy) => {
  if (!mainWindow) return false;
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Применить', 'Отмена'],
    defaultId: 1,
    cancelId: 1,
    message: 'Изменить прокси для всего трафика приложения?',
    detail: proxy
  });
  return response === 0;
};

onInvoke('desktop:set', async (event, patch) => {
  patch = patch || {};
  const current=network.config(),next={...current};
  if(typeof patch.doh==='boolean')next.doh=patch.doh;
  if(typeof patch.proxyMode==='string'){
    if(!['system','direct','custom'].includes(patch.proxyMode))return {ok:false,error:'Неизвестный режим подключения'};
    next.proxyMode=patch.proxyMode;
  }
  if(typeof patch.proxy==='string'){
    const value=patch.proxy.trim();
    // Compatibility for the old desktop settings and existing plugins.
    if(!patch.proxyMode)next.proxyMode=value&&value!=='system'?'custom':'system';
    next.proxy=value==='system'?'':value;
  }
  if(next.proxyMode==='custom'&&!validProxy(next.proxy))return {ok:false,error:'Укажи адрес вида socks5://127.0.0.1:1080 или http://host:port'};
  if(next.proxyMode==='custom'&&(current.proxyMode!=='custom'||current.proxy!==next.proxy)&&!await confirmProxyChange(next.proxy))return {ok:false,error:'Смена прокси отменена'};
  const changed=JSON.stringify(next)!==JSON.stringify(current);
  if(changed){
    const before=store.get('network');store.merge('network',next);
    try{await network.apply();}catch(error){store.set('network',before);await network.apply().catch(()=>{});log.warn('[net] settings failed:',error.message);return {ok:false,error:'Не удалось применить настройки подключения'};}
  }
  return {ok:true,config:{...network.config(),version:app.getVersion()}};
});
onInvoke('desktop:networkCheck',(event,key)=>network.check(key));
onInvoke('desktop:networkReset',()=>network.reset());
onInvoke('desktop:networkError',(event,url)=>network.lastError(url));

// Mini-player (always-on-top compact window).
const toggleMiniPlayer = () => {
  if (!mainWindow) return;
  if (miniPlayerPrev) {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setMinimumSize(800, 600);
    if (miniPlayerPrev.maximized) mainWindow.maximize();
    else mainWindow.setBounds(miniPlayerPrev.bounds);
    miniPlayerPrev = null;
  } else {
    miniPlayerPrev = { bounds: mainWindow.getBounds(), maximized: mainWindow.isMaximized() };
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    mainWindow.setMinimumSize(320, 180);
    const area = screen.getPrimaryDisplay().workAreaSize;
    mainWindow.setBounds({ width: 500, height: 281, x: area.width - 520, y: 40 });
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  }
};

// Window.
const persistBounds = () => {
  if (!mainWindow || miniPlayerPrev) return;
  const maximized = mainWindow.isMaximized();
  const b = mainWindow.getBounds();
  store.merge('window', {
    maximized,
    width: maximized ? store.get('window').width : b.width,
    height: maximized ? store.get('window').height : b.height,
    x: maximized ? store.get('window').x : b.x,
    y: maximized ? store.get('window').y : b.y
  });
};

const createWindow = () => {
  const w = store.get('window');

  mainWindow = new BrowserWindow({
    width: w.width,
    height: w.height,
    x: w.x,
    y: w.y,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#101214',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false,
      webSecurity: true,
      webviewTag: false,
      allowRunningInsecureContent: false,
      navigateOnDragDrop: false
    },
    icon: path.join(__dirname, '..', 'icons', 'frame.png'),
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    ...(process.platform === 'win32' ? { titleBarOverlay: { color: '#0c1012', symbolColor: '#a6b49d', height: 36 } } : {})
  });

  if (w.maximized) mainWindow.maximize();

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (process.platform === 'darwin') mainWindow.focus();
  });

  const wc = mainWindow.webContents;

  wc.on('context-menu', (event, params) => {
    if (!params.isEditable) return;
    const flags = params.editFlags;
    const editMenu = Menu.buildFromTemplate([
      { id: 'edit-undo', label: 'Отменить', role: 'undo', enabled: flags.canUndo },
      { id: 'edit-redo', label: 'Повторить', role: 'redo', enabled: flags.canRedo },
      { type: 'separator' },
      { id: 'edit-cut', label: 'Вырезать', role: 'cut', enabled: flags.canCut },
      { id: 'edit-copy', label: 'Копировать', role: 'copy', enabled: flags.canCopy },
      { id: 'edit-paste', label: 'Вставить', role: 'paste', enabled: flags.canPaste },
      { type: 'separator' },
      { id: 'edit-select-all', label: 'Выделить всё', role: 'selectAll', enabled: flags.canSelectAll }
    ]);
    editMenu.popup({ window: mainWindow });
  });

  // Keep the screen awake only while media is actually playing.
  wc.on('media-started-playing', () => {
    if (psbId === null || !powerSaveBlocker.isStarted(psbId)) {
      psbId = powerSaveBlocker.start('prevent-display-sleep');
    }
  });
  wc.on('media-paused', () => {
    if (psbId !== null && powerSaveBlocker.isStarted(psbId)) {
      powerSaveBlocker.stop(psbId);
      psbId = null;
    }
  });

  wc.on('will-navigate', (event, navigationUrl) => {
    if (navigationUrl !== wc.getURL()) {
      event.preventDefault();
      openExternalIfHttp(navigationUrl);
    }
  });

  wc.setWindowOpenHandler(({ url }) => {
    openExternalIfHttp(url);
    return { action: 'deny' };
  });

  mainWindow.on('resize', persistBounds);
  mainWindow.on('move', persistBounds);
  mainWindow.on('close', persistBounds);
  mainWindow.on('closed', () => { mainWindow = null; });
};

// Apply settings before the first catalog request; never race window creation.
const applyNetworkConfig=()=>network.apply();
const setDoh=(enabled)=>store.merge('network',{doh:!!enabled});
const getDoh=()=>network.config().doh;

// App lifecycle.
app.on('web-contents-created', (event, contents) => {
  contents.on('will-attach-webview', (attachEvent) => attachEvent.preventDefault());
  contents.setWindowOpenHandler(({ url }) => {
    openExternalIfHttp(url);
    return { action: 'deny' };
  });
});

app.whenReady().then(async () => {
  network.install();
  try{await applyNetworkConfig();}catch(error){log.warn('[net] startup settings failed:',error.message);}

  const { session } = require('electron');

  // Deny every permission prompt (camera, microphone, geolocation, notifications, ...) except
  // the few the app's own page needs. Electron grants all of them by default, including to
  // remote iframes.
  const GRANTED = new Set(['fullscreen', 'clipboard-sanitized-write', 'pointerLock']);
  const fromAppPage = (url) => typeof url === 'string' && url.startsWith('file:');
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) =>
    callback(GRANTED.has(permission) && fromAppPage(details && details.requestingUrl)));
  session.defaultSession.setPermissionCheckHandler((wc, permission, requestingOrigin, details) =>
    GRANTED.has(permission) && fromAppPage((details && details.requestingUrl) || requestingOrigin));

  // Let Lampa's localhost timecode polling (VLC / MPC web APIs) read cross-origin from file://.
  // Only for requests made by the app's own top-level page: a remote iframe or plugin frame
  // must not get to read local services (TorrServer, routers, dev servers) this way.
  const LOCAL_URL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//i;
  const fromAppFrame = (details) => {
    try {
      const frame = details.frame;
      return !!frame && !frame.parent && frame.url.startsWith('file:');
    } catch (error) {
      return false;
    }
  };
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (LOCAL_URL.test(details.url) && fromAppFrame(details)) {
      const headers = Object.assign({}, details.responseHeaders);
      for (const name of Object.keys(headers)) {
        if (/^access-control-allow-(origin|headers)$/i.test(name)) delete headers[name];
      }
      headers['access-control-allow-origin'] = ['*'];
      headers['access-control-allow-headers'] = ['*'];
      callback({ responseHeaders: headers });
    } else {
      callback({ responseHeaders: details.responseHeaders });
    }
  });

  createWindow();
  Menu.setApplicationMenu(menu.build({
    win: mainWindow,
    onToggleMiniPlayer: toggleMiniPlayer,
    getDoh,
    onSetDoh: async (enabled) => {
      setDoh(enabled);
      await applyNetworkConfig();
      if (mainWindow) dialog.showMessageBox(mainWindow, {
        type: 'info',
        message: enabled ? 'DNS через HTTPS включён' : 'DNS через HTTPS выключен',
        detail: 'Настройки применены. При включении DNS через HTTPS доступен возврат к системному DNS.'
      });
    },
    onOpenConfig: () => shell.openPath(store.FILE)

  }));


  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Кадр 1.0.0 updates are distributed as complete release packages.
});

app.on('before-quit', () => players.killAll());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

process.on('uncaughtException', (error) => {
  log.error('Необработанная ошибка:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Необработанное отклонение промиса:', promise, 'причина:', reason);
});
