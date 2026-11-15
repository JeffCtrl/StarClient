const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const axios = require('axios');
const { execFile, execSync } = require('child_process');
const { Client } = require('minecraft-launcher-core');
const Zip = require('adm-zip');

const launcher = new Client();
let mainWindow;
let activeGameProcess = null;
let gameLaunchInProgress = false;
let gameLaunchCancelled = false;

const storePath = path.join(app.getPath('userData'), 'starclient-store.json');
let storeData = { profiles: [], settings: {}, installedMods: {} };
try {
    if (fs.existsSync(storePath)) {
        const loaded = JSON.parse(fs.readFileSync(storePath, 'utf8'));
        storeData = { ...storeData, ...loaded };
    }
} catch (e) {
    storeData = { profiles: [], settings: {}, installedMods: {} };
}

function saveStore() {
    const temporaryStorePath = `${storePath}.tmp`;
    try {
        fs.writeFileSync(temporaryStorePath, JSON.stringify(storeData, null, 2));
        fs.renameSync(temporaryStorePath, storePath);
    } catch (e) {
        try {
            if (fs.existsSync(temporaryStorePath)) fs.unlinkSync(temporaryStorePath);
        } catch (cleanupError) {
            console.error('[Store] Failed to clean temporary state file:', cleanupError);
        }
        console.error('[Store] Failed to save state:', e);
        throw e;
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        resizable: false,
        maximizable: false,
        minWidth: 1280,
        maxWidth: 1280,
        minHeight: 720,
        maxHeight: 720,
        frame: false,
        backgroundColor: '#06090f',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    mainWindow.setResizable(false);
    mainWindow.setMaximizable(false);

    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('minimize-window', () => mainWindow?.minimize());
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.on('close-window', () => mainWindow?.close());

ipcMain.handle('get-store-data', (_, key) => storeData[key]);
ipcMain.handle('set-store-data', (_, key, value) => {
    storeData[key] = value;
    saveStore();
    return { success: true };
});

ipcMain.handle('get-profiles', () => storeData.profiles || []);
ipcMain.handle('save-profile', (_, profile) => {
    if (!storeData.profiles) storeData.profiles = [];
    const index = storeData.profiles.findIndex(p => p.id === profile.id || p.title === profile.title);
    if (index >= 0) storeData.profiles[index] = profile;
    else storeData.profiles.push(profile);
    saveStore();
    return { success: true, profiles: storeData.profiles };
});
ipcMain.handle('delete-profile', (_, profileId) => {
    storeData.profiles = (storeData.profiles || []).filter(p => p.id !== profileId);
    saveStore();
    return { success: true, profiles: storeData.profiles };
});

ipcMain.handle('export-instance-backup', async (_, profile) => {
    try {
        const gameRoot = getGameRoot(profile.version, profile.gameDir, profile.isolated ? profile.id : undefined);
        if (!fs.existsSync(gameRoot)) throw new Error('This profile has no installed files to back up.');
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Export StarClient profile backup',
            defaultPath: `${String(profile.title || 'StarClient Profile').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')}.starclient.zip`,
            filters: [{ name: 'StarClient backups', extensions: ['zip'] }]
        });
        if (result.canceled || !result.filePath) return { success: false, error: 'Backup export cancelled.' };
        const zip = new Zip();
        zip.addLocalFolder(gameRoot, 'profile');
        zip.addFile('starclient-profile.json', Buffer.from(JSON.stringify({
            title: profile.title,
            version: profile.version,
            loader: profile.loader,
            loaderVersion: profile.loaderVersion || null,
            subtitle: profile.subtitle || '',
            description: profile.description || '',
            ram: profile.ram || 4,
            maxFps: profile.maxFps || 60
        }, null, 2)));
        zip.writeZip(result.filePath);
        return { success: true, path: result.filePath };
    } catch (err) {
        console.error('[BackupExport Error]', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('import-instance-backup', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Import StarClient profile backup',
            filters: [{ name: 'StarClient backups', extensions: ['zip'] }],
            properties: ['openFile']
        });
        if (result.canceled || !result.filePaths[0]) return { success: false, error: 'Backup import cancelled.' };
        const zip = new Zip(result.filePaths[0]);
        const metadataEntry = zip.getEntry('starclient-profile.json');
        if (!metadataEntry) throw new Error('This ZIP is not a StarClient profile backup.');
        const metadata = JSON.parse(metadataEntry.getData().toString('utf8'));
        if (typeof metadata.version !== 'string' || typeof metadata.title !== 'string') {
            throw new Error('The profile backup metadata is invalid.');
        }
        const profileId = `imported-${crypto.randomUUID()}`;
        const profileRoot = getGameRoot(metadata.version, '', profileId);
        const entries = zip.getEntries();
        for (const entry of entries) {
            if (!entry.entryName.startsWith('profile/')) continue;
            const relativePath = entry.entryName.slice('profile/'.length);
            if (!relativePath) continue;
            const target = getSafePath(profileRoot, relativePath);
            if (entry.isDirectory) fs.mkdirSync(target, { recursive: true });
            else {
                fs.mkdirSync(path.dirname(target), { recursive: true });
                fs.writeFileSync(target, entry.getData());
            }
        }
        const instance = {
            ...metadata,
            id: profileId,
            isolated: true,
            loader: metadata.loader || 'Fabric',
            image: '',
            autoMods: [],
            lastPlayed: 'Just now'
        };
        return { success: true, instance };
    } catch (err) {
        console.error('[BackupImport Error]', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('stop-game', async () => {
    if (!gameLaunchInProgress && !activeGameProcess) return { success: false };
    gameLaunchCancelled = true;
    const processToStop = activeGameProcess;
    if (processToStop) {
        let stopError = null;
        if (process.platform === 'win32' && processToStop.pid) {
            stopError = await new Promise((resolve) => {
                execFile('taskkill', ['/PID', String(processToStop.pid), '/T', '/F'], (error) => resolve(error || null));
            });
        } else {
            try {
                processToStop.kill('SIGTERM');
            } catch (error) {
                stopError = error;
            }
        }

        if (stopError && processToStop.exitCode === null && processToStop.signalCode === null) {
            try {
                processToStop.kill();
            } catch (error) {
                stopError = error;
            }
        }

        if (processToStop.exitCode === null && processToStop.signalCode === null) {
            await new Promise((resolve) => {
                const done = () => {
                    clearTimeout(timeout);
                    resolve();
                };
                const timeout = setTimeout(done, 5000);
                processToStop.once('close', done);
            });
        }

        if (processToStop.exitCode === null && processToStop.signalCode === null) {
            console.error('[Stop Error] Minecraft process did not exit:', stopError);
            return { success: false, error: 'Minecraft did not exit after the stop request.' };
        }
    } else {
        mainWindow?.webContents.send('game-stopped');
    }

    return { success: true };
});

ipcMain.handle('scan-java-versions', async () => {
    const javaRuntimes = [];
    const checkedPaths = new Set();
    const commonDirs = [
        'C:\\Program Files\\Java',
        'C:\\Program Files\\Eclipse Adoptium',
        'C:\\Program Files\\Microsoft',
        'C:\\Program Files\\Temurin',
        path.join(app.getPath('home'), '.jdks')
    ];

    for (const baseDir of commonDirs) {
        try {
            if (fs.existsSync(baseDir)) {
                for (const sub of fs.readdirSync(baseDir)) {
                    const javaPath = path.join(baseDir, sub, 'bin', 'java.exe');
                    if (fs.existsSync(javaPath) && !checkedPaths.has(javaPath)) {
                        try {
                            const out = execSync(`"${javaPath}" -version 2>&1`, { encoding: 'utf8' });
                            let versionStr = out.includes('version "') ? out.split('version "')[1].split('"')[0] : 'Unknown';
                            let major = versionStr.startsWith('1.') ? parseInt(versionStr.split('.')[1], 10) : parseInt(versionStr.split('.')[0], 10);
                            javaRuntimes.push({ name: `${sub} (${versionStr})`, path: javaPath, majorVersion: major });
                            checkedPaths.add(javaPath);
                        } catch (err) {}
                    }
                }
            }
        } catch (err) {}
    }

    try {
        const out = execSync('java -version 2>&1', { encoding: 'utf8' });
        let versionStr = out.includes('version "') ? out.split('version "')[1].split('"')[0] : 'Unknown';
        let major = versionStr.startsWith('1.') ? parseInt(versionStr.split('.')[1], 10) : parseInt(versionStr.split('.')[0], 10);
        if (!checkedPaths.has('java')) {
            javaRuntimes.push({ name: `System Default (${versionStr})`, path: 'java', majorVersion: major });
        }
    } catch (e) {}

    return javaRuntimes;
});

async function downloadFile(fileUrl, outputPath) {
    const response = await axios({ url: fileUrl, method: 'GET', responseType: 'stream' });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const writer = fs.createWriteStream(outputPath);
    return new Promise((resolve, reject) => {
        const fail = (error) => {
            writer.destroy();
            reject(error);
        };
        response.data.on('error', fail);
        writer.on('finish', resolve);
        writer.on('error', fail);
        response.data.pipe(writer);
    });
}

function getGameRoot(version, gameDir, profileId) {
    if (typeof version !== 'string' || !version.trim()) {
        throw new Error('A Minecraft version is required to install content.');
    }
    const expandedGameDir = typeof gameDir === 'string'
        ? gameDir.trim().replace(/%([^%]+)%/g, (match, variable) => process.env[variable] || match)
        : '';
    const rootBase = expandedGameDir
        ? path.resolve(expandedGameDir)
        : path.join(app.getPath('userData'), 'minecraft');
    if (profileId) {
        const safeProfileId = String(profileId).replace(/[^a-zA-Z0-9._-]/g, '_');
        if (!safeProfileId || safeProfileId === '.' || safeProfileId === '..') throw new Error('Invalid profile identifier.');
        return path.join(rootBase, 'starclient-profiles', safeProfileId);
    }
    return expandedGameDir ? path.join(rootBase, 'instances', version) : path.join(rootBase, 'instances', version);
}

function getSafePath(root, relativePath) {
    const resolvedRoot = path.resolve(root);
    const targetPath = path.resolve(resolvedRoot, relativePath.replace(/[\\/]/g, path.sep));
    if (targetPath !== resolvedRoot && !targetPath.startsWith(`${resolvedRoot}${path.sep}`)) {
        throw new Error(`Archive contains an unsafe path: ${relativePath}`);
    }
    return targetPath;
}

function extractArchive(zip, destination, entryPrefix = '', overwrite = true) {
    const root = path.resolve(destination);
    for (const entry of zip.getEntries()) {
        if (entryPrefix && !entry.entryName.startsWith(entryPrefix)) continue;
        const relativePath = entryPrefix ? entry.entryName.slice(entryPrefix.length) : entry.entryName;
        if (!relativePath) continue;
        const targetPath = getSafePath(root, relativePath);
        if (entry.isDirectory) {
            fs.mkdirSync(targetPath, { recursive: true });
        } else {
            if (!overwrite && fs.existsSync(targetPath)) {
                throw new Error(`The archive would overwrite an existing file: ${relativePath}`);
            }
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            fs.writeFileSync(targetPath, entry.getData());
        }
    }
}

function setResourcePackEnabled(gameRoot, fileName, enabled) {
    const optionsPath = path.join(gameRoot, 'options.txt');
    const lines = fs.existsSync(optionsPath) ? fs.readFileSync(optionsPath, 'utf8').split(/\r?\n/) : [];
    const optionIndex = lines.findIndex((line) => line.startsWith('resourcePacks:'));
    const resourcePacks = optionIndex >= 0
        ? JSON.parse(lines[optionIndex].slice('resourcePacks:'.length))
        : ['vanilla'];
    const packId = `file/${fileName}`;
    if (enabled && !resourcePacks.includes(packId)) resourcePacks.push(packId);
    if (!enabled) {
        const index = resourcePacks.indexOf(packId);
        if (index >= 0) resourcePacks.splice(index, 1);
    }
    const updatedLine = `resourcePacks:${JSON.stringify(resourcePacks)}`;
    if (optionIndex >= 0) lines[optionIndex] = updatedLine;
    else lines.push(updatedLine);
    fs.writeFileSync(optionsPath, lines.join('\n'));
}

async function getModrinthVersion(projectId, gameVersion, category, loader) {
    const params = { game_versions: JSON.stringify([gameVersion]) };
    if (category === 'mods' || category === 'modpacks') {
        params.loaders = JSON.stringify([String(loader || 'Fabric').toLowerCase()]);
    }
    const response = await axios.get(`https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}/version`, { params });
    const version = response.data.find((item) => Array.isArray(item.files) && item.files.length > 0);
    if (!version) {
        throw new Error(`No ${category} version is available for Minecraft ${gameVersion}${category === 'mods' ? ` with ${loader}` : ''}.`);
    }
    const file = version.files.find((item) => item.primary) || version.files[0];
    if (!file.url || !file.filename) throw new Error('The selected Modrinth version has no downloadable file.');
    return { version, file };
}

async function saveModrinthFile(file, destination) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (fs.existsSync(destination)) {
        if (!file.hashes?.sha1) return;
        const existingHash = crypto.createHash('sha1').update(fs.readFileSync(destination)).digest('hex');
        if (existingHash === file.hashes.sha1) return;
        fs.unlinkSync(destination);
    }
    const tempPath = `${destination}.download`;
    try {
        await downloadFile(file.url, tempPath);
        if (file.hashes?.sha1) {
            const actualHash = crypto.createHash('sha1').update(fs.readFileSync(tempPath)).digest('hex');
            if (actualHash !== file.hashes.sha1) throw new Error(`Downloaded file failed its integrity check: ${file.filename}`);
        }
        fs.renameSync(tempPath, destination);
    } finally {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
}

async function installModWithDependencies(modVersion, modFile, gameRoot, gameVersion, loader, installed = new Map()) {
    const modsDir = path.join(gameRoot, 'mods');
    const fileName = path.basename(modFile.filename);
    if (modVersion.project_id && installed.has(modVersion.project_id)) return;
    const filePath = path.join(modsDir, fileName);
    await saveModrinthFile(modFile, filePath);
    if (modVersion.project_id) {
        installed.set(modVersion.project_id, {
            projectId: modVersion.project_id,
            name: modVersion.name || fileName,
            fileName,
            path: filePath
        });
    }
    for (const dependency of modVersion.dependencies || []) {
        if (dependency.type !== 'required') continue;
        if (dependency.project_id) {
            if (installed.has(dependency.project_id)) continue;
            const required = await getModrinthVersion(dependency.project_id, gameVersion, 'mods', loader);
            await installModWithDependencies(required.version, required.file, gameRoot, gameVersion, loader, installed);
        } else if (dependency.version_id) {
            const response = await axios.get(`https://api.modrinth.com/v2/version/${encodeURIComponent(dependency.version_id)}`);
            const requiredVersion = response.data;
            const requiredFile = requiredVersion.files?.find((item) => item.primary) || requiredVersion.files?.[0];
            if (!requiredFile) throw new Error(`A required mod dependency has no download: ${dependency.version_id}`);
            await installModWithDependencies(requiredVersion, requiredFile, gameRoot, gameVersion, loader, installed);
        }
    }
}

async function installModrinthContent(data) {
    const { projectId, name, version, loader, category = 'mods', gameDir } = data;
    const gameRoot = getGameRoot(version, gameDir, data.profileId);
    const contentFolders = {
        mods: 'mods',
        resourcepacks: 'resourcepacks',
        shaders: 'shaderpacks',
        worlds: 'saves'
    };
    if (!contentFolders[category] && category !== 'datapacks') {
        throw new Error(`Unsupported content category: ${category}`);
    }
    if (category === 'mods' && String(loader || 'Fabric').toLowerCase() !== 'fabric') {
        throw new Error('This launcher currently runs Fabric instances. Select Fabric to install mods that will load.');
    }

    const { version: modrinthVersion, file } = await getModrinthVersion(projectId, version, category, loader);
    if (category === 'mods') {
        const installed = new Map();
        await installModWithDependencies(modrinthVersion, file, gameRoot, version, loader, installed);
        const destPath = path.join(gameRoot, 'mods', path.basename(file.filename));
        return { success: true, path: destPath, fileName: path.basename(file.filename), version, files: [...installed.values()] };
    }
    let destinationFolder;
    if (category === 'datapacks') {
        const savesDir = path.join(gameRoot, 'saves');
        fs.mkdirSync(savesDir, { recursive: true });
        const selection = await dialog.showOpenDialog(mainWindow, {
            title: 'Choose the Minecraft world for this data pack',
            defaultPath: savesDir,
            properties: ['openDirectory']
        });
        if (selection.canceled || !selection.filePaths[0]) {
            throw new Error('Data pack installation was cancelled.');
        }
        const worldDir = path.resolve(selection.filePaths[0]);
        const resolvedSaves = path.resolve(savesDir);
        if (!worldDir.startsWith(`${resolvedSaves}${path.sep}`) || !fs.existsSync(path.join(worldDir, 'level.dat'))) {
            throw new Error('Choose a Minecraft world folder inside this profile\'s saves folder.');
        }
        destinationFolder = path.join(worldDir, 'datapacks');
    } else {
        destinationFolder = path.join(gameRoot, contentFolders[category]);
    }
    fs.mkdirSync(destinationFolder, { recursive: true });

    if (category === 'shaders') {
        const iris = await getModrinthVersion('YL57xq9U', version, 'mods', 'Fabric');
        await installModWithDependencies(iris.version, iris.file, gameRoot, version, 'Fabric');
    }

    const fileName = path.basename(file.filename);
    const destPath = path.join(destinationFolder, fileName);
    if (category === 'worlds') {
        const tempPath = path.join(os.tmpdir(), `starclient-world-${crypto.randomUUID()}.zip`);
        try {
            await saveModrinthFile(file, tempPath);
            const zip = new Zip(tempPath);
            const entries = zip.getEntries();
            const normalizedLevelPath = (entryName) => entryName.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '');
            const levelEntry = entries.find((entry) => !entry.isDirectory && /(^|\/)level\.dat$/i.test(normalizedLevelPath(entry.entryName)));
            if (!levelEntry) {
                throw new Error('The downloaded archive is not a valid Minecraft world (level.dat is missing).');
            }
            const hasRootLevel = entries.some((entry) => !entry.isDirectory && /^level\.dat$/i.test(normalizedLevelPath(entry.entryName)));
            const worldFolder = path.join(destinationFolder, name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'Downloaded World');
            const worldPath = hasRootLevel
                ? worldFolder
                : getSafePath(destinationFolder, path.dirname(normalizedLevelPath(levelEntry.entryName)));
            const extractTo = hasRootLevel ? worldFolder : destinationFolder;
            if (worldPath === path.resolve(destinationFolder) || fs.existsSync(worldPath)) {
                throw new Error(`A world folder named "${path.basename(worldPath)}" already exists.`);
            }
            extractArchive(zip, extractTo, '', false);
            return { success: true, path: worldPath, fileName, version };
        } finally {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
    }

    if (category === 'resourcepacks') setResourcePackEnabled(gameRoot, fileName, true);
    return { success: true, path: destPath, fileName, version, files: [{ projectId, name, fileName, path: destPath }] };
}

async function installPerformanceMods(gameRoot, version, report = () => {}) {
    const modsDir = path.join(gameRoot, 'mods');
    fs.mkdirSync(modsDir, { recursive: true });
    const coreMods = [
        { id: 'P7dR8mSH', name: 'Fabric API' },
        { id: 'AANobbMI', name: 'Sodium' },
        { id: 'gvQqBUqZ', name: 'Lithium' }
    ];
    const installedMods = new Map();
    for (const mod of coreMods) {
        const { version: modVersion, file } = await getModrinthVersion(mod.id, version, 'mods', 'Fabric');
        const destPath = path.join(modsDir, path.basename(file.filename));
        const disabledPath = `${destPath}.disabled`;
        if (!fs.existsSync(disabledPath)) {
            if (!fs.existsSync(destPath)) report(`Downloading ${mod.name} for Minecraft ${version}...`);
            await installModWithDependencies(modVersion, file, gameRoot, version, 'Fabric', installedMods);
        }
        if (!installedMods.has(mod.id)) installedMods.set(mod.id, {
            projectId: mod.id,
            name: mod.name,
            fileName: path.basename(file.filename),
            path: fs.existsSync(disabledPath) ? disabledPath : destPath,
            enabled: !fs.existsSync(disabledPath)
        });
    }
    return [...installedMods.values()];
}

ipcMain.handle('install-mod', async (_, modData) => {
    try {
        return await installModrinthContent(modData);
    } catch (err) {
        console.error('[ContentInstall Error]', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('delete-mod', async (_, data) => {
    try {
        const { version, filename } = data;
        const modsDir = path.join(app.getPath('userData'), 'minecraft', 'instances', version || '1.21.11', 'mods');
        const targetPath = path.join(modsDir, filename);
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
        }
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('install-instance', async (_, data) => {
    try {
        if (String(data.loader || 'Fabric').toLowerCase() !== 'fabric') {
            throw new Error('Instance installation currently supports Fabric only.');
        }
        const instanceDir = getGameRoot(data.version, data.gameDir, data.profileId);
        const mods = await installPerformanceMods(instanceDir, data.version);

        if (!storeData.profiles) storeData.profiles = [];
        if (!storeData.profiles.some(p => p.title === data.title)) {
            storeData.profiles.push(data);
            saveStore();
        }

        return { success: true, mods };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('toggle-content', async (_, data) => {
    try {
        const gameRoot = getGameRoot(data.version, data.gameDir, data.profileId);
        const targetPath = path.resolve(data.path);
        if (!targetPath.startsWith(`${path.resolve(gameRoot)}${path.sep}`)) {
            throw new Error('The selected item is outside this Minecraft profile.');
        }
        const isDisabled = targetPath.endsWith('.disabled');
        if (Boolean(data.enabled) === !isDisabled) return { success: true, path: targetPath };
        const nextPath = data.enabled ? targetPath.slice(0, -'.disabled'.length) : `${targetPath}.disabled`;
        if (fs.existsSync(nextPath)) throw new Error('A file with the requested enabled state already exists.');
        fs.renameSync(targetPath, nextPath);
        if (data.category === 'resourcepacks') {
            setResourcePackEnabled(gameRoot, path.basename(data.enabled ? nextPath : targetPath).replace(/\.disabled$/, ''), Boolean(data.enabled));
        }
        return { success: true, path: nextPath };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('remove-content', async (_, data) => {
    try {
        const gameRoot = getGameRoot(data.version, data.gameDir, data.profileId);
        const root = path.resolve(gameRoot);
        const targetPath = path.resolve(data.path);
        if (!targetPath.startsWith(`${root}${path.sep}`)) {
            throw new Error('The selected item is outside this Minecraft profile.');
        }
        const stat = fs.lstatSync(targetPath);
        if (!stat.isFile()) throw new Error('Only individual content files can be removed here.');
        const realParent = fs.realpathSync(path.dirname(targetPath));
        if (!realParent.startsWith(`${fs.realpathSync(root)}${path.sep}`)) {
            throw new Error('The selected item resolves outside this Minecraft profile.');
        }
        fs.unlinkSync(targetPath);
        if (data.category === 'resourcepacks') {
            setResourcePackEnabled(gameRoot, path.basename(targetPath).replace(/\.disabled$/, ''), false);
        }
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('install-modpack', async (_, packData) => {
    try {
        const { projectId, name, version, loader, gameDir } = packData;
        if (String(loader || 'Fabric').toLowerCase() !== 'fabric') {
            throw new Error('Modpack installs currently require the Fabric loader.');
        }
        const profileId = packData.profileId;
        const gameRoot = getGameRoot(version, gameDir, profileId);
        fs.mkdirSync(gameRoot, { recursive: true });
        const { file } = await getModrinthVersion(projectId, version, 'modpacks', loader);
        const tempPath = path.join(os.tmpdir(), `starclient-modpack-${crypto.randomUUID()}.mrpack`);
        try {
            await downloadFile(file.url, tempPath);
            const zip = new Zip(tempPath);
            const indexEntry = zip.getEntry('modrinth.index.json');
            if (!indexEntry) throw new Error('The downloaded file is not a valid Modrinth modpack.');
            const manifest = JSON.parse(indexEntry.getData().toString('utf8'));
            if (manifest.dependencies?.minecraft !== version) {
                throw new Error(`This modpack targets Minecraft ${manifest.dependencies?.minecraft || 'an unspecified version'}, not ${version}.`);
            }
            if (!manifest.dependencies?.['fabric-loader']) {
                throw new Error('This modpack does not include a Fabric loader dependency.');
            }

            for (const packFile of manifest.files || []) {
                if (packFile.env?.client === 'unsupported') continue;
                if (!packFile.path || !Array.isArray(packFile.downloads) || !packFile.downloads[0]) {
                    throw new Error('The modpack contains a file without a client download URL.');
                }
                const outputPath = getSafePath(gameRoot, packFile.path);
                await saveModrinthFile({
                    url: packFile.downloads[0],
                    filename: path.basename(packFile.path),
                    hashes: packFile.hashes
                }, outputPath);
            }

            const clientOverrides = zip.getEntry('client-overrides/');
            const overrides = clientOverrides ? 'client-overrides/' : 'overrides/';
            if (zip.getEntries().some((entry) => entry.entryName.startsWith(overrides))) {
                extractArchive(zip, gameRoot, overrides);
            }
            return {
                success: true,
                modsInstalled: (manifest.files || []).filter((item) => item.env?.client !== 'unsupported').length,
                version,
                loader: 'Fabric',
                loaderVersion: manifest.dependencies['fabric-loader']
            };
        } finally {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
    } catch (err) {
        console.error('[ModpackInstall Error]', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('repair-profile', async (_, profile) => {
    try {
        if (String(profile.loader || 'Fabric').toLowerCase() !== 'fabric') {
            throw new Error('Automatic repair currently supports Fabric profiles only.');
        }
        const gameRoot = getGameRoot(profile.version, profile.gameDir, profile.isolated ? profile.id : undefined);
        fs.mkdirSync(gameRoot, { recursive: true });
        const mods = await installPerformanceMods(gameRoot, profile.version);
        const loaderResponse = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${profile.version}`);
        const stableLoader = loaderResponse.data.find((item) => item.loader.stable) || loaderResponse.data[0];
        if (!stableLoader) throw new Error(`No Fabric loader is available for Minecraft ${profile.version}.`);
        const loaderVersion = profile.loaderVersion || stableLoader.loader.version;
        const versionName = `fabric-loader-${loaderVersion}-${profile.version}`;
        const versionDir = path.join(gameRoot, 'versions', versionName);
        const versionJsonPath = path.join(versionDir, `${versionName}.json`);
        const profileResponse = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${profile.version}/${loaderVersion}/profile/json`);
        fs.mkdirSync(versionDir, { recursive: true });
        fs.writeFileSync(versionJsonPath, JSON.stringify(profileResponse.data, null, 2));
        for (const entry of fs.readdirSync(gameRoot, { withFileTypes: true })) {
            if (entry.isFile() && entry.name.endsWith('.download')) {
                fs.unlinkSync(path.join(gameRoot, entry.name));
            }
        }
        return { success: true, mods, repairedVersionJson: versionJsonPath };
    } catch (err) {
        console.error('[ProfileRepair Error]', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('install-java-runtime', async (_, majorVersion) => {
    const supportedMajor = Number(majorVersion);
    if (![8, 17, 21, 25].includes(supportedMajor)) {
        return { success: false, error: `Java ${majorVersion} installation is not supported.` };
    }
    const runtimeRoot = path.join(app.getPath('userData'), 'runtimes', `java-${supportedMajor}`);
    const archivePath = path.join(os.tmpdir(), `starclient-java-${supportedMajor}-${crypto.randomUUID()}.zip`);
    try {
        const binaryUrl = `https://api.adoptium.net/v3/binary/latest/${supportedMajor}/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk`;
        await downloadFile(binaryUrl, archivePath);
        const zip = new Zip(archivePath);
        let javaPath = '';
        for (const entry of zip.getEntries()) {
            const target = getSafePath(runtimeRoot, entry.entryName);
            if (entry.isDirectory) fs.mkdirSync(target, { recursive: true });
            else {
                fs.mkdirSync(path.dirname(target), { recursive: true });
                fs.writeFileSync(target, entry.getData());
                if (/^bin[\\/]java\.exe$/i.test(entry.entryName.replace(/^[^/\\]+[/\\]/, ''))) javaPath = target;
            }
        }
        if (!javaPath || !fs.existsSync(javaPath)) throw new Error('The downloaded Java archive did not contain java.exe.');
        return { success: true, path: javaPath };
    } catch (err) {
        console.error('[JavaInstall Error]', err);
        return { success: false, error: err.message };
    } finally {
        if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
    }
});

ipcMain.handle('get-crash-reports', async (_, profile) => {
    try {
        const gameRoot = getGameRoot(profile.version, profile.gameDir, profile.isolated ? profile.id : undefined);
        const crashDir = path.join(gameRoot, 'crash-reports');
        if (!fs.existsSync(crashDir)) return { success: true, reports: [] };
        const reports = fs.readdirSync(crashDir)
            .filter((name) => name.endsWith('.txt'))
            .map((name) => ({
                name,
                path: path.join(crashDir, name),
                modifiedAt: fs.statSync(path.join(crashDir, name)).mtime.toISOString()
            }))
            .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
        return { success: true, reports };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('open-crash-report', async (_, profile, filename) => {
    try {
        const gameRoot = getGameRoot(profile.version, profile.gameDir, profile.isolated ? profile.id : undefined);
        const crashDir = path.resolve(gameRoot, 'crash-reports');
        if (typeof filename !== 'string' || path.basename(filename) !== filename) throw new Error('Invalid crash report name.');
        const reportPath = path.resolve(crashDir, filename);
        if (!reportPath.startsWith(`${crashDir}${path.sep}`) || !fs.existsSync(reportPath) || !fs.lstatSync(reportPath).isFile()) {
            throw new Error('Crash report not found in this profile.');
        }
        const realCrashDir = fs.realpathSync(crashDir);
        if (!fs.realpathSync(reportPath).startsWith(`${realCrashDir}${path.sep}`)) throw new Error('Crash report path resolves outside this profile.');
        const { shell } = require('electron');
        const openError = await shell.openPath(reportPath);
        if (openError) throw new Error(openError);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('install-dropped-content', async (_, data) => {
    const categoryFolders = {
        mods: 'mods',
        resourcepacks: 'resourcepacks',
        shaders: 'shaderpacks',
        datapacks: 'datapacks',
        worlds: 'saves'
    };
    const categoryExtensions = {
        mods: ['.jar'],
        resourcepacks: ['.zip'],
        shaders: ['.zip'],
        datapacks: ['.zip'],
        worlds: ['.zip'],
        modpacks: ['.mrpack', '.zip']
    };
    const installedItems = [];
    try {
        if (!Array.isArray(data?.files) || data.files.length === 0) throw new Error('No files were dropped.');
        if (!categoryExtensions[data.category]) throw new Error('Select a supported Browse category before dropping files.');
        const profile = data.profile;
        if (!profile || !profile.id || !profile.version) throw new Error('Create or select a Minecraft profile first.');
        const { shell } = require('electron');
        for (let index = 0; index < data.files.length; index += 1) {
            const dropped = data.files[index];
            if (!dropped || typeof dropped.path !== 'string') throw new Error('Could not read one of the dropped file paths.');
            const sourcePath = fs.realpathSync(dropped.path);
            if (!fs.statSync(sourcePath).isFile()) throw new Error(`${path.basename(sourcePath)} is not a file.`);
            const fileName = path.basename(sourcePath);
            const extension = path.extname(fileName).toLowerCase();
            if (!categoryExtensions[data.category].includes(extension)) {
                throw new Error(`${fileName} is not supported in ${data.category}. Expected: ${categoryExtensions[data.category].join(', ')}.`);
            }

            if (data.category === 'modpacks') {
                if (String(profile.loader || 'Fabric').toLowerCase() !== 'fabric') {
                    throw new Error('Modpack imports currently require a Fabric profile.');
                }
                const zip = new Zip(sourcePath);
                const indexEntry = zip.getEntry('modrinth.index.json');
                if (!indexEntry) throw new Error(`${fileName} is not a Modrinth modpack archive.`);
                const manifest = JSON.parse(indexEntry.getData().toString('utf8'));
                const version = manifest.dependencies?.minecraft;
                const loaderVersion = manifest.dependencies?.['fabric-loader'];
                if (typeof version !== 'string' || typeof loaderVersion !== 'string' || !Array.isArray(manifest.files)) {
                    throw new Error(`${fileName} has an invalid or unsupported modpack manifest.`);
                }
                const profileId = data.profileId
                    ? (data.files.length === 1 ? data.profileId : `${data.profileId}-${index + 1}`)
                    : `dropped-pack-${crypto.randomUUID()}`;
                const targetRoot = getGameRoot(version, profile.gameDir, profileId);
                if (fs.existsSync(targetRoot)) throw new Error(`The profile folder for ${fileName} already exists.`);
                const stagingRoot = path.join(path.dirname(targetRoot), `.import-${crypto.randomUUID()}`);
                try {
                    fs.mkdirSync(stagingRoot, { recursive: true });
                    for (const packFile of manifest.files) {
                        if (packFile.env?.client === 'unsupported') continue;
                        if (typeof packFile.path !== 'string' || !Array.isArray(packFile.downloads) || !packFile.downloads.length) {
                            throw new Error(`Modpack file entry is missing its path or download URL: ${packFile.path || 'unknown file'}`);
                        }
                        const downloadUrl = new URL(packFile.downloads[0]);
                        if (downloadUrl.protocol !== 'https:' || !downloadUrl.hostname || downloadUrl.hostname === 'localhost') {
                            throw new Error(`Refusing an unsafe modpack download URL for ${packFile.path}.`);
                        }
                        const outputPath = getSafePath(stagingRoot, packFile.path);
                        await saveModrinthFile({
                            url: downloadUrl.toString(),
                            filename: path.basename(packFile.path),
                            hashes: packFile.hashes
                        }, outputPath);
                    }
                    const hasClientOverrides = zip.getEntries().some((entry) => entry.entryName.startsWith('client-overrides/'));
                    const overridesPrefix = hasClientOverrides ? 'client-overrides/' : 'overrides/';
                    if (zip.getEntries().some((entry) => entry.entryName.startsWith(overridesPrefix))) {
                        extractArchive(zip, stagingRoot, overridesPrefix);
                    }
                    fs.mkdirSync(path.dirname(targetRoot), { recursive: true });
                    fs.renameSync(stagingRoot, targetRoot);
                    const importedProfile = {
                        id: profileId,
                        isolated: true,
                        title: manifest.name || path.basename(fileName, extension),
                        version,
                        loader: 'Fabric',
                        loaderVersion,
                        subtitle: `${manifest.name || fileName} (${version}) • Fabric`,
                        description: manifest.summary || 'Imported from a local Modrinth modpack.',
                        image: '',
                        autoMods: [],
                        ram: profile.ram || 4,
                        maxFps: profile.maxFps || 60,
                        lastPlayed: 'Just now',
                        gameDir: profile.gameDir || ''
                    };
                    installedItems.push({
                        name: importedProfile.title,
                        path: targetRoot,
                        category: 'modpack',
                        profileId,
                        version,
                        profile: importedProfile
                    });
                    continue;
                } catch (error) {
                    fs.rmSync(stagingRoot, { recursive: true, force: true });
                    throw error;
                }
            }

            const isolatedId = profile.isolated ? profile.id : undefined;
            const gameRoot = getGameRoot(profile.version, profile.gameDir, isolatedId);
            let destinationFolder;
            let installedName = fileName;
            let installedPath;

            if (data.category === 'datapacks') {
                const savesDir = path.join(gameRoot, 'saves');
                fs.mkdirSync(savesDir, { recursive: true });
                const selection = await dialog.showOpenDialog(mainWindow, {
                    title: `Choose a world for ${fileName}`,
                    defaultPath: savesDir,
                    properties: ['openDirectory']
                });
                if (selection.canceled || !selection.filePaths[0]) throw new Error(`Import of ${fileName} was cancelled.`);
                const worldDir = path.resolve(selection.filePaths[0]);
                const resolvedSaves = path.resolve(savesDir);
                if (!worldDir.startsWith(`${resolvedSaves}${path.sep}`) || !fs.existsSync(path.join(worldDir, 'level.dat'))) {
                    throw new Error('Choose a Minecraft world folder inside this profile\'s saves folder.');
                }
                destinationFolder = path.join(worldDir, 'datapacks');
            } else {
                destinationFolder = path.join(gameRoot, categoryFolders[data.category]);
            }

            if (data.category === 'mods' && String(profile.loader || 'Fabric').toLowerCase() !== 'fabric') {
                throw new Error('Local mod JAR imports currently require a Fabric profile.');
            }
            if (data.category === 'shaders') {
                const iris = await getModrinthVersion('YL57xq9U', profile.version, 'mods', 'Fabric');
                await installModWithDependencies(iris.version, iris.file, gameRoot, profile.version, 'Fabric');
            }

            if (data.category === 'worlds') {
                const zip = new Zip(sourcePath);
                const entries = zip.getEntries();
                const normalizeEntry = (entryName) => entryName.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '');
                const levelEntry = entries.find((entry) => !entry.isDirectory && /(^|\/)level\.dat$/i.test(normalizeEntry(entry.entryName)));
                if (!levelEntry) throw new Error(`${fileName} is not a valid Minecraft world archive (level.dat missing).`);
                const hasRootLevel = entries.some((entry) => !entry.isDirectory && /^level\.dat$/i.test(normalizeEntry(entry.entryName)));
                const worldName = path.basename(fileName, extension).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'Imported World';
                destinationFolder = path.join(gameRoot, 'saves');
                installedPath = hasRootLevel
                    ? path.join(destinationFolder, worldName)
                    : getSafePath(destinationFolder, path.dirname(normalizeEntry(levelEntry.entryName)));
                if (fs.existsSync(installedPath)) throw new Error(`A world folder named "${path.basename(installedPath)}" already exists.`);
                if (hasRootLevel) {
                    fs.mkdirSync(installedPath, { recursive: true });
                    extractArchive(zip, installedPath);
                } else {
                    extractArchive(zip, destinationFolder);
                }
                installedName = path.basename(installedPath);
            } else {
                fs.mkdirSync(destinationFolder, { recursive: true });
                installedPath = path.join(destinationFolder, fileName);
                if (fs.existsSync(installedPath)) throw new Error(`A file named "${fileName}" is already installed in this profile.`);
                fs.copyFileSync(sourcePath, installedPath);
                if (data.category === 'resourcepacks') setResourcePackEnabled(gameRoot, fileName, true);
            }

            installedItems.push({
                name: installedName,
                path: installedPath,
                category: data.category,
                profileId: isolatedId,
                version: profile.version
            });
        }

        const openedPath = data.category === 'modpacks' || data.category === 'worlds'
            ? installedItems[installedItems.length - 1]?.path
            : path.dirname(installedItems[installedItems.length - 1]?.path || '');
        if (openedPath) {
            const openError = await shell.openPath(openedPath);
            if (openError) console.error('[DroppedContent] Installed successfully, but could not open folder:', openError);
        }
        return { success: true, items: installedItems };
    } catch (err) {
        console.error('[DroppedContent Error]', err);
        return { success: false, items: installedItems, error: err.message };
    }
});

ipcMain.handle('open-content-location', async (_, data) => {
    try {
        const { shell } = require('electron');
        const profile = data?.profile;
        if (!profile?.version) throw new Error('A Minecraft profile is required.');
        const gameRoot = getGameRoot(profile.version, profile.gameDir, profile.isolated ? profile.id : undefined);
        let targetPath = data.path ? path.resolve(data.path) : gameRoot;
        const resolvedRoot = path.resolve(gameRoot);
        if (targetPath !== resolvedRoot && !targetPath.startsWith(`${resolvedRoot}${path.sep}`)) {
            throw new Error('The selected item is outside this Minecraft profile.');
        }
        if (!fs.existsSync(targetPath)) throw new Error('The content folder no longer exists.');
        const realRoot = fs.realpathSync(resolvedRoot);
        const realTarget = fs.realpathSync(targetPath);
        if (realTarget !== realRoot && !realTarget.startsWith(`${realRoot}${path.sep}`)) {
            throw new Error('The selected folder resolves outside this Minecraft profile.');
        }
        const stat = fs.statSync(realTarget);
        if (stat.isFile()) shell.showItemInFolder(realTarget);
        else {
            const openError = await shell.openPath(realTarget);
            if (openError) throw new Error(openError);
        }
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('upload-custom-mod', async (_, profile) => {
    try {
        if (!profile || !profile.version || !profile.id) throw new Error('Select a Minecraft profile before importing a mod.');
        if (String(profile.loader || 'Fabric').toLowerCase() !== 'fabric') {
            throw new Error('Local mod import currently supports Fabric profiles only.');
        }
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Choose a Fabric mod JAR',
            filters: [{ name: 'Minecraft mods', extensions: ['jar'] }],
            properties: ['openFile']
        });
        if (result.canceled || !result.filePaths[0]) return { success: false, error: 'Mod import cancelled.' };
        const source = result.filePaths[0];
        const fileName = path.basename(source);
        const gameRoot = getGameRoot(profile.version, profile.gameDir, profile.isolated ? profile.id : undefined);
        const modsDir = path.join(gameRoot, 'mods');
        fs.mkdirSync(modsDir, { recursive: true });
        const destination = path.join(modsDir, fileName);
        if (fs.existsSync(destination)) throw new Error(`A mod named "${fileName}" is already installed in this profile.`);
        fs.copyFileSync(source, destination);
        return { success: true, fileName, path: destination };
    } catch (err) {
        console.error('[CustomModImport Error]', err);
        return { success: false, error: err.message };
    }
});
ipcMain.handle('check-for-updates', async () => ({ hasUpdate: false }));
ipcMain.handle('open-starclient-folder', async () => {
    try {
        const starClientPath = path.join(app.getPath('appData'), 'StarClient');
        fs.mkdirSync(starClientPath, { recursive: true });
        const openError = await shell.openPath(starClientPath);
        if (openError) throw new Error(openError);
        return { success: true };
    } catch (err) {
        console.error('[StarClient Folder Error]', err);
        return { success: false, error: err.message };
    }
});

// Launch using cached loader metadata when available so installed profiles can start offline.
ipcMain.on('launch-game', async (event, config) => {
    if (gameLaunchInProgress) {
        event.sender.send('console-log', '[FATAL ERROR] A Minecraft launch is already in progress.');
        event.sender.send('game-stopped');
        return;
    }
    gameLaunchInProgress = true;
    gameLaunchCancelled = false;
    const targetVersion = config.version;
    try {
        const instanceDir = getGameRoot(targetVersion, config.gameDir, config.profileId);
        const modsDir = path.join(instanceDir, 'mods');
        fs.mkdirSync(modsDir, { recursive: true });
        if (String(config.loader || 'Fabric').toLowerCase() !== 'fabric') {
            throw new Error('This launcher currently supports Fabric profiles only. Select a Fabric profile to launch mods.');
        }

        try {
            await axios.get('https://api.modrinth.com/v2/tag/loader', { timeout: 1500 });
            if (!gameLaunchCancelled) {
                await installPerformanceMods(instanceDir, targetVersion, (message) => {
                    if (!gameLaunchCancelled) event.sender.send('console-log', `[ModInstaller] ${message}`);
                });
            }
        } catch (err) {
            if (!gameLaunchCancelled) {
                event.sender.send('console-log', `[ModInstaller] Skipped optional performance mod setup: ${err.message}`);
            }
        }
        if (gameLaunchCancelled) {
            gameLaunchInProgress = false;
            return;
        }

        const versionParts = targetVersion.split('.').map((part) => Number.parseInt(part, 10));
        const versionMajor = versionParts[0] || 1;
        const versionMinor = versionParts[1] || 0;
        let requiredMajor = 21;
        if (versionMajor >= 26) requiredMajor = 25;
        else if (versionMajor === 1 && versionMinor <= 16) requiredMajor = 8;
        else if (versionMajor === 1 && versionMinor < 20) requiredMajor = 17;
        else if (versionMajor === 1 && versionMinor === 20 && (versionParts[2] || 0) < 5) requiredMajor = 17;

        event.sender.send('console-log', `[StarClient] Launching Minecraft ${targetVersion} (Requires Java ${requiredMajor})...`);

        let selectedJavaPath = null;
        const commonDirs = [
            'C:\\Program Files\\Java',
            'C:\\Program Files\\Eclipse Adoptium',
            'C:\\Program Files\\Microsoft',
            'C:\\Program Files\\Temurin',
            path.join(app.getPath('home'), '.jdks')
        ];

        if (config.javaPath && config.javaPath !== 'java') {
            try {
                const out = execSync(`"${config.javaPath}" -version 2>&1`, { encoding: 'utf8' });
                let verStr = out.includes('version "') ? out.split('version "')[1].split('"')[0] : '';
                let maj = verStr.startsWith('1.') ? parseInt(verStr.split('.')[1], 10) : parseInt(verStr.split('.')[0], 10);
                if (maj === requiredMajor) selectedJavaPath = config.javaPath;
            } catch (e) {}
        }

        if (!selectedJavaPath) {
            for (const baseDir of commonDirs) {
                try {
                    if (fs.existsSync(baseDir)) {
                        for (const sub of fs.readdirSync(baseDir)) {
                            const javaPath = path.join(baseDir, sub, 'bin', 'java.exe');
                            if (fs.existsSync(javaPath)) {
                                try {
                                    const out = execSync(`"${javaPath}" -version 2>&1`, { encoding: 'utf8' });
                                    let verStr = out.includes('version "') ? out.split('version "')[1].split('"')[0] : '';
                                    let maj = verStr.startsWith('1.') ? parseInt(verStr.split('.')[1], 10) : parseInt(verStr.split('.')[0], 10);
                                    if (maj === requiredMajor) {
                                        selectedJavaPath = javaPath;
                                        break;
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                } catch (e) {}
                if (selectedJavaPath) break;
            }
        }

        if (!selectedJavaPath) {
            try {
                const out = execSync('java -version 2>&1', { encoding: 'utf8' });
                let verStr = out.includes('version "') ? out.split('version "')[1].split('"')[0] : '';
                let maj = verStr.startsWith('1.') ? parseInt(verStr.split('.')[1], 10) : parseInt(verStr.split('.')[0], 10);
                if (maj === requiredMajor) selectedJavaPath = 'java';
            } catch (e) {}
        }

        if (!selectedJavaPath) {
            throw new Error(`Java ${requiredMajor} is not installed!`);
        }

        const versionsDir = path.join(instanceDir, 'versions');
        fs.mkdirSync(versionsDir, { recursive: true });
        let fabricVersion = config.loaderVersion;
        if (!fabricVersion) {
            const cachedVersion = fs.readdirSync(versionsDir).find((name) =>
                name.startsWith('fabric-loader-') &&
                name.endsWith(`-${targetVersion}`) &&
                fs.existsSync(path.join(versionsDir, name, `${name}.json`))
            );
            fabricVersion = cachedVersion?.slice('fabric-loader-'.length, -(`-${targetVersion}`).length);
        }
        if (!fabricVersion) {
            const loaderRes = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${targetVersion}`, { timeout: 5000 });
            const stableLoader = loaderRes.data.find((item) => item.loader.stable) || loaderRes.data[0];
            if (!stableLoader) throw new Error(`No Fabric loader is available for Minecraft ${targetVersion}.`);
            fabricVersion = stableLoader.loader.version;
        }
        if (gameLaunchCancelled) {
            gameLaunchInProgress = false;
            return;
        }
        const customVersionName = `fabric-loader-${fabricVersion}-${targetVersion}`;
        const versionDir = path.join(versionsDir, customVersionName);
        const customVersionJsonPath = path.join(versionDir, `${customVersionName}.json`);
        const customVanillaJsonPath = path.join(versionDir, `${targetVersion}.json`);
        if (!fs.existsSync(customVanillaJsonPath)) {
            const cachedVersionJsonPaths = [
                path.join(instanceDir, 'cache', 'json', `${targetVersion}.json`),
                path.join(instanceDir, 'versions', targetVersion, `${targetVersion}.json`)
            ];
            const cachedVersionJsonPath = cachedVersionJsonPaths.find((filePath) => fs.existsSync(filePath));
            if (cachedVersionJsonPath) {
                fs.mkdirSync(versionDir, { recursive: true });
                fs.copyFileSync(cachedVersionJsonPath, customVanillaJsonPath);
            }
        }

        const opts = {
            authorization: {
                access_token: config.accessToken || "0",
                client_token: config.uuid || "00000000-0000-0000-0000-000000000000",
                uuid: config.uuid || "00000000-0000-0000-0000-000000000000",
                name: config.username || "Player",
                user_type: 'legacy'
            },
            root: instanceDir,
            overrides: { gameDirectory: instanceDir, versionJson: customVanillaJsonPath },
            timeout: 5000,
            version: { number: targetVersion, type: "release", custom: customVersionName },
            loader: { type: "fabric", build: fabricVersion, enable: true },
            memory: { max: `${config.ram || 4}G`, min: '2G' },
            window: { width: 1280, height: 720, fullscreen: config.fullscreen || false },
            javaPath: selectedJavaPath,
            spawnOptions: { windowsHide: true },
            jvm: Array.isArray(config.jvmArgs) ? config.jvmArgs : ['-XX:+UseG1GC', '-XX:+ParallelRefProcEnabled'],
            ...(config.quickPlay ? { quickPlay: config.quickPlay } : {})
        };

        launcher.removeAllListeners();
        launcher.on('data', (e) => {
            if (!gameLaunchCancelled) event.sender.send('console-log', e.toString());
        });
        launcher.on('debug', (message) => {
            if (!gameLaunchCancelled) event.sender.send('console-log', String(message));
        });
        launcher.on('close', (code) => {
            activeGameProcess = null;
            gameLaunchInProgress = false;
            if (gameLaunchCancelled) {
                event.sender.send('game-stopped');
            } else {
                event.sender.send('console-log', `[StarClient] Game closed with code ${code}`);
                event.sender.send('game-closed', code);
            }
        });

        if (!fs.existsSync(customVersionJsonPath)) {
            if (!fs.existsSync(versionDir)) fs.mkdirSync(versionDir, { recursive: true });
            const metaUrl = `https://meta.fabricmc.net/v2/versions/loader/${targetVersion}/${fabricVersion}/profile/json`;
            const profileRes = await axios.get(metaUrl, { timeout: 5000 });
            fs.writeFileSync(customVersionJsonPath, JSON.stringify(profileRes.data, null, 2));
        }

        if (gameLaunchCancelled) {
            gameLaunchInProgress = false;
            return;
        }
        const launchedProcess = await launcher.launch(opts);
        if (!launchedProcess) {
            if (gameLaunchCancelled) {
                gameLaunchInProgress = false;
                return;
            }
            if (gameLaunchInProgress) throw new Error('Minecraft did not start. Check the console for missing files or Java errors.');
            return;
        }
        activeGameProcess = launchedProcess;
        if (gameLaunchCancelled) {
            activeGameProcess.kill();
            activeGameProcess = null;
        }
    } catch (err) {
        activeGameProcess = null;
        gameLaunchInProgress = false;
        if (!gameLaunchCancelled) event.sender.send('console-log', `[FATAL ERROR] ${err.message || err}`);
        event.sender.send('game-stopped');
    }
});