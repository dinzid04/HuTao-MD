module.exports = {
    name: 'statusptero',
    category: 'cpanel',
    commands: ['statusptero', 'cekptero'],

    async execute(ctx) {
        const { isCreator, Reply, CPANEL } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        let txt = `\`⌜ Status Pterodactyl ⌟\`\n\n`;
        for (const v of CPANEL.VALID_SERVERS) {
            const cfg = CPANEL.getServerConfig(v);
            const isOnline = Boolean(cfg.domain && cfg.apikey);
            const totalResellers = CPANEL.listResellers(v).length;
            txt += `*• SERVER ${v.toUpperCase()}*\n`;
            txt += `> ◦ Status : *${isOnline ? '🟢 Online' : '🔴 Belum Set'}*\n`;
            txt += `> ◦ Reseller : *${totalResellers} Orang*\n\n`;
        }
        txt += `_Gunakan .setpterov1 domain,ptla,egg,loc untuk mengatur server._`;
        return Reply(txt.trim());
    }
};
