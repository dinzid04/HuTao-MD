const { processAudioFilter } = require('./_helper');

module.exports = {
    name: 'audio8d',
    category: 'audio',
    commands: ['8d', 'audio8d', '8daudio'],

    async execute(ctx) {
        const filter = 'apulsator=hz=0.125:amount=1';
        return processAudioFilter(ctx, { effectName: '8D Surround Audio', filter });
    }
};
