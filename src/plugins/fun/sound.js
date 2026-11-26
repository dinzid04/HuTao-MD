module.exports = {
    name: 'sound',
    category: 'fun',
    commands: [
        'sound1', 'sound2', 'sound3', 'sound4', 'sound5', 'sound6', 'sound7', 'sound8',
        'sound9', 'sound10', 'sound11', 'sound12', 'sound13', 'sound14', 'sound15', 'sound16',
        'sound17', 'sound18', 'sound19', 'sound20', 'sound21', 'sound22', 'sound23', 'sound24',
        'sound25', 'sound26', 'sound27', 'sound28', 'sound29', 'sound30', 'sound31', 'sound32',
        'sound33', 'sound34', 'sound35', 'sound36', 'sound37', 'sound38', 'sound39', 'sound40',
        'sound41', 'sound42', 'sound43', 'sound44', 'sound45', 'sound46', 'sound47', 'sound48',
        'sound49', 'sound50', 'sound51', 'sound52', 'sound53', 'sound54', 'sound55', 'sound56',
        'sound57', 'sound58', 'sound59', 'sound60', 'sound61', 'sound62', 'sound63', 'sound64',
        'sound65', 'sound66', 'sound67', 'sound68', 'sound69', 'sound70', 'sound71', 'sound72',
        'sound73', 'sound74', 'sound75', 'sound76', 'sound77', 'sound78', 'sound79', 'sound80',
        'sound81', 'sound82', 'sound83', 'sound84', 'sound85', 'sound86', 'sound87', 'sound88',
        'sound89', 'sound90', 'sound91', 'sound92', 'sound93', 'sound94', 'sound95', 'sound96',
        'sound97', 'sound98', 'sound99', 'sound100', 'sound101', 'sound102', 'sound103', 'sound104',
        'sound105', 'sound106', 'sound107', 'sound108', 'sound109', 'sound110', 'sound111', 'sound112',
        'sound113', 'sound114', 'sound115', 'sound116', 'sound117', 'sound118', 'sound119', 'sound120',
        'sound121', 'sound122', 'sound123', 'sound124', 'sound125', 'sound126', 'sound127', 'sound128',
        'sound129', 'sound130', 'sound131', 'sound132', 'sound133', 'sound134', 'sound135', 'sound136',
        'sound137', 'sound138', 'sound139', 'sound140', 'sound141', 'sound142', 'sound143', 'sound144',
        'sound145', 'sound146', 'sound147', 'sound148', 'sound149', 'sound150', 'sound151', 'sound152',
        'sound153', 'sound154', 'sound155', 'sound156', 'sound157', 'sound158', 'sound159', 'sound160',
        'sound161', 'sound162', 'sound163', 'sound164', 'sound165', 'sound166', 'sound167', 'sound168',
        'sound169', 'sound170', 'sound171', 'sound172', 'sound173', 'sound174', 'sound175', 'sound176',
        'sound177', 'sound178', 'sound179', 'sound180', 'sound181', 'sound182', 'sound183', 'sound184',
        'sound185', 'sound186', 'sound187', 'sound188', 'sound189', 'sound190', 'sound191', 'sound192',
        'sound193', 'sound194', 'sound195', 'sound196', 'sound197', 'sound198', 'sound199', 'sound200',
        'sound'
    ],

    async execute(ctx) {
        const { Dinz, m, command, text, quoted, isCreator, Reply, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let soundNum = parseInt(command.replace(/[^0-9]/g, '')) || parseInt(text) || Math.floor(Math.random() * 119) + 1;
        if (soundNum < 1) soundNum = 1;
        const mirrorIndex = ((soundNum - 1) % 119) + 1;
        const soundUrl = `https://raw.githubusercontent.com/AyGemuy/Sound/main/sound${mirrorIndex}.mp3`;

        await Dinz.sendMessage(m.chat, { react: { text: "🔊", key: m.key } }).catch(() => {});
        try {
            await Dinz.sendMessage(m.chat, {
                audio: { url: soundUrl },
                mimetype: 'audio/mp4',
                ptt: true
            }, { quoted: m });
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal memutar sound ${soundNum}: ${e.message}`);
        }
        return true;
    }
};
