module.exports = {
    name: 'delbadword',
    category: 'group',
    commands: ['delbadword'],

    async execute(ctx) {
        const { text, isCreator, Reply, example, loadBadwords, saveBadwords } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!text) return Reply(example("<kata>"));

        const badwords = loadBadwords();
        const wordToDelete = text.toLowerCase().trim();
        if (!badwords.words.includes(wordToDelete)) return Reply(`❌ Kata "${wordToDelete}" tidak ditemukan.`);

        badwords.words = badwords.words.filter(w => w !== wordToDelete);
        saveBadwords(badwords);
        Reply(`\`⌜ Badword Deleted ⌟\`\n> ◦ Kata : *${wordToDelete}*\n> ◦ Status : *Berhasil Dihapus*`);
        return true;
    }
};
