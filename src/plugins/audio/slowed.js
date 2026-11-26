const { processAudioFilter } = require('./_helper');

module.exports = {
    name: 'slowed',
    category: 'audio',
    commands: ['slowed', 'slowreverb', 'reverb'],

    async execute(ctx) {
        const cmd = String(ctx.command || '').toLowerCase();
        const filter = cmd === 'reverb'
            ? 'aecho=0.8:0.88:60|90:0.4|0.3'
            : 'asetrate=44100*0.85,aresample=44100,aecho=0.8:0.88:60:0.4';
        const effectName = cmd === 'reverb' ? 'Reverb' : 'Slowed Reverb';
        return processAudioFilter(ctx, { effectName, filter });
    }
};
