module.exports = {
    name: 'settimezone',
    category: 'owner',
    commands: ['settimezone', 'timezone'],

    async execute(ctx) {
        const { text, isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!text) return Reply(`\`⌜ Timezone ⌟\`\n> ◦ Timezone saat ini : *${global.db.settings.timezone || 'Asia/Jakarta'}*\n\n📌 *Contoh:* settimezone Asia/Jakarta`);

        try {
            const testMoment = require('moment-timezone');
            if (!testMoment.tz.zone(text.trim())) return Reply(`❌ Timezone *${text.trim()}* tidak valid.`);
            global.db.settings.timezone = text.trim();
            Reply(`\`⌜ Timezone Updated ⌟\`\n> ◦ Timezone : *${text.trim()}*\n> ◦ Status : *Berhasil Diubah*`);
        } catch (e) {
            Reply(`❌ Gagal set timezone: ${e.message}`);
        }
        return true;
    }
};
