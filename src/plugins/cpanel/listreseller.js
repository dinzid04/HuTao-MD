module.exports = {
    name: 'listreseller',
    category: 'cpanel',
    commands: ['listresellerv1', 'listresellerv2', 'listresellerv3', 'listreseller'],

    async execute(ctx) {
        const { m, command, isCreator, Reply, moment, CPANEL } = ctx;

        const serverMatch = command.match(/v([1-3])$/i);
        const serverVersion = serverMatch ? ('v' + serverMatch[1]) : 'v1';

        if (!CPANEL.hasAccessToServer(m.sender, serverVersion, isCreator)) {
            return Reply(`\`⌜ Access Denied ⌟\`\n> ◦ Info : *Fitur list reseller hanya dapat diakses oleh Reseller / Owner Server ${serverVersion.toUpperCase()}*`);
        }

        const list = CPANEL.listResellers(serverVersion);
        if (list.length === 0) {
            return Reply(`\`⌜ List Reseller ${serverVersion.toUpperCase()} ⌟\`\n> ◦ Status : *Belum ada Reseller terdaftar.*`);
        }

        let txt = `\`⌜ List Reseller ${serverVersion.toUpperCase()} ⌟\`\n> ◦ Total : *${list.length} Reseller*\n\n`;
        const mentions = [];
        const now = Date.now();
        list.forEach((r, i) => {
            const num = typeof r === 'string' ? r : r.number;
            const jid = num + '@s.whatsapp.net';
            mentions.push(jid);
            let expText = 'Permanen';
            if (r.expiredAt) {
                const sisa = Math.ceil((r.expiredAt - now) / 86400000);
                const expStr = moment(r.expiredAt).tz('Asia/Jakarta').format('DD/MM/YYYY');
                expText = sisa > 0 ? `${sisa} Hari (${expStr})` : '⚠️ Expired';
            }
        txt += `*${i + 1}.* @${num}\n> ◦ Expired : *${expText}*\n\n`;
        });
        return Reply(txt.trim(), mentions);
    }
};
