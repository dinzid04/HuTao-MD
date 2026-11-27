const { sendYouhuRichGame, YOUHU_GAMES } = require('../../services/rich-message');

const ALIAS_TO_GAME_KEY = {
    ludo: 'ludo', ludorich: 'ludo',
    uno: 'uno', unorich: 'uno',
    poker: 'poker', pokerrich: 'poker',
    gaple: 'gaple', gaplerich: 'gaple',
    dam: 'dam', damrich: 'dam',
    othello: 'othello', othellorich: 'othello',
    ceme: 'ceme', cemerich: 'ceme',
    bjrich: 'bjrich',
    mafia: 'mafia', mafiarich: 'mafia',
    undercover: 'undercover', undercoverrich: 'undercover',
    ulartanggarich: 'ulartanggarich',
    sudoku: 'sudoku', sudokurich: 'sudoku',
    pong: 'pong', pongrich: 'pong',
    geodash: 'geodash', geodashrich: 'geodash',
    isekai: 'isekai', isekairich: 'isekai',
    typing: 'typing', typingrich: 'typing',
    whack: 'whack', whackrich: 'whack',
    catchstar: 'catchstar', catchrich: 'catchstar',
    colortest: 'colortest', colorrich: 'colortest',
    destroy: 'destroy', destroyrich: 'destroy',
    mathrich: 'mathrich'
};

module.exports = {
    name: 'elsyaa-richgames',
    category: 'richgame',
    commands: Object.keys(ALIAS_TO_GAME_KEY),

    async execute(ctx) {
        const { Dinz, m, command, isCreator, Reply, checkLimit, addLimit } = ctx;
        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const cmd = String(command || '').toLowerCase();
        const key = ALIAS_TO_GAME_KEY[cmd];
        const game = YOUHU_GAMES[key];
        if (!game) return false;

        await Dinz.sendMessage(m.chat, { react: { text: game.emoji || '🎮', key: m.key } }).catch(() => {});
        await sendYouhuRichGame(Dinz, m, key);
        addLimit(m.sender, isCreator);
        return true;
    }
};
