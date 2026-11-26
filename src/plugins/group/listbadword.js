module.exports = {
    name: 'listbadword',
    category: 'group',
    commands: ['listbadword'],

    async execute(ctx) {
        const { Reply, loadBadwords } = ctx;

        const badwords = loadBadwords();
        if (badwords.words.length === 0) return Reply('📭 Belum ada kata kasar yang terdaftar.');
        Reply(`📋 *Daftar Badwords (${badwords.words.length} kata):*\n\n${badwords.words.map((w, i) => `${i+1}. ${w}`).join('\n')}`);
        return true;
    }
};
