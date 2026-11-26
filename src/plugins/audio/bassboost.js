const { processAudioFilter } = require('./_helper');

module.exports = {
    name: 'bassboost',
    category: 'audio',
    commands: ['bassboost', 'bass'],

    async execute(ctx) {
        const rawGain = parseInt(String(ctx.text || '').replace(/[^0-9]/g, ''), 10);
        const gain = Number.isFinite(rawGain) ? Math.min(20, Math.max(4, rawGain)) : 12;
        const subGain = Math.max(3, Math.round(gain * 0.65));
        const filter = `equalizer=f=60:width_type=h:width=80:g=${gain},equalizer=f=120:width_type=h:width=100:g=${subGain},dynaudnorm`;
        return processAudioFilter(ctx, { effectName: `Bassboost ${gain}dB`, filter });
    }
};
