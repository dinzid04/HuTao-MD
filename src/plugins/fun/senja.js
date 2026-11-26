const { SENJA_QUOTES } = require('./_helper');

module.exports = {
    name: 'senja',
    category: 'fun',
    commands: ['senja'],

    async execute(ctx) {
        const { Reply } = ctx;

        return Reply(`🌅 _"${SENJA_QUOTES[Math.floor(Math.random() * SENJA_QUOTES.length)]}"_`);
    }
};
