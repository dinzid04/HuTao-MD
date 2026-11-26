module.exports = {
    name: 'listbl',
    category: 'broadcast',
    commands: ['listbl'],

    async execute(ctx) {
        const { Dinz, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const allGroups = global.db.groups || {};
        const blList = Object.keys(allGroups).filter(jid => allGroups[jid]?.blacklistjpm === true);

        if (blList.length === 0) return Reply(`\`⌜ List Blacklist JPM ⌟\`\n> ◦ Status : *Tidak ada grup di blacklist.*`);

        let txt = `\`⌜ List Blacklist JPM ⌟\`\n> ◦ Total : *${blList.length} Grup*\n\n`;
        for (let i = 0; i < blList.length; i++) {
            const jid = blList[i];
            let name = jid;
            try {
                const meta = await Dinz.groupMetadata(jid);
                name = meta.subject || jid;
            } catch (e) {}
            txt += `> ${i + 1}. *${name}*\n>    ID : \`${jid}\`\n\n`;
        }
        Reply(txt.trim());
        return true;
    }
};
