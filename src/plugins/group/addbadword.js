module.exports = {
    name: 'addbadword',
    category: 'group',
    commands: ['addbadword'],

    async execute(ctx) {
        const { text, isCreator, Reply, example, loadBadwords, saveBadwords } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!text) return Reply(example("<kata>"));

        const badwords = loadBadwords();
        const newWord = text.toLowerCase().trim();
        if (badwords.words.includes(newWord)) return Reply(`❌ Kata "${newWord}" sudah terdaftar.`);

        badwords.words.push(newWord);
        saveBadwords(badwords);
        Reply(`\`⌜ Badword Added ⌟\`\n> ◦ Kata : *${newWord}*\n> ◦ Status : *Berhasil Ditambahkan*`);
        return true;
    }
};
