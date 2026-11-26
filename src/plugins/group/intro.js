const { formatCard, getGroupObj } = require('./_helper');

module.exports = {
    name: 'intro',
    category: 'group',
    commands: ['intro'],

    async execute(ctx) {
        const { m, body, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        const intro = getGroupObj(m.chat).introText || `Nama:\nUmur:\nAsal Kota:\nHobi:\nGender:`;
        return Reply(formatCard({ icon: '👋', title: 'FORMAT INTRO MEMBER', body: intro }));
    }
};
