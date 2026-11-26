module.exports = {
    name: 'delreseller',
    category: 'cpanel',
    commands: ['delresellerv1', 'delresellerv2', 'delresellerv3', 'delreseller'],

    async execute(ctx) {
        const { m, command, text, isCreator, Reply, getTargetNumber, CPANEL } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const serverMatch = command.match(/v([1-3])$/i);
        const serverVersion = serverMatch ? ('v' + serverMatch[1]) : 'v1';

        let targetNum = getTargetNumber(m, text);
        if (!targetNum || targetNum.length < 5) {
            return Reply(`*Format:* .${command} @user atau .${command} 628xxx`);
        }

        const ok = CPANEL.removeReseller(serverVersion, targetNum);
        if (!ok) return Reply(`❌ Nomor @${targetNum} tidak ditemukan di daftar Reseller Server ${serverVersion.toUpperCase()}.`, [targetNum + '@s.whatsapp.net']);

        return Reply(`\`⌜ Sukses Hapus Reseller ⌟\`\n> ◦ Server : *${serverVersion.toUpperCase()}*\n> ◦ User : @${targetNum}\n> ◦ Status : *Dihapus dari Reseller*`, [targetNum + '@s.whatsapp.net']);
    }
};
