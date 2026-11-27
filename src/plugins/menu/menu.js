const customReact = require('../../services/custom-react');

module.exports = {
    name: 'menu',
    category: 'menu',
    commands: ['menu', 'listmenu', 'help'],

    async execute(ctx) {
        const { Dinz, m, args, command, text, Reply, menureply, sendMenuAudio, formatWithPrefix } = ctx;
        const hasCustomReact = customReact.hasCustomReactFor(Dinz, command || 'menu');

        if (!hasCustomReact) {
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        }
        try {
            const sub = (args[0] || '').toLowerCase();
            if (sub === 'group' || sub === 'grup' || sub === 'gc') {
                await menureply(global.menugroup);
            } else if (sub === 'jagagrup' || sub === 'jaga' || sub === 'anti' || sub === 'guard' || sub === 'pengamanan') {
                await menureply(global.menujagagrup);
            } else if (sub === 'owner' || sub === 'creator') {
                await menureply(global.menuowner);
            } else if (sub === 'list' || sub === 'store' || sub === 'toko') {
                await menureply(global.menulist);
            } else if (sub === 'cpanelv1' || sub === 'cpanel-v1' || sub === 'panelv1') {
                await menureply(global.menucpanelv1);
            } else if (sub === 'cpanelv2' || sub === 'cpanel-v2' || sub === 'panelv2') {
                await menureply(global.menucpanelv2);
            } else if (sub === 'cpanelv3' || sub === 'cpanel-v3' || sub === 'panelv3') {
                await menureply(global.menucpanelv3);
            } else if (sub === 'cpanel' || sub === 'panel' || sub === 'ptero') {
                await menureply(global.menucpanel);
            } else if (sub === 'sewa' || sub === 'rent') {
                await menureply(global.menugroup);
            } else if (sub === 'jpm' || sub === 'broadcast' || sub === 'push') {
                await menureply(global.menujpm);
            } else if (sub === 'join' || sub === 'autojoin') {
                await menureply(global.menujoin);
            } else if (sub === 'enc' || sub === 'obfuscate') {
                await menureply(global.menuenc);
            } else if (sub === 'download' || sub === 'dl' || sub === 'unduh') {
                await menureply(global.menudownload);
            } else if (sub === 'search' || sub === 'cari' || sub === 'play') {
                await menureply(global.menusearch);
            } else if (sub === 'ai' || sub === 'gemini') {
                await menureply(global.menuai);
            } else if (sub === 'prem' || sub === 'premium' || sub === 'vip') {
                await menureply(global.menuprem);
            } else if (sub === 'jadibot' || sub === 'jbot') {
                await menureply(global.menujadibot);
            } else if (sub === 'am' || sub === 'amprem' || sub === 'menu-am' || sub === 'menuam') {
                await menureply(global.menuam);
            } else if (sub === 'maker' || sub === 'make') {
                await menureply(global.menumaker);
            } else if (sub === 'stiker' || sub === 'sticker' || sub === 'brat') {
                await menureply(global.menusticker);
            } else if (sub === 'tools' || sub === 'tool' || sub === 'alat') {
                await menureply(global.menutools);
            } else if (sub === 'fun' || sub === 'hiburan' || sub === 'lelucon') {
                await menureply(global.menufun);
            } else if (sub === 'stalk' || sub === 'stalker') {
                await menureply(global.menustalk);
            } else if (sub === 'islami' || sub === 'islam' || sub === 'agama') {
                await menureply(global.menuislami);
            } else if (sub === 'ephoto' || sub === 'ephoto360' || sub === 'photo' || sub === 'foto' || sub === 'efoto' || sub === 'e-photo') {
                await menureply(global.menuephoto);
            } else if (sub === 'game' || sub === 'games' || sub === 'permainan') {
                await menureply(global.menugame);
            } else if (sub === 'rpg' || sub === 'petualang' || sub === 'adventure') {
                await menureply(global.menurpg);
            } else if (sub === 'gc' || sub === 'group-manager' || sub === 'manager') {
                await menureply(global.menugc);
            } else if (sub === 'extra' || sub === 'extras' || sub === 'baru' || sub === 'new') {
                await menureply(global.menuextra);
            } else if (sub === 'rich' || sub === 'richgame' || sub === 'gamenew') {
                await menureply(global.menurich);
            } else if (sub === 'call' || sub === 'playcall' || sub === 'vc' || sub === 'voip') {
                await menureply(global.menucall);
            } else if (sub === 'clan' || sub === 'guild') {
                await menureply(global.menuclan);
            } else if (sub === 'lid' || sub === 'inspector' || sub === 'jid') {
                await menureply(global.menuinspector);
            } else if (sub === 'setup' || sub === 'rename' || sub === 'config' || sub === 'setupbot') {
                await menureply(global.menusetup);
            } else if (sub === 'cloner' || sub === 'clone' || sub === 'setupclone' || sub === 'setupcloner') {
                await menureply(global.menucloner);
            } else if (sub === 'audio' || sub === 'audiofx' || sub === 'efekaudio') {
                await menureply(global.menuaudio);
            } else if (sub === 'anime' || sub === 'wibu') {
                await menureply(global.menuanime);
            } else if (sub === 'channel' || sub === 'saluran' || sub === 'ch') {
                await menureply(global.menuchannel);
            } else if (sub === 'roleplay' || sub === 'rp') {
                await menureply(global.menuroleplay);
            } else if (sub === 'all' || sub === 'allmenu' || sub === 'semua') {
                await menureply(global.allmenu, { isAllMenu: true });
                await sendMenuAudio();
            } else {
                await menureply('', { isMainMenu: true });
                await sendMenuAudio();
            }
            if (!hasCustomReact) {
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            }
        } catch (err) {
            console.log('menu error:', err.message);
            await Reply(formatWithPrefix(global.mainmenu || global.allmenu));
            await sendMenuAudio();
            if (!hasCustomReact) {
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            }
        }
        return true;
    }
};
