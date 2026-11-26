module.exports = {
    name: 'dellimit',
    category: 'owner',
    commands: ['dellimit'],

    async execute(ctx) {
        const { m, args, isCreator, Reply, getTargetNumber, setUserCustomLimit } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const targetNum = getTargetNumber(m, args[0] || '');
        if (!targetNum) return Reply(`📌 *Contoh Penggunaan:*\n> ◦ dellimit @user`);

        const target = targetNum + '@s.whatsapp.net';
        setUserCustomLimit(target, 0);
        return Reply(`\`⌜ Limit Kustom Dihapus ⌟\`\n> ◦ *Target :* @${targetNum}\n> ◦ *Status :* Kembali ke limit default`, [target]);
    }
};
