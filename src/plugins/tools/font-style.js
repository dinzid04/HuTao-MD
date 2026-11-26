module.exports = {
    name: 'font-style',
    category: 'tools',
    commands: [
        'font1', 'font2', 'font3', 'font4', 'font5', 'font6', 'font7', 'font8',
        'font9', 'font10'
    ],

    async execute(ctx) {
        const { m, command, text, isCreator, Reply, example, checkLimit, addLimit, formatFancyFont } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const rawInput = text || (m.quoted && m.quoted.text) || '';
        if (!rawInput || rawInput.trim().length === 0) {
            return Reply(example("Teks yang ingin diubah"));
        }
        const fontKey = command.toLowerCase();
        const converted = formatFancyFont(rawInput.trim(), fontKey);
        addLimit(m.sender, isCreator);
        return Reply(converted);
    }
};
