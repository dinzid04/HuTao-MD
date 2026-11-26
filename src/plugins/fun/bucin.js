const { QUIZ_BANK, GOMBAL_LIST } = require('./_helper');

module.exports = {
    name: 'bucin',
    category: 'fun',
    commands: ['bucin'],

    async execute(ctx) {
        const { Reply } = ctx;

        const list = QUIZ_BANK.bucin || GOMBAL_LIST;
        return Reply(`💘 _"${list[Math.floor(Math.random() * list.length)]}"_`);
    }
};
