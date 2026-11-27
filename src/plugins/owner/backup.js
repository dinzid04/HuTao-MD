module.exports = {
    name: 'backup',
    category: 'owner',
    commands: ['backup'],

    async execute(ctx) {
        const { Dinz, m, args, text, quoted, isCreator, Reply, example, fs, path, exec } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const val = (args[0] || 'on').toLowerCase();
        if (val === 'off') {
            Reply(`\`⌜ Backup ⌟\`\n> ◦ Status : *Backup Dinonaktifkan*`);
            return true;
        }
        if (val !== 'on' && val !== 'now' && val !== 'sc') {
            return Reply(example("on / off (atau langsung ketik backup)"));
        }

        Reply(global.mess.wait);
        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

        const botCleanName = (global.botname || 'HuTao_MD').replace(/[^a-zA-Z0-9]/g, '_');
        const backupName = `Backup_${botCleanName}_${Date.now()}.zip`;
        const backupPath = path.join(process.cwd(), backupName);
        const zipExcludes = [
            'node_modules/*', '*/node_modules/*',
            '.git/*', '.npm/*', '.cache/*', '.config/*', '.local/*',
            '.env', '.env.*',
            'session/*', 'jadibot-session/*', 'bin/*', 'tmp/*',
            'data/jadibot-media/*', 'data/media-list/*', 'data/caller-session.db*', 'data/cookies.txt',
            '*.zip', '*.tar.gz', '*.bak', '*.log'
        ].map((p) => `"${p}"`).join(' ');
        const zipCmd = `zip -r -9 "${backupPath}" . -x ${zipExcludes}`;

        exec(zipCmd, { cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }, async (err, stdout, stderr) => {
            if (err || !fs.existsSync(backupPath)) {
                return Reply(`❌ Backup gagal: ${err?.message || stderr}`);
            }
            try {
                const buf = fs.readFileSync(backupPath);
                const sizeMb = (buf.length / (1024 * 1024)).toFixed(2);
                await Dinz.sendMessage(m.chat, {
                    document: buf,
                    mimetype: 'application/zip',
                    fileName: backupName,
                    caption: `\`⌜ Backup Selesai ⌟\`\n> ◦ File : *${backupName}*\n> ◦ Ukuran : *${sizeMb} MB*\n> ◦ Exclude : *session, .npm, .cache, node_modules, bin, tmp*\n> ◦ Status : *Berhasil*`
                }, { quoted: m });
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            } catch (e) {
                Reply(`❌ Gagal mengirim file backup: ${e.message}`);
            } finally {
                if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
            }
        });
        return true;
    }
};
