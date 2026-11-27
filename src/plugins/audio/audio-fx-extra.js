const { processAudioFilter } = require('./_helper');

const EXTRA_EFFECTS = {
    echo: { name: 'Audio Echo', filter: 'aecho=0.8:0.9:1000:0.3' },
    earrape: { name: 'Audio Earrape', filter: 'acrusher=.1:1:64:0:log,volume=3.5' },
    fast: { name: 'Audio Fast (1.5x)', filter: 'atempo=1.5' },
    slow: { name: 'Audio Slow (0.75x)', filter: 'atempo=0.75' },
    fat: { name: 'Audio Fat', filter: 'atempo=1.2,asetrate=44100*0.8,aresample=44100' },
    blown: { name: 'Audio Blown', filter: 'acrusher=.1:1:64:0:log' },
    smooth: { name: 'Audio Smooth', filter: 'minterpolate=mi_mode=mci' },
    tupai: { name: 'Audio Tupai', filter: 'atempo=0.5,asetrate=65100,aresample=44100' },
    pitch: { name: 'Audio Pitch Up', filter: 'asetrate=44100*1.25,aresample=44100,atempo=0.85' },
    flanger: { name: 'Audio Flanger', filter: 'flanger=delay=5:depth=4:regen=50:speed=0.5' },
    chorus: { name: 'Audio Chorus', filter: 'chorus=0.5:0.9:50|60|40:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.3' },
    tremolo: { name: 'Audio Tremolo', filter: 'tremolo=f=6.5:d=0.75' },
    distortion: { name: 'Audio Distortion', filter: 'acrusher=level_in=8:level_out=10:bits=8:mode=log:aa=1' },
    apulsator: { name: 'Audio Pulsator', filter: 'apulsator=hz=0.25' }
};

// Fix smooth filter so it is pure audio (minterpolate is video-only)
EXTRA_EFFECTS.smooth.filter = 'lowpass=f=3200,acompressor=threshold=-18dB:ratio=3:attack=20:release=250';

module.exports = {
    name: 'audio-fx-extra',
    category: 'audio',
    commands: Object.keys(EXTRA_EFFECTS),

    async execute(ctx) {
        const cmd = String(ctx.command || '').toLowerCase();
        const fx = EXTRA_EFFECTS[cmd];
        if (!fx) return false;
        return processAudioFilter(ctx, { effectName: fx.name, filter: fx.filter });
    }
};
