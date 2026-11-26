const { formatCard, getGroupObj } = require('./_helper');

module.exports = {
    name: 'rulesgrup',
    category: 'group',
    commands: ['rulesgrup', 'rulesgc'],

    async execute(ctx) {
        const { m, body, Reply, usedPrefix } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        const rules = getGroupObj(m.chat).rulesText;
        if (!rules) return Reply(`📜 Belum ada aturan grup yang diatur. Admin bisa atur pakai \`${usedPrefix}setrulesgrup <teks>\`.`);
        return Reply(formatCard({ icon: '📜', title: `RULES ${m.metadata?.subject || 'GRUP'}`, body: rules }));
    }
};
