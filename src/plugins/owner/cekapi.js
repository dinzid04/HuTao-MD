const mongoStore = require('../../core/mongo');
const scheduler = require('../../core/scheduler');
const { formatCard } = require('../../utils/formatter');

async function probeEndpoint(axios, url) {
    if (!url || !/^https?:\/\//i.test(url)) {
        return { ok: false, label: 'Belum dikonfigurasi', ms: 0 };
    }
    const start = Date.now();
    try {
        const res = await axios.get(url, {
            timeout: 5000,
            validateStatus: () => true,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const ms = Date.now() - start;
        const ok = res.status >= 200 && res.status < 500;
        return { ok, label: `HTTP ${res.status} (${ms} ms)`, ms };
    } catch (err) {
        return { ok: false, label: `Error: ${err.code || err.message} (${Date.now() - start} ms)`, ms: Date.now() - start };
    }
}

async function probeMongo() {
    if (!mongoStore.isConfigured()) {
        return { ok: false, label: 'Mode Lokal (mongoUri kosong)' };
    }
    const start = Date.now();
    try {
        const db = await mongoStore.getDb();
        if (!db) return { ok: false, label: `Gagal terhubung (${Date.now() - start} ms)` };
        await db.command({ ping: 1 }).catch(() => {});
        return { ok: true, label: `Terhubung (${Date.now() - start} ms)` };
    } catch (err) {
        return { ok: false, label: `Error: ${err.message}` };
    }
}

module.exports = {
    name: 'cekapi',
    category: 'owner',
    commands: ['cekapi', 'healthcheck', 'testapi'],

    async execute(ctx) {
        const { Dinz, m, isCreator, isMainOwner, Reply, axios, pluginLoader, botCtx, jadibotMgr } = ctx;

        if (Dinz.isJadibot || !isMainOwner) return Reply('🔒 Fitur ini khusus owner bot utama.');
        if (!isCreator) return Reply(global.mess.owner);

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

        const [mongoRes, apiDinzRes, amApiRes] = await Promise.all([
            probeMongo(),
            probeEndpoint(axios, global.apiDinz),
            probeEndpoint(axios, global.amApiBase)
        ]);

        const mem = process.memoryUsage();
        const plugins = pluginLoader.getLoadedPlugins();
        const cmds = pluginLoader.getValidCommands();
        const disabledCount = Array.isArray(botCtx.getRootDb()?.settings?.disabledCommands)
            ? botCtx.getRootDb().settings.disabledCommands.length
            : 0;
        const backupCfg = scheduler.getAutoBackupConfig();
        const clonerStats = jadibotMgr.getClonerStats();

        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});

        return Reply(formatCard({
            icon: '🩺',
            title: 'HEALTH CHECK API & SISTEM',
            rows: [
                { label: 'MongoDB Cloud', value: `${mongoRes.ok ? '🟢' : '🟡'} ${mongoRes.label}` },
                { label: 'API Dinz', value: `${apiDinzRes.ok ? '🟢' : '🔴'} ${apiDinzRes.label}` },
                { label: 'API AM (Morastore)', value: `${amApiRes.ok ? '🟢' : '🔴'} ${amApiRes.label}` },
                { label: 'Auto-Backup DB', value: backupCfg.enabled ? `🟢 ON (${backupCfg.intervalLabel})` : '⚪ OFF' },
                { label: 'Cloner Aktif', value: `${clonerStats.activeCount} / ${clonerStats.limits.maxCloner || '∞'}` },
                { label: 'Plugin & Command', value: `${plugins.length} fitur | ${cmds.length} cmd (${disabledCount} nonaktif)` },
                { label: 'RAM & Runtime', value: `${(mem.rss / 1024 / 1024).toFixed(1)} MB RSS | Node ${process.version}` }
            ]
        }));
    }
};
