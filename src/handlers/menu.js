const fs = require('fs');
const chalk = require('chalk');
require('../../settings');

function sortCommandsStaircase(list) {
    return [...new Set(list.map((s) => String(s || '').trim()).filter(Boolean))].sort((a, b) => {
        const lenDiff = [...a].length - [...b].length;
        if (lenDiff !== 0) return lenDiff;
        return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
    });
}

function buildMenuBlock(title, items) {
    const sorted = sortCommandsStaircase(items);
    return `\`⌜ ${title} ⌟\`\n${sorted.map((item) => `> ◦ ${item}`).join('\n')}`;
}

global.menuai = buildMenuBlock('Menu AI', [
    'ai', 'grok', 'deepl', 'bingai', 'fluxai', 'gemini', 'venice', 'sunora',
    'aivideo', 'chatgpt', 'hyperai', 'ringkas', 'webpilot', 'deepchat',
    'deepseek', 'humanize', 'publicai', 'bananaai 🅟', 'nsfwcheck',
    'translate', 'powerbrain'
]);

global.menuam = buildMenuBlock('Menu Alight Motion', [
    'amprem', 'bulkam', 'setam 🅞', 'addptam 🅞',
    'delptam 🅞', 'listptam 🅞', 'statusbulkam', 'addreselleram', 'delreselleram',
    'listreselleram'
]);

global.menujoin = buildMenuBlock('Menu Auto Join', [
    'join 🅞', 'cekjoin 🅞', 'autojoin 🅞', 'stopjoin 🅞'
]);

global.menucall = buildMenuBlock('Menu Call', [
    'callgrup', 'calllink', 'playcall', 'skipcall', 'stopcall', 'callaudio', 'callmusic',
    'callqueue', 'callvideo', 'callinvite', 'callpair 🅞', 'callstatus', 'clearqueue',
    'callquality', 'callsetup 🅞', 'calllogout 🅞', 'callaudioquality'
]);

global.menuclan = buildMenuBlock('Menu Clan', [
    'clanwar', 'claninfo', 'clanjoin', 'clankick', 'clanleave',
    'clancreate', 'claninvite', 'clanmembers', 'clanleaderboard'
]);

global.menucpanelv1 = buildMenuBlock('Menu Cpanel V1', [
    '1gbv1', '2gbv1', '3gbv1', '4gbv1', '5gbv1', '6gbv1', '7gbv1', '8gbv1', '9gbv1',
    '10gbv1', 'unliv1', 'sinfov1', 'deluserv1', 'listuserv1', 'delserverv1',
    'listserverv1', 'setpterov1 🅞', 'addresellerv1 🅞', 'delresellerv1 🅞', 'listresellerv1'
]);

global.menucpanelv2 = buildMenuBlock('Menu Cpanel V2', [
    '1gbv2', '2gbv2', '3gbv2', '4gbv2', '5gbv2', '6gbv2', '7gbv2', '8gbv2', '9gbv2',
    '10gbv2', 'unliv2', 'sinfov2', 'deluserv2', 'listuserv2', 'delserverv2',
    'listserverv2', 'setpterov2 🅞', 'addresellerv2 🅞', 'delresellerv2 🅞', 'listresellerv2'
]);

global.menucpanelv3 = buildMenuBlock('Menu Cpanel V3', [
    '1gbv3', '2gbv3', '3gbv3', '4gbv3', '5gbv3', '6gbv3', '7gbv3', '8gbv3', '9gbv3',
    '10gbv3', 'unliv3', 'sinfov3', 'deluserv3', 'listuserv3', 'delserverv3',
    'statusptero 🅞', 'listserverv3', 'setpterov3 🅞', 'addresellerv3 🅞',
    'delresellerv3 🅞', 'listresellerv3'
]);

global.menucpanel = buildMenuBlock('Menu Cpanel (3 Server)', [
    'menu cpanel v1', 'menu cpanel v2', 'menu cpanel v3'
]);

global.menudownload = buildMenuBlock('Menu Download', [
    'aio', 'ytdlp', 'ytmp3', 'ytmp4', 'capcut', 'gdrive', 'tiktok', 'ytdlpa', 'ytplaylist',
    'spotify', 'threads', 'twitter', 'ytmusic', 'videy 🅟', 'bstation', 'facebook',
    'gitclone', 'ytmlirik', 'instagram', 'mediafire', 'tiktokmp3', 'ytmsearch',
    'snackvideo', 'soundcloud', 'ytdlpsetup 🅞', 'setytcookies 🅞'
]);

global.menuenc = buildMenuBlock('Menu Enc', [
    'enchex', 'encmax', 'encsiu', 'encflat', 'enchard', 'encmini', 'encpack',
    'encghost', 'encinvis', 'enclight', 'encultra', 'enccustom', 'encmatrix',
    'encstrong', 'encbigsize'
]);

global.menuephoto = buildMenuBlock('Menu Ephoto360', [
    'flagtext', '1917style', 'logomaker', 'royaltext', 'writetext', 'freecreate',
    'glitchtext', 'makingneon', 'neonglitch', 'sandsummer', 'flag3dtext',
    'galaxystyle', 'glowingtext', 'luxurygold', 'pixelglitch', 'summerbeach',
    'advancedglow', 'cartoonstyle', 'deletingtext', 'effectclouds', 'gradienttext',
    'lighteffects', 'blackpinklogo', 'papercutstyle', 'blackpinkstyle',
    'typographytext', 'underwatertext', 'watercolortext', 'galaxywallpaper',
    'multicoloredneon'
]);

global.menuextra = buildMenuBlock('Menu Extra', [
    'bing', 'joox', 'cuaca', 'deepl', 'bingai', 'kahoot', 'vtuber', 'bingimg',
    'cekmail', 'ringkas', 'webtoon', 'bacamail', 'deepchat', 'dramabox', 'humanize',
    'tempmail', 'jooxlirik', 'kahootans', 'vtubernews', 'yttranscript',
    'dramaboxtrend', 'webtoondetail', 'dramaboxdetail'
]);

global.menufun = buildMenuBlock('Menu Fun', [
    'rate', 'bucin', 'kapan', 'putus', 'senja', 'siapa', 'tolak', 'apakah', 'dimana',
    'gombal', 'tembak', 'terima', 'akankah', 'bisakah', 'cekhoki', 'cekimut',
    'cekwibu', 'confess', 'cekbaper', 'cekbucin', 'cekgabut', 'cekgamer',
    'cekjodoh', 'ceknolep', 'cekpacar', 'ceksange', 'ceksetia', 'ceksigma',
    'cektolol', 'haruskah', 'cekcantik', 'cekkhodam', 'cekjomblo',
    'cekpintar', 'faktaunik', 'soulmatch', 'cekbirahi', 'cekganteng', 'balasconfess'
]);

global.menugame = buildMenuBlock('Menu Game', [
    'ttc', '2048', 'dino', 'mbim', 'chess', 'plane', 'simon', 'snake', 'stack',
    'flappy', 'flybird', 'memory', 'riddle', 'tetris', 'wordle', 'dungeon', 'suitpvp',
    'asahotak', 'breakout', 'connect4', 'kataacak', 'richgame', 'tekateki',
    'werewolf', 'blackjack', 'family100', 'susunkata', 'tebakkata', 'tebakgame',
    'tebakhero', 'tebaklagu', 'tebaklogo', 'tictactoe', 'caklontong', 'tebakhewan',
    'tebakjorok', 'tebakkimia', 'tebaklirik', 'ulartangga', 'minesweeper',
    'sambungkata', 'siapakahaku', 'tebakanime', 'tebakgambar', 'tebaknegara',
    'tebakbendera', 'tebakinggris', 'tebakkalimat', 'tebakmakanan', 'tebakprofesi',
    'tebaktebakan', 'tebakgenshin', 'lengkapikalimat'
]);

global.menugroup = buildMenuBlock('Menu Group', [
    'afk', 'poll', 'absen', 'claim', 'intro', 'limit', 'on 🅐', 'add 🅐', 'off 🅐',
    'gajoin', 'galist', 'linkgc', 'kick 🅐', 'mute 🅐', 'open 🅐', 'warn 🅐',
    'topchat', 'close 🅐', 'gaend 🅐', 'totag 🅐', 'cekabsen', 'giveaway', 'delete 🅐',
    'demote 🅐', 'tagall 🅐', 'unwarn 🅐', 'sider', 'cekonline', 'kicksider 🅐', 'groupinfo', 'listadmin',
    'rulesgrup', 'addsewa 🅞', 'delsewa 🅞', 'hidetag 🅐', 'promote 🅐', 'setleft 🅐',
    'setopen 🅐', 'gacreate 🅐', 'gadelete 🅐', 'gareroll 🅐', 'listsewa 🅞',
    'listwarn', 'setclose 🅐', 'setintro 🅐', 'slowmode 🅐', 'resetchat 🅐',
    'resetwarn 🅐', 'setdeskgc 🅐', 'setnamegc 🅐', 'addbadword 🅐', 'delbadword 🅐',
    'hapusabsen 🅐', 'mulaiabsen 🅐', 'mutemember 🅐', 'setwelcome 🅐',
    'listbadword 🅐', 'resetlinkgc 🅐', 'levelupnotif 🅐', 'setrulesgrup 🅐',
    'sistemsewa 🅞', 'unmutemember 🅐', 'settheme 🅐', 'cekonoff 🅐', 'jagagrup 🅐'
]);

global.menujagagrup = buildMenuBlock('Menu Jaga Grup', [
    'jagagrup 🅐', 'panelgrup 🅐', 'cekonoff 🅐', 'on 🅐', 'off 🅐',
    'antilink 🅐', 'antilink2 🅐', 'antilinkwa 🅐', 'antilinkall 🅐',
    'antispam 🅐', 'antivirtex 🅐', 'antisticker 🅐', 'antidocument 🅐',
    'antihidetag 🅐', 'antibadword 🅐', 'antiswgc 🅐', 'antiswgckick 🅐',
    'antitagsw 🅐', 'antitagswkick 🅐', 'antijudol 🅐', 'antiphising 🅐',
    'welcome 🅐', 'left 🅐', 'levelupgrup 🅐', 'mutegrup 🅐',
    'slowmode 🅐', 'setopen 🅐', 'setclose 🅐', 'addbadword 🅐', 'delbadword 🅐'
]);

global.menuislami = buildMenuBlock('Menu Islami', [
    'ayat', 'quran', 'surah', 'yasin', 'hadits', 'tahlil', 'tafsir', 'murottal',
    'ayatkursi', 'doaharian', 'kisahnabi', 'niatpuasa', 'dzikirpagi', 'asmaulhusna',
    'bacaanaswaja', 'bacaansholat', 'dzikirpetang', 'haditsarbain', 'jadwalsholat',
    'kisahsahabat', 'sholatsunnah', 'sholatjenazah', 'kalenderhijriah',
    'dzikirsebelumtidur', 'dzikirsetelahsholat'
]);

global.menujadibot = buildMenuBlock('Menu Jadibot', [
    'jadibot 🅞', 'deljadibot 🅞', 'setjadibot 🅞', 'listjadibot 🅞',
    'stopjadibot 🅞', 'clonerstats 🅞', 'restartjadibot 🅞'
]);

global.menujpm = buildMenuBlock('Menu Jpm', [
    'jpm 🅞', 'swgc 🅞', 'jpmtag 🅞', 'autojpm 🅞', 'autoswgc 🅞', 'jpmpilih 🅞',
    'stoppush 🅞', 'stopswgc 🅞', 'jpmstatus 🅞', 'autojpmtag 🅞', 'pushkontak 🅞',
    'setdelayjpm 🅞', 'stopautojpm 🅞', 'setdelayswgc 🅞', 'stopautoswgc 🅞',
    'setdelayjpmtag 🅞', 'stopautojpmtag 🅞', 'setdelayautoswgc 🅞',
    'setdelaypushkontak 🅞'
]);

global.menuinspector = buildMenuBlock('Menu LID Inspector', [
    'jid', 'lid', 'ceklid', 'inspect', 'listlid', 'wastalk'
]);

global.menumaker = buildMenuBlock('Menu Maker', [
    'hd', 'iqc', 'fakeff', 'fakeml', 'fakewa', 'remini', 'tobotak', 'tohitam',
    'removebg', 'bananagen', 'tofigure 🅟'
]);

global.menuowner = buildMenuBlock('Menu Owner', [
    'ping 🅞', 'self 🅞', 'addbl 🅞', 'delbl 🅞', 'getsc 🅞', 'cekapi 🅞', 'cekmenu', 'listoff 🅞',
    'backup 🅞', 'listbl 🅞', 'public 🅞', 'savedb 🅞', 'addprem 🅞', 'blpilih 🅞',
    'delprem 🅞', 'setmenu 🅞', 'addlimit 🅞', 'addowner 🅞', 'autoread 🅞',
    'dbstatus 🅞', 'dellimit 🅞', 'listgrub 🅞', 'listprem 🅞', 'outallgc 🅞',
    'outpilih 🅞', 'setblog 🅞', 'setlimit 🅞', 'addplugin 🅞', 'delplugin 🅞', 'developer 🅞',
    'getplugin 🅞', 'outopengc 🅞', 'setprefix 🅞', 'autobackup 🅞', 'listplugin 🅞',
    'outclosegc 🅞', 'setrestart 🅞', 'settimezone 🅞', 'togglefitur 🅞',
    'levelupnotif 🅞', 'listgrubopen 🅞', 'reloadplugin 🅞', 'listgrubclose 🅞',
    'resetlimitall 🅞', 'setlimitharian 🅞',
    'updatesc 🅞', 'cekupdate 🅞', 'notifupdate 🅞', 'cekonoff 🅞',
    'autotyping 🅞', 'readsw 🅞', 'kirimch 🅞', 'sendch 🅞', 'fwdch 🅞',
    'getsw 🅞', 'listsw 🅞',
    'addmoney 🅞', 'delmoney 🅞', 'addbank 🅞', 'addexp 🅞', 'addlevel 🅞',
    'setlevel 🅞', 'adddiamond 🅞', 'addgold 🅞', 'addpotion 🅞', 'additem 🅞', 'delitem 🅞'
]);

global.menusetup = buildMenuBlock('Menu Setup Bot', [
    'setpay 🅞', 'ceksetup 🅞', 'setascii 🅞', 'setimage 🅞', 'setowner 🅞',
    'setthumb 🅞', 'resetsetup 🅞', 'setbotname 🅞', 'setpackname 🅞',
    'setaudiomenu 🅞', 'setnamaowner 🅞'
]);

global.menucloner = buildMenuBlock('Menu Setup Cloner', [
    'clonepay 🅞', 'cekcloner 🅞', 'clonestop 🅞', 'cloneascii 🅞', 'cloneaudio 🅞',
    'cloneimage 🅞', 'cloneowner 🅞', 'clonethumb 🅞', 'clonelogout 🅞',
    'resetcloner 🅞', 'clonebotname 🅞', 'clonerestart 🅞', 'clonepackname 🅞',
    'clonenamaowner 🅞'
]);

global.menuprem = buildMenuBlock('Menu Premium', [
    'tempo 🅟', 'videy 🅟', 'asupan 🅟', 'bananaai 🅟', 'tofigure 🅟', 'toprompt 🅟'
]);

global.menuprimbon = buildMenuBlock('Menu Primbon', [
    'shio', 'tarot', 'weton', 'zodiak', 'artinama', 'fengshui', 'haribaik',
    'artimimpi', 'harisangar', 'jodohnama', 'nagasasra', 'arahrejeki',
    'peletweton', 'sifatusaha', 'angkatakdir', 'garistangan', 'khodamweton',
    'primbonjawa', 'rejekiweton', 'simbolmimpi', 'ramalancinta', 'ramalanjodoh',
    'tanggallahir', 'haripernikahan', 'potensipenyakit'
]);

global.menurich = buildMenuBlock('Menu Rich Game', [
    'ttc', '2048', 'dino', 'mbim', 'chess', 'plane', 'simon', 'snake', 'stack',
    'flappy', 'memory', 'tetris', 'wordle', 'breakout', 'connect4', 'richcard',
    'richcode', 'richgame', 'richping', 'richstats', 'richtable', 'minesweeper'
]);

global.menurpg = buildMenuBlock('Menu RPG', [
    'me', 'atm', 'beg', 'boss', 'dice', 'duel', 'feed', 'heal', 'open', 'shop',
    'slot', 'craft', 'daily', 'kerja', 'kolam', 'level', 'marry', 'ojek', 'pasar',
    'quest', 'tarik', 'casino', 'kurir', 'maling', 'mining', 'mulung', 'nabung',
    'nebang', 'ngamen', 'nguli', 'parkir', 'repair', 'weekly', 'berburu', 'divorce',
    'kandang', 'levelup', 'lottery', 'mancing', 'monthly', 'petshop', 'profile',
    'upgrade', 'buylimit', 'coinflip', 'merampok', 'transfer', 'adventure', 'berladang',
    'inventory', 'leaderboard', 'selectskill'
]);

global.menusearch = buildMenuBlock('Menu Search', [
    'ptv', 'yts', 'play', 'anime', 'chord', 'lirik', 'sfile', 'waifu', 'berita',
    'gimage', 'playch 🅞', 'asupan 🅟', 'happymod', 'pinterest', 'playstore',
    'playtiktok', 'tiktoksearch'
]);

global.menustalk = buildMenuBlock('Menu Stalk', [
    'ffstalk', 'igstalk', 'wastalk', 'npmstalk', 'mlbbstalk', 'githubstalk',
    'robloxstalk', 'tiktokstalk', 'telegramstalk'
]);

global.menusticker = buildMenuBlock('Menu Stiker', [
    's', 'qc', 'swm', 'brat', 'sreact', 'stiker', 'saudio', 'qcpink', 'bratvid', 'qchitam',
    'qcputih', 'sticker', 'stikerly', 'bratgura', 'bratpink', 'emojigif', 'emojimix',
    'bratanime', 'stikerlydl', 'bratgambar', 'bratgambarhd'
]);

global.menuaudio = buildMenuBlock('Menu Audio Studio', [
    '8d', 'robot', 'slowed', 'reverb', 'reverse', 'cutaudio', 'chipmunk',
    'bassboost', 'deepvoice', 'nightcore'
]);

global.menulist = buildMenuBlock('Menu Store', [
    'pay 🅐', 'done 🅐', 'list 🅐', 'qris', 'batal 🅐', 'rekap 🅞', 'proses 🅐',
    'addlist 🅐', 'dellist 🅐', 'setlist 🅐', 'clearlist 🅐', 'resetlist 🅐',
    'updatelist 🅐', 'setqriscode 🅞'
]);

global.menutools = buildMenuBlock('Menu Tools', [
    'qu', 'lid', 'ocr', 'rvo', 'tod', 'tts', 'font', 'kbbi', 'uguu', 'gempa',
    'ipwho', 'ssweb', 'togif', 'toimg', 'tomp3', 'tovn', 'tourl', 'wrml',
    'vov2', 'blur', 'catbox', 'volume', 'inspect', 'listlid', 'pixhost',
    'spoiler', 'vov2ext', 'viewonce', 'tempo 🅟', 'top4top',
    'tovideo', 'wastalk', 'esmtocjs', 'cjstoesm', 'harilibur', 'nikparser',
    'pomodoro', 'qrcustom', 'readmore', 'spamngl', 'carifitur', 'dnslookup',
    'livescore', 'shortlink', 'whatmusic', 'cekphising', 'text2sound',
    'toprompt 🅟', 'infotourney', 'font1 - font10', 'sound1 - sound200'
]);

global.menusewa = global.menugroup;
global.menugc = global.menuowner;

global.mainmenu = buildMenuBlock('Daftar Menu', [
    'allmenu', 'menu ai', 'menu am', 'menu enc', 'menu fun', 'menu jpm', 'menu lid',
    'menu rpg', 'menu call', 'menu clan', 'menu game', 'menu join', 'menu rich',
    'menu audio', 'menu extra', 'menu group', 'menu jagagrup', 'menu maker', 'menu owner', 'menu setup', 'menu stalk',
    'menu store', 'menu tools', 'menu cloner', 'menu ephoto', 'menu islami', 'menu search',
    'menu stiker', 'menu jadibot', 'menu premium', 'menu primbon', 'menu download',
    'menu cpanel v1', 'menu cpanel v2', 'menu cpanel v3'
]);

global.allmenu = [
    global.menuai,
    global.menuam,
    global.menuaudio,
    global.menujoin,
    global.menucall,
    global.menuclan,
    global.menucpanelv1,
    global.menucpanelv2,
    global.menucpanelv3,
    global.menudownload,
    global.menuenc,
    global.menuephoto,
    global.menuextra,
    global.menufun,
    global.menugame,
    global.menugroup,
    global.menujagagrup,
    global.menuislami,
    global.menujadibot,
    global.menujpm,
    global.menuinspector,
    global.menumaker,
    global.menuowner,
    global.menuprem,
    global.menuprimbon,
    global.menurich,
    global.menurpg,
    global.menusearch,
    global.menusetup,
    global.menucloner,
    global.menustalk,
    global.menusticker,
    global.menulist,
    global.menutools
].join('\n\n');

let file = require.resolve(__filename);
fs.unwatchFile(file);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});
