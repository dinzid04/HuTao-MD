module.exports = {
    name: 'resetlist',
    category: 'store',
    commands: ['resetlist'],

    async execute(ctx) {
        const { m, isCreator, Reply, loadListSettings, saveListSettings, fs } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);

        const settings = loadListSettings();

        if (settings[m.chat]) {
            if (settings[m.chat].media && fs.existsSync(settings[m.chat].media)) {
                try {
                    fs.unlinkSync(settings[m.chat].media);
                } catch (e) {}
            }
            delete settings[m.chat];
            saveListSettings(settings);
        }

        Reply(`\`⌜ List Settings ⌟\`\n> ◦ Status : *Berhasil*\n> ◦ Info : *Template list berhasil di-reset ke default*`);
        return true;
    }
};
