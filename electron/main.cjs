// electron/main.cjs
const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const { exec, execFile } = require("child_process");

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("enable-features", "AudioServiceOutOfProcess");
app.commandLine.appendSwitch("disable-features", "AutoplayIgnoreWebAudio");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === "media" || permission === "audioCapture") {
        callback(true);
      } else {
        callback(false);
      }
    }
  );

  const isDev = process.env.ELECTRON_DEV === "true";

  if (isDev) {
    try {
      mainWindow.loadURL("http://localhost:3000");
    } catch (error) {
      console.error("Failed to load URL:", error);
    }
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist-renderer/index.html"));
  }

  mainWindow.focus();

  mainWindow.setAlwaysOnTop(true);
  setTimeout(() => mainWindow.setAlwaysOnTop(false), 1000);

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

ipcMain.handle('ping', () => {
  return 'pong';
});

// -------------------- System Audio Orchestration (macOS) --------------------
// Note: Production-grade handling of virtual audio device installation and setup.
// This respects macOS constraints: no silent installs, explicit user approvals, and restarts.

const isMac = process.platform === 'darwin';
const BLACKHOLE_PKG_RELATIVE = path.join('audio', 'blackhole-2ch.pkg');
const BLACKHOLE_PKG_PATH = path.join(process.resourcesPath || path.join(__dirname, '..'), BLACKHOLE_PKG_RELATIVE);
const BLACKHOLE_DEVICE_NAME = 'BlackHole 2ch';

function getMicPermissionStatus() {
  if (!isMac) return 'not-determined';
  try {
    const { systemPreferences } = require('electron');
    return systemPreferences.getMediaAccessStatus('microphone');
  } catch (e) {
    console.warn('[system-audio] Failed to check mic permission', e);
    return 'not-determined';
  }
}

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(Object.assign(err, { stdout, stderr }));
      resolve({ stdout, stderr });
    });
  });
}

async function isVirtualDeviceInstalled() {
  if (!isMac) return false;
  try {
    const { stdout } = await run('system_profiler SPAudioDataType -json');
    const json = JSON.parse(stdout);
    const devices = (json.SPAudioDataType || []).flatMap(d => d._items || []);
    return devices.some(d => (d._name || '').includes(BLACKHOLE_DEVICE_NAME));
  } catch (e) {
    console.warn('[system-audio] Failed to query audio devices', e);
    return false;
  }
}

async function listInputDevices() {
  if (!isMac) return [];
  try {
    const { stdout } = await run('system_profiler SPAudioDataType -json');
    const json = JSON.parse(stdout);
    const devices = (json.SPAudioDataType || []).flatMap(d => d._items || []);
    return devices.filter(d => d.coreaudio_input === 'spaudio_yes').map(d => ({
      name: d._name,
      uid: d.coreaudio_device_uid || d.coreaudio_default_input_device || d._name,
      isAggregate: d.coreaudio_device_transport === 'spaudio_transport_aggregate',
    }));
  } catch (e) {
    return [];
  }
}

async function hasAggregateWithBlackHole() {
  if (!isMac) return false;
  try {
    const inputs = await listInputDevices();
    // Check if there's an aggregate device that includes "BlackHole" in its name
    return inputs.some(d => d.isAggregate && d.name.toLowerCase().includes('blackhole'));
  } catch (e) {
    return false;
  }
}

async function hasBlackHoleDevice() {
  if (!isMac) return false;
  try {
    const { stdout } = await run('system_profiler SPAudioDataType -json');
    const json = JSON.parse(stdout);
    const devices = (json.SPAudioDataType || []).flatMap(d => d._items || []);
    return devices.some(d => (d._name || '').includes(BLACKHOLE_DEVICE_NAME));
  } catch (e) {
    return false;
  }
}

async function installVirtualDriverViaPkg(parentWindow) {
  if (!isMac) throw new Error('System audio capture is supported on macOS only.');
  const pkgPath = BLACKHOLE_PKG_PATH;
  // Confirm presence of bundled installer
  try {
    const fs = require('fs');
    if (!fs.existsSync(pkgPath)) {
      throw new Error(`Bundled driver not found at ${pkgPath}`);
    }
  } catch (e) {
    throw e;
  }

  const { response } = await dialog.showMessageBox(parentWindow, {
    type: 'info',
    buttons: ['Continue', 'Cancel'],
    cancelId: 1,
    defaultId: 0,
    title: 'Enable Meeting Audio',
    message: 'Install virtual audio driver to capture system audio',
    detail: 'Treeto uses a signed virtual audio device to capture other participants (system audio). macOS requires an installer and your explicit approval. This is a one-time setup.',
  });
  if (response !== 0) throw new Error('User cancelled driver installation');

  // Launch macOS installer (will prompt for admin password if needed)
  const cmd = `/usr/sbin/installer -pkg "${pkgPath}" -target /`;
  try {
    await run(cmd);
  } catch (e) {
    // Show stderr to user for transparency
    await dialog.showErrorBox('Installation Failed', `${e.message}\n\n${e.stderr || ''}`);
    throw e;
  }

  // Open Security & Privacy so user can approve the driver if macOS requires it
  try {
    // Legacy pane deep-link (Monterey and earlier)
    await run('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"');
  } catch {}
  try {
    // Ventura and later System Settings app
    await run('open -b com.apple.systempreferences');
  } catch {}

  // Prompt for restart of the app
  await dialog.showMessageBox(parentWindow, {
    type: 'info',
    buttons: ['Quit Now'],
    defaultId: 0,
    title: 'Restart Required',
    message: 'Please restart Treeto to finish setup',
    detail: 'The virtual device is installed. After granting permissions in System Settings, quit and reopen Treeto to complete setup.'
  });
  app.quit();
}

// Best-effort: Open Audio MIDI Setup for manual aggregate/multi-output creation.
// Full automation via AppleScript UI scripting is fragile and requires Accessibility permissions.
async function openAudioMidiSetup() {
  try {
    await run('open -a "Audio MIDI Setup"');
  } catch {}
}

ipcMain.handle('system-audio:getStatus', async () => {
  const installed = await isVirtualDeviceInstalled();
  const inputs = await listInputDevices();
  return {
    platform: process.platform,
    isMac,
    installed,
    inputs,
    pkgPath: BLACKHOLE_PKG_RELATIVE,
  };
});

ipcMain.handle('system-audio:verifySetup', async () => {
  if (!isMac) {
    return {
      driverInstalled: false,
      micPermissionGranted: false,
      systemAudioDevicePresent: false,
      aggregateInputPresent: false,
      allChecksPass: false,
    };
  }

  const driverInstalled = await isVirtualDeviceInstalled();
  const micPermission = getMicPermissionStatus();
  const micPermissionGranted = micPermission === 'granted';
  const systemAudioDevicePresent = await hasBlackHoleDevice();
  const aggregateInputPresent = await hasAggregateWithBlackHole();
  const allChecksPass = driverInstalled && micPermissionGranted && systemAudioDevicePresent && aggregateInputPresent;

  return {
    driverInstalled,
    micPermissionGranted,
    systemAudioDevicePresent,
    aggregateInputPresent,
    allChecksPass,
  };
});

ipcMain.handle('system-audio:install', async () => {
  if (!mainWindow) throw new Error('No window');
  return installVirtualDriverViaPkg(mainWindow);
});

ipcMain.handle('system-audio:openPrefs', async (_e, which) => {
  // which can be 'microphone' | 'screen' | 'accessibility'
  const map = {
    microphone: 'open "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"',
    screen: 'open "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"',
    accessibility: 'open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"',
  };
  if (isMac && map[which]) {
    try { await run(map[which]); } catch {}
    try { await run('open -b com.apple.systempreferences'); } catch {}
  }
  return true;
});

ipcMain.handle('system-audio:openAudioMidiSetup', async () => {
  await openAudioMidiSetup();
  return true;
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});