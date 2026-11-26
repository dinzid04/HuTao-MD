module.exports = {
    name: 'readmore',
    category: 'tools',
    commands: ['readmore', 'spoiler', 'more'],

    async execute(ctx) {
        const { m, command, text, isCreator, Reply, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        const rawInput = text || (m.quoted && m.quoted.text) || '';
        if (!rawInput || rawInput.trim().length === 0) {
            return Reply(`\`⌜ Readmore Generator ⌟\`\n> ◦ *Format :* ${command} <teks_depan> | <teks_sembunyi>\n> ◦ *Contoh :* ${command} test | text sembunyi`);
        }

        const more = String.fromCharCode(8206);
        const readMoreSeparator = more.repeat(4001);

        let [front, ...back] = rawInput.split('|');
        let frontText = front ? front.trim() : 'Baca Selengkapnya';
        let hiddenText = back.length > 0 ? back.join('|').trim() : '';

        if (!hiddenText) {
            hiddenText = frontText;
            frontText = 'Baca Selengkapnya';
        }

        const resultText = `${frontText} ${readMoreSeparator} ${hiddenText}`;
        addLimit(m.sender, isCreator);
        return Reply(resultText);
    }
};
