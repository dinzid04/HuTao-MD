const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');

const EPHOTO_EFFECTS = {
    glitchtext: { name: 'Digital Glitch', url: 'https://en.ephoto360.com/create-digital-glitch-text-effects-online-767.html' },
    writetext: { name: 'Wet Glass Writing', url: 'https://en.ephoto360.com/write-text-on-wet-glass-online-589.html' },
    advancedglow: { name: 'Advanced Glow', url: 'https://en.ephoto360.com/advanced-glow-effects-74.html' },
    typographytext: { name: 'Pavement Typography', url: 'https://en.ephoto360.com/create-typography-text-effect-on-pavement-online-774.html' },
    pixelglitch: { name: 'Pixel Glitch', url: 'https://en.ephoto360.com/create-pixel-glitch-text-effect-online-769.html' },
    neonglitch: { name: 'Neon Glitch', url: 'https://en.ephoto360.com/create-impressive-neon-glitch-text-effects-online-768.html' },
    flagtext: { name: '3D Flag Text', url: 'https://en.ephoto360.com/nigeria-3d-flag-text-effect-online-free-753.html' },
    flag3dtext: { name: 'American Flag 3D', url: 'https://en.ephoto360.com/free-online-american-flag-3d-text-effect-generator-725.html' },
    deletingtext: { name: 'Eraser Deleting', url: 'https://en.ephoto360.com/create-eraser-deleting-text-effect-online-717.html' },
    blackpinkstyle: { name: 'Blackpink Style Logo', url: 'https://en.ephoto360.com/online-blackpink-style-logo-maker-effect-711.html' },
    glowingtext: { name: 'Glowing Text', url: 'https://en.ephoto360.com/create-glowing-text-effects-online-706.html' },
    underwatertext: { name: '3D Underwater', url: 'https://en.ephoto360.com/3d-underwater-text-effect-online-682.html' },
    logomaker: { name: 'Bear Logo Maker', url: 'https://en.ephoto360.com/free-bear-logo-maker-online-673.html' },
    cartoonstyle: { name: 'Cartoon Graffiti', url: 'https://en.ephoto360.com/create-a-cartoon-style-graffiti-text-effect-online-668.html' },
    papercutstyle: { name: '3D Paper Cut', url: 'https://en.ephoto360.com/multicolor-3d-paper-cut-style-text-effect-658.html' },
    watercolortext: { name: 'Watercolor Paint', url: 'https://en.ephoto360.com/create-a-watercolor-text-effect-online-655.html' },
    effectclouds: { name: 'Sky Clouds Text', url: 'https://en.ephoto360.com/write-text-effect-clouds-in-the-alip-online-619.html' },
    blackpinklogo: { name: 'Blackpink Official', url: 'https://en.ephoto360.com/create-blackpink-logo-online-free-607.html' },
    gradienttext: { name: '3D Color Gradient', url: 'https://en.ephoto360.com/create-3d-gradient-text-effect-online-600.html' },
    summerbeach: { name: 'Summer Beach Sand', url: 'https://en.ephoto360.com/write-in-sand-summer-beach-online-free-595.html' },
    luxurygold: { name: 'Luxury Gold Metal', url: 'https://en.ephoto360.com/create-a-luxury-gold-text-effect-online-594.html' },
    multicoloredneon: { name: 'Multicolored Neon Sign', url: 'https://en.ephoto360.com/create-multicolored-neon-light-signatures-591.html' },
    sandsummer: { name: 'Sand In Beach', url: 'https://en.ephoto360.com/write-in-sand-summer-beach-online-576.html' },
    galaxywallpaper: { name: 'Galaxy Mobile Wallpaper', url: 'https://en.ephoto360.com/create-galaxy-wallpaper-mobile-online-528.html' },
    '1917style': { name: '1917 Movie Style', url: 'https://en.ephoto360.com/1917-style-text-effect-523.html' },
    makingneon: { name: 'Galaxy Neon Light', url: 'https://en.ephoto360.com/making-neon-light-text-effect-with-galaxy-style-521.html' },
    royaltext: { name: 'Royal Vintage Gold', url: 'https://en.ephoto360.com/royal-text-effect-online-free-471.html' },
    freecreate: { name: '3D Hologram Effect', url: 'https://en.ephoto360.com/free-create-a-3d-hologram-text-effect-441.html' },
    galaxystyle: { name: 'Galaxy Name Logo', url: 'https://en.ephoto360.com/create-galaxy-style-free-name-logo-438.html' },
    lighteffects: { name: 'Green Neon Lights', url: 'https://en.ephoto360.com/create-light-effects-green-neon-online-429.html' }
};

async function createEphoto(effectKey, inputText) {
    const effect = EPHOTO_EFFECTS[effectKey];
    if (!effect) throw new Error(`Efek ephoto "${effectKey}" tidak ditemukan.`);
    const url = effect.url;

    const getPage = await axios.get(url, {
        headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 20000
    });
    const $ = cheerio.load(getPage.data);

    const token = $('input[name=token]').val();
    const build_server = $('input[name=build_server]').val();
    const build_server_id = $('input[name=build_server_id]').val();

    const form = new FormData();
    form.append('text[]', inputText);
    form.append('token', token);
    form.append('build_server', build_server);
    form.append('build_server_id', build_server_id);

    const res = await axios.post(url, form, {
        headers: {
            Accept: '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            cookie: getPage.headers['set-cookie']?.join('; '),
            ...form.getHeaders()
        },
        timeout: 25000
    });

    const $$ = cheerio.load(res.data);
    const jsonStr = $$('input[name=form_value_input]').val();
    if (!jsonStr) throw new Error('Gagal mendapatkan token formulir ephoto360.');
    const json = JSON.parse(jsonStr);
    json['text[]'] = json.text;
    delete json.text;

    const { data } = await axios.post('https://en.ephoto360.com/effect/create-image', new URLSearchParams(json), {
        headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            cookie: getPage.headers['set-cookie']?.join('; ')
        },
        timeout: 25000
    });

    if (!data.image) throw new Error('Gagal merender gambar ephoto360.');
    return {
        url: build_server + data.image,
        name: effect.name
    };
}

function getEphotoMenuList() {
    const keys = Object.keys(EPHOTO_EFFECTS);
    let txt = `\`⌜ Menu Ephoto360 ⌟\`\n`;
    keys.forEach(k => {
        txt += `> ◦ ${k}\n`;
    });
    return txt.trim();
}

module.exports = {
    EPHOTO_EFFECTS,
    createEphoto,
    getEphotoMenuList
};
