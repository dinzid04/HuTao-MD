const { processAudioFilter } = require('./_helper');

module.exports = {
    name: 'nightcore',
    category: 'audio',
    commands: ['nightcore', 'speedup'],

    async execute(ctx) {
        const parsed = parseFloat(String(ctx.text || '').replace(',', '.'));
        const rate = Number.isFinite(parsed) ? Math.min(1.6, Math.max(1.05, parsed)) : 1.25;
        const filter = `asetrate=44100*${rate.toFixed(2)},aresample=44100`;
        return processAudioFilter(ctx, { effectName: `Nightcore ${rate.toFixed(2)}x`, filter });
    }
};
