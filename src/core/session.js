const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

function cleaningSession(sessionDir = './session', label = 'Main') {
    if (!fs.existsSync(sessionDir)) return 0;

    let count = 0;
    try {
        const files = fs.readdirSync(sessionDir);
        const now = Date.now();
        const appStateMaxAgeMs = 2 * 60 * 60 * 1000;
        const senderKeyMaxAgeMs = 24 * 60 * 60 * 1000;

        for (const file of files) {
            if (file === 'creds.json' || file.toLowerCase().includes('creds')) continue;
            const filePath = path.join(sessionDir, file);
            try {
                const stats = fs.statSync(filePath);
                if (!stats.isFile()) continue;
                const age = now - stats.mtimeMs;
                const isOldAppState = file.startsWith('app-state-sync-') && age > appStateMaxAgeMs;
                const isOldSenderMem = file.startsWith('sender-key-memory-') && age > senderKeyMaxAgeMs;
                const isTempJunk = (file.endsWith('.tmp') || file.endsWith('.bak')) && age > 30 * 60 * 1000;
                if (isOldAppState || isOldSenderMem || isTempJunk) {
                    fs.unlinkSync(filePath);
                    count++;
                }
            } catch (_) {}
        }

        if (count > 0) {
            console.log(chalk.cyan.bold(`[Auto Cleaner:${label}] Berhasil membersihkan ${count} file sampah sesi (creds.json tetap aman).`));
        }
    } catch (_) {}
    return count;
}

function cleaningAllJadibotSessions(jadibotRoot = './jadibot-session') {
    if (!fs.existsSync(jadibotRoot)) return 0;
    let totalCleaned = 0;
    try {
        const entries = fs.readdirSync(jadibotRoot, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const subDir = path.join(jadibotRoot, entry.name);
            totalCleaned += cleaningSession(subDir, `Cloner:${entry.name}`);
        }
    } catch (_) {}
    return totalCleaned;
}

function cleanTempFiles() {
    const tempDirs = [path.join(process.cwd(), 'tmp')];
    const now = Date.now();
    const maxAgeMs = 30 * 60 * 1000;

    tempDirs.forEach((dir) => {
        if (!fs.existsSync(dir)) return;
        fs.readdir(dir, (err, files) => {
            if (err || !files) return;
            files.forEach((file) => {
                const filePath = path.join(dir, file);
                try {
                    const stats = fs.statSync(filePath);
                    if (now - stats.mtimeMs > maxAgeMs) {
                        fs.unlinkSync(filePath);
                    }
                } catch (_) {}
            });
        });
    });
}

module.exports = { cleaningSession, cleaningAllJadibotSessions, cleanTempFiles };
