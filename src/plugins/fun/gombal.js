const { GOMBAL_LIST } = require('./_helper');

module.exports = {
    name: 'gombal',
    category: 'fun',
    commands: ['gombal'],

    async execute(ctx) {
        const { Reply } = ctx;

        return Reply(`🌹 _"${GOMBAL_LIST[Math.floor(Math.random() * GOMBAL_LIST.length)]}"_`);
    }
};
