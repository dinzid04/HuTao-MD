const { processAudioFilter } = require('./_helper');

module.exports = {
    name: 'reverse',
    category: 'audio',
    commands: ['reverse', 'reverseaudio'],

    async execute(ctx) {
        return processAudioFilter(ctx, { effectName: 'Reverse Audio', filter: 'areverse' });
    }
};
