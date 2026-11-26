module.exports = {
    name: 'poll',
    category: 'group',
    commands: ['poll', 'polling'],

    async execute(ctx) {
        const { Dinz, m, text, Reply, usedPrefix } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        const parts = text.split('|').map((s) => s.trim()).filter(Boolean);
        if (parts.length < 3) {
            return Reply(`⚠️ Format: \`${usedPrefix}poll Pertanyaan | Opsi 1 | Opsi 2 | Opsi 3\`\nContoh: \`${usedPrefix}poll Mabar jam berapa? | 19.00 | 20.00 | 21.00\``);
        }
        const [name, ...values] = parts;
        return Dinz.sendMessage(m.chat, {
            poll: { name, values: values.slice(0, 12), selectableCount: 1 }
        });
    }
};
