const fs = require('fs');
const util = require('util');
const sharp = require('sharp');
const axios = require('axios');
const chalk = require('chalk');
const crypto = require('crypto');
const FileType = require('file-type');
const moment = require('moment-timezone');
const pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('');

const unixTimestampSeconds = (date = new Date()) => Math.floor(date.getTime() / 1000);

const generateMessageTag = (epoch) => {
    let tag = (0, unixTimestampSeconds)().toString();
    if (epoch) tag += '.--' + epoch;
    return tag;
};

const processTime = (timestamp, now) => {
    return moment.duration(now - moment(timestamp * 1000)).asSeconds();
};

const webApi = (a, b, c, d, e, f) => a + b + c + d + e + f;

const getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`;

const getBuffer = async (url, options = {}) => {
    try {
        const res = await axios({
            method: "get",
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (err) {
        return err;
    }
};

const fetchJson = async (url, options = {}) => {
    try {
        const res = await axios({
            method: 'GET',
            url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        });
        return res.data;
    } catch (err) {
        return err;
    }
};

const runtime = function(seconds = process.uptime()) {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    const dDisplay = d > 0 ? d + "d " : "";
    const hDisplay = h > 0 ? h + "h " : "";
    const mDisplay = m > 0 ? m + "m " : "";
    const sDisplay = s > 0 ? s + "s" : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
};

const clockString = (ms) => {
    const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
    const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
    const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':');
};

const sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'));
};

const getTime = (format, date) => {
    if (date) {
        return moment(date).locale('id').format(format);
    } else {
        return moment.tz('Asia/Jakarta').locale('id').format(format);
    }
};

const capital = (string) => string.charAt(0).toUpperCase() + string.slice(1);

const formatDate = (n, locale = 'id') => {
    const d = new Date(n);
    return d.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    });
};

const tanggal = (numer) => {
    const myMonths = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    const myDays = ['Minggu','Senin','Selasa','Rabu','Kamis','Jum’at','Sabtu'];
    const tgl = new Date(numer);
    const day = tgl.getDate();
    const bulan = tgl.getMonth();
    const thisDay = myDays[tgl.getDay()];
    const yy = tgl.getYear();
    const year = (yy < 1000) ? yy + 1900 : yy;
    return `${thisDay}, ${day} - ${myMonths[bulan]} - ${year}`;
};

const bytesToSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatp = (bytes) => bytesToSize(bytes, 2);

const jsonformat = (string) => JSON.stringify(string, null, 2);

const reSize = async (image, ukur1 = 100, ukur2 = 100) => {
    return sharp(image).resize(ukur1, ukur2).jpeg().toBuffer();
};

const toHD = async (image) => {
    const meta = await sharp(image).metadata();
    return sharp(image).resize((meta.width || 256) * 4, (meta.height || 256) * 4).jpeg().toBuffer();
};

const logic = (check, inp, out) => {
    if (inp.length !== out.length) throw new Error('Input and Output must have same length');
    for (let i in inp)
        if (util.isDeepStrictEqual(check, inp[i])) return out[i];
    return null;
};

const generateProfilePicture = async (buffer) => {
    const resized = await sharp(buffer).resize(720, 720, { fit: 'cover' }).jpeg().toBuffer();
    return { img: resized, preview: resized };
};

const toIDR = async (x) => {
    x = x.toString();
    const pattern = /(-?\d+)(\d{3})/;
    while (pattern.test(x)) x = x.replace(pattern, "$1.$2");
    return x;
};

const getSizeMedia = async (path) => {
    return new Promise((resolve, reject) => {
        if (/http/.test(path)) {
            axios.get(path).then((res) => {
                const length = parseInt(res.headers['content-length']);
                const size = bytesToSize(length, 3);
                if (!isNaN(length)) resolve(size);
            }).catch(reject);
        } else if (Buffer.isBuffer(path)) {
            const length = Buffer.byteLength(path);
            const size = bytesToSize(length, 3);
            if (!isNaN(length)) resolve(size);
        } else {
            reject('error gatau apah');
        }
    });
};

const parseMention = (text = '') => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
};

const getGroupAdmins = (participants) => {
    const admins = [];
    for (let i of participants) {
        if (i.admin === "superadmin" || i.admin === "admin") admins.push(i.id);
    }
    return admins;
};

const getHashedPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('base64');
};

const generateAuthToken = (size) => {
    return crypto.randomBytes(size).toString('hex').slice(0, size);
};

const cekMenfes = (tag, nomer, db_menfes) => {
    let x1 = false;
    Object.keys(db_menfes).forEach((i) => {
        if (db_menfes[i].id == nomer) x1 = i;
    });
    if (x1 !== false) {
        if (tag == 'id') return db_menfes[x1].id;
        if (tag == 'teman') return db_menfes[x1].teman;
    }
    return null;
};

function format(...args) {
    return util.format(...args);
}

function generateToken() {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*';
    let token = '';
    for (let i = 0; i < 8; i++) {
        token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return token;
}

function batasiTeks(teks, batas) {
    return teks.length <= batas ? teks : teks.substring(0, batas) + '...';
}

function randomText(len) {
    const result = [];
    for (let i = 0; i < len; i++) result.push(pool[Math.floor(Math.random() * pool.length)]);
    return result.join('');
}

function isEmoji(str) {
    const emojiRegex = /[\u{1F000}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}]/u;
    return emojiRegex.test(str);
}

function readFileTxt(file) {
    return new Promise((resolve) => {
        const data = fs.readFileSync(file, 'utf8');
        const array = data.toString().split('\n');
        const random = array[Math.floor(Math.random() * array.length)];
        resolve(random.replace('\r', ''));
    });
}

function readFileJson(file) {
    return new Promise((resolve) => {
        const jsonData = JSON.parse(fs.readFileSync(file));
        const index = Math.floor(Math.random() * jsonData.length);
        resolve(jsonData[index]);
    });
}

async function getTypeUrlMedia(url) {
    const buffer = await axios.get(url, { responseType: 'arraybuffer' });
    const type = buffer.headers['content-type'] || (await FileType.fromBuffer(buffer.data)).mime;
    return { type, url };
}

function pickRandom(list) {
    return list[Math.floor(list.length * Math.random())];
}

async function getAllHTML(urls) {
    try {
        const htmlArr = [];
        for (const url of urls) {
            const response = await axios.get(url);
            htmlArr.push(response.data);
        }
        return htmlArr;
    } catch (error) {
        console.error(error);
    }
}

module.exports = {
    unixTimestampSeconds, generateMessageTag, processTime, webApi, getRandom, getBuffer, fetchJson,
    runtime, clockString, sleep, isUrl, getTime, formatDate, tanggal, formatp, jsonformat,
    reSize, toHD, logic, generateProfilePicture, bytesToSize, getSizeMedia, parseMention,
    getGroupAdmins, readFileTxt, readFileJson, getHashedPassword, generateAuthToken, cekMenfes,
    generateToken, batasiTeks, randomText, isEmoji, getTypeUrlMedia, pickRandom, getAllHTML, toIDR, capital
};

let file = require.resolve(__filename);
fs.unwatchFile(file);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});
