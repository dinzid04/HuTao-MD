const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');

const PLUGIN_PRIORITY = [
    'menu',
    'call',
    'inspector',
    'richgame',
    'obfuscator',
    'store',
    'downloader',
    'search',
    'ai',
    'maker',
    'ephoto',
    'audio',
    'tools',
    'fun',
    'stalk',
    'islami',
    'sticker',
    'primbon',
    'rpg',
    'clan',
    'game',
    'group',
    'group-extra',
    'setup',
    'cloner',
    'owner',
    'broadcast',
    'cpanel',
    'jadibot',
    'am',
    'extras',
    'utility'
];

let loadedPlugins = [];
let commandMap = new Map();
let validCommands = [];
let validCommandsSet = new Set();
let activeWatchers = [];
let reloadTimer = null;

function extractCasesFromSource(sourceCode) {
    const matches = [...String(sourceCode || '').matchAll(/case\s+["'`]([^"'`]+)["'`]\s*:/g)];
    return [...new Set(matches.map((m) => m[1].toLowerCase()))];
}

function getCategoryFromFile(filePath) {
    const rel = path.relative(PLUGINS_DIR, filePath).replace(/\\/g, '/');
    if (rel.includes('/')) {
        return rel.split('/')[0].toLowerCase();
    }
    return path.basename(filePath, '.js').toLowerCase();
}

function walkPluginDir(dir, includeHelpers = false) {
    if (!fs.existsSync(dir)) return [];
    const results = [];
    let entries = [];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
        return [];
    }

    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!includeHelpers && entry.name.startsWith('_')) continue;
            results.push(...walkPluginDir(fullPath, includeHelpers));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            if (!includeHelpers && entry.name.startsWith('_')) continue;
            results.push(fullPath);
        }
    }
    return results;
}

function getPluginFiles() {
    const files = walkPluginDir(PLUGINS_DIR, false);
    return files.sort((a, b) => {
        const catA = getCategoryFromFile(a);
        const catB = getCategoryFromFile(b);
        const idxA = PLUGIN_PRIORITY.indexOf(catA);
        const idxB = PLUGIN_PRIORITY.indexOf(catB);
        if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;
        if (idxA !== -1 && idxB === -1) return -1;
        if (idxA === -1 && idxB !== -1) return 1;
        const relA = path.relative(PLUGINS_DIR, a).replace(/\\/g, '/');
        const relB = path.relative(PLUGINS_DIR, b).replace(/\\/g, '/');
        return relA.localeCompare(relB);
    });
}

function clearHelperCache() {
    const allJs = walkPluginDir(PLUGINS_DIR, true);
    for (const fp of allJs) {
        if (path.basename(fp).startsWith('_')) {
            try {
                delete require.cache[require.resolve(fp)];
            } catch (_) {}
        }
    }
}

function loadAllPlugins(silent = false) {
    clearHelperCache();

    const files = getPluginFiles();
    const nextPlugins = [];
    const nextMap = new Map();
    const nextCmdSet = new Set();
    const categorySet = new Set();
    const loadErrors = [];

    for (const filePath of files) {
        const relName = path.relative(PLUGINS_DIR, filePath).replace(/\\/g, '/');
        const folderCat = getCategoryFromFile(filePath);
        const baseName = path.basename(filePath, '.js');
        try {
            delete require.cache[require.resolve(filePath)];
            const plugin = require(filePath);
            if (!plugin || typeof plugin.execute !== 'function') {
                console.warn(chalk.yellow(`[Plugins] Melewati ${relName}: tidak mengekspor execute(ctx)`));
                continue;
            }

            let detected = [];
            if (Array.isArray(plugin.commands) && plugin.commands.length > 0) {
                detected = [...new Set(plugin.commands.map((c) => String(c).toLowerCase()).filter(Boolean))];
            } else {
                const rawSource = fs.readFileSync(filePath, 'utf8');
                detected = extractCasesFromSource(rawSource);
            }

            const entry = {
                name: plugin.name || baseName,
                category: plugin.category || folderCat,
                folder: folderCat,
                fileName: relName,
                filePath,
                commands: detected,
                execute: plugin.execute
            };

            nextPlugins.push(entry);
            categorySet.add(folderCat);
            for (const cmd of detected) {
                nextCmdSet.add(cmd);
                if (!nextMap.has(cmd)) nextMap.set(cmd, []);
                nextMap.get(cmd).push(entry);
            }
        } catch (err) {
            loadErrors.push({ file: relName, error: err.message });
            console.error(chalk.red(`[Plugins] Gagal memuat ${relName}:`), err.message);
        }
    }

    loadedPlugins = nextPlugins;
    commandMap = nextMap;
    validCommandsSet = nextCmdSet;
    validCommands = [...nextCmdSet];

    if (!silent) {
        console.log(
            chalk.cyan(`[Plugins] ${loadedPlugins.length} fitur dimuat dari ${categorySet.size} kategori (${validCommands.length} command aktif)`)
        );
    }

    installWatchers(true);
    return { plugins: loadedPlugins, validCommands, categories: [...categorySet].sort(), errors: loadErrors };
}

function collectWatchDirs(dir) {
    if (!fs.existsSync(dir)) return [];
    const dirs = [dir];
    try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                dirs.push(...collectWatchDirs(path.join(dir, entry.name)));
            }
        }
    } catch (_) {}
    return dirs;
}

function scheduleReload(changedLabel) {
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
        reloadTimer = null;
        console.log(chalk.blue('[Plugins] Reload:'), changedLabel);
        loadAllPlugins(true);
    }, 300);
    if (reloadTimer.unref) reloadTimer.unref();
}

const watchedDirSet = new Set();

function installWatchers(scanNew = false) {
    if (activeWatchers.length > 0 && !scanNew) return;

    const dirs = collectWatchDirs(PLUGINS_DIR);
    for (const dir of dirs) {
        if (watchedDirSet.has(dir)) continue;
        try {
            const watcher = fs.watch(dir, (eventType, filename) => {
                if (!filename || !String(filename).endsWith('.js')) return;
                const relDir = path.relative(PLUGINS_DIR, dir).replace(/\\/g, '/');
                const label = relDir ? `${relDir}/${filename}` : String(filename);
                scheduleReload(label);
            });
            if (watcher && typeof watcher.unref === 'function') watcher.unref();
            watcher.on('error', () => {});
            activeWatchers.push(watcher);
            watchedDirSet.add(dir);
        } catch (_) {}
    }
}

async function dispatch(command, ctx) {
    const candidates = commandMap.get(command);
    if (!candidates || candidates.length === 0) return false;

    for (const plugin of candidates) {
        const handled = await plugin.execute(ctx);
        if (handled !== false) {
            return true;
        }
    }
    return false;
}

function getValidCommands() {
    if (loadedPlugins.length === 0) loadAllPlugins(true);
    return validCommands;
}

function getValidCommandsSet() {
    if (loadedPlugins.length === 0) loadAllPlugins(true);
    return validCommandsSet;
}

function getLoadedPlugins() {
    if (loadedPlugins.length === 0) loadAllPlugins(true);
    return loadedPlugins;
}

loadAllPlugins(true);

module.exports = {
    PLUGINS_DIR,
    PLUGIN_PRIORITY,
    getPluginFiles,
    loadAllPlugins,
    dispatch,
    getValidCommands,
    getValidCommandsSet,
    getLoadedPlugins
};
