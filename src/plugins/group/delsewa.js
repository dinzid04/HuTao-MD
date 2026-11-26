module.exports = {
    name: 'delsewa',
    category: 'group',
    commands: ['delsewa'],

    async execute(ctx) {
        const { Dinz, text, isCreator, Reply, example, getSewaNotified, saveSewaNotified, botCtx } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!text) return Reply(example("<jid/link gc>"));

        let targetJid = '';

        if (text.includes('chat.whatsapp.com')) {
            try {
                const groupInviteCode = text.split('/').pop().split('?')[0];
                const info = await Dinz.groupGetInviteInfo(groupInviteCode);
                targetJid = info.id;
            } catch (e) {
                return Reply(`❌ Link grup tidak valid.`);
            }
        } else {
            targetJid = text.replace(/[^0-9@g.us]/g, '');
            if (!targetJid.endsWith('@g.us')) {
                targetJid += '@g.us';
            }
        }

        let sewagrup = Array.isArray(botCtx.getSection('sewagrup', Dinz)) ? [...botCtx.getSection('sewagrup', Dinz)] : [];
        const initialLength = sewagrup.length;

        sewagrup = sewagrup.filter(v => v.jid !== targetJid);

        if (sewagrup.length === initialLength) {
            return Reply(`❌ Grup dengan ID tersebut tidak ditemukan dalam database sewa.`);
        }

        botCtx.setSection('sewagrup', sewagrup, Dinz);

        try {
            const notified = getSewaNotified(Dinz);
            if (notified[targetJid]) {
                delete notified[targetJid];
                saveSewaNotified(notified, Dinz);
            }
        } catch (e) {}

        let groupName = targetJid;
        try {
            const groupMetadata = await Dinz.groupMetadata(targetJid);
            groupName = groupMetadata.subject || targetJid;
        } catch (e) {}

        Reply(`\`⌜ Sewa Deleted ⌟\`\n> ◦ Grup : *${groupName}*\n> ◦ Status : *Berhasil Dihapus*`);
        return true;
    }
};
