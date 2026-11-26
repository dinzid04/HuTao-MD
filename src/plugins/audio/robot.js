const { processAudioFilter } = require('./_helper');

module.exports = {
    name: 'robot',
    category: 'audio',
    commands: ['robot', 'chipmunk', 'deepvoice'],

    async execute(ctx) {
        const cmd = String(ctx.command || '').toLowerCase();
        if (cmd === 'chipmunk') {
            return processAudioFilter(ctx, {
                effectName: 'Chipmunk Voice',
                filter: 'asetrate=44100*1.5,aresample=44100'
            });
        }
        if (cmd === 'deepvoice') {
            return processAudioFilter(ctx, {
                effectName: 'Deep Voice',
                filter: 'asetrate=44100*0.72,aresample=44100,equalizer=f=80:width_type=h:width=100:g=6'
            });
        }
        return processAudioFilter(ctx, {
            effectName: 'Robot Voice',
            filter: "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75"
        });
    }
};
