const { FAKTA_UNIK } = require('./_helper');

module.exports = {
    name: 'faktaunik',
    category: 'fun',
    commands: ['faktaunik'],

    async execute(ctx) {
        const { Reply } = ctx;

        return Reply(`💡 *Fakta Unik:*\n${FAKTA_UNIK[Math.floor(Math.random() * FAKTA_UNIK.length)]}`);
    }
};
