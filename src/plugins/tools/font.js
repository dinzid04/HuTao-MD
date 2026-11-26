module.exports = {
    name: 'font',
    category: 'tools',
    commands: ['font', 'styletext', 'fancytext'],

    async execute(ctx) {
        const { m, text, isCreator, Reply, example, checkLimit, addLimit, getAllFancyFonts } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const rawInput = text || (m.quoted && m.quoted.text) || '';
        if (!rawInput || rawInput.trim().length === 0) {
            return Reply(example("Teks yang ingin diubah ke berbagai font"));
        }
        const allFonts = getAllFancyFonts(rawInput.trim());
        addLimit(m.sender, isCreator);
        return Reply(allFonts);
    }
};
