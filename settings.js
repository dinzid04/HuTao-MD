/*
 * Konfigurasi Utama Bot
 * Ubah nomor owner, nama bot, foto menu, payment, dan API di file ini.
 */

process.env.FORCE_COLOR = '3';
const fs = require('fs');
const chalk = require('chalk');
chalk.level = 3;

const { version } = require('./package.json');
const botCtx = require('./src/core/context');
botCtx.installGlobalContextProps();

// ===================================================
// 1. IDENTITAS BOT & OWNER
// ===================================================
global.owner = '628990936282';     // Nomor owner (kode negara tanpa +, contoh: 628xxx)
global.versi = version;             // Versi script bot
global.namaOwner = 'DinzID';        // Nama owner bot
global.packname = 'HuTao - MD';     // Nama pack stiker WA
global.botname = 'HuTao - MD';      // Nama bot WhatsApp
global.asciiName = 'HuTao - MD';    // Teks banner ASCII di console
global.asciiFont = 'ANSI Shadow';   // Font banner ASCII

// ===================================================
// 2. KONEKSI & DATABASE (LOKAL + MONGODB CLOUD)
// ===================================================
global.pairing_code = true;         // true = pairing code, false = scan QR
global.custompairing = '12345678';  // Kode custom pairing (8 karakter)
global.tempatDB = 'database.json';  // Nama file database tunggal di folder data/

// MongoDB Cloud (REKOMENDASI agar progres tidak hilang saat restart/pindah panel)
// - Kosongkan ('') jika cuma mau pakai file lokal data/database.json
// - Isi URI MongoDB Atlas (gratis) agar semua progres otomatis tersimpan di cloud!
//   Contoh: 'mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority'
global.mongoUri = 'mongodb+srv://dinzidam_db_user:YkCxB0hSYRFWjI7u@dinzid.qefopdl.mongodb.net/?retryWrites=true&w=majority';
global.mongoDbName = 'shiki_ai';
global.mongoSession = false;         // true = simpan session login WA juga di MongoDB (jika mongoUri diisi)

// ===================================================
// 3. INTEGRASI API
// ===================================================
global.apiDinz = 'https://docs.lamora.my.id';
global.ApikeyDinz = 'alipaiapikeybaru';

// API Alight Motion Workers
global.amApiBase = 'https://am.gadingkencana04.workers.dev';
global.amApiKey = '';

// ===================================================
// 4. MEDIA & PEMBAYARAN
// ===================================================
global.audiomenu = true;            // Aktifkan VN/audio otomatis saat buka menu

global.image = {
	menu: "https://image2url.com/r2/default/images/1773625179709-bccac35a-f5a7-4722-88a3-d2fe955d8526.jpg",
	qris: "https://db.lamora.my.id/uploads/logo_file-1790541121093.jpg"
};

global.payment = {
	qris: "https://db.lamora.my.id/uploads/logo_file-1790541121093.jpg",
	dana: "62888888",
	gopay: "62888888",
	an: "HuTao - MD"
};

// ===================================================
// 5. SERVER PANEL PTERODACTYL (CPANEL)
// ===================================================
global.pterodactyl = {
	server1: {
		domain: '',
		apikey: '',
		capikey: '',
		egg: '15',
		nestid: '5',
		location: '1'
	},
	server2: {
		domain: '',
		apikey: '',
		capikey: '',
		egg: '15',
		nestid: '5',
		location: '1'
	},
	server3: {
		domain: '',
		apikey: '',
		capikey: '',
		egg: '15',
		nestid: '5',
		location: '1'
	}
};

global.cpanelEmail = {
	defaultEmail: 'dinz04@gmail.com',
	apiUrl: `${global.apiDinz}/tools/send-mail`,
	apiKey: global.ApikeyDinz
};

// ===================================================
// 6. PESAN RESPON BAWAAN
// ===================================================
global.mess = {
	owner: `\`𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗\`\n> sᴛᴀᴛᴜs : ɢᴀɢᴀʟ\n> ɪɴғᴏ : ғɪᴛᴜʀ ᴋʜᴜsᴜs 𝗼𝘄𝗻𝗲𝗿 𝗯𝗼𝘁`,
	admin: `\`𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗\`\n> sᴛᴀᴛᴜs : ɢᴀɢᴀʟ\n> ɪɴғᴏ : ғɪᴛᴜʀ ᴋʜᴜsᴜs 𝗮𝗱𝗺𝗶𝗻 𝗴𝗿𝘂𝗽`,
	botAdmin: `\`𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗\`\n> sᴛᴀᴛᴜs : ɢᴀɢᴀʟ\n> ɪɴғᴏ : ʙᴏᴛ ʜᴀʀᴜs ᴍᴇɴᴊᴀᴅɪ 𝗮𝗱𝗺𝗶𝗻 𝗴𝗿𝘂𝗽`,
	group: `\`𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗\`\n> sᴛᴀᴛᴜs : ɢᴀɢᴀʟ\n> ɪɴғᴏ : ғɪᴛᴜʀ ᴋʜᴜsᴜs ᴅɪ ᴅᴀʟᴀᴍ 𝗴𝗿𝘂𝗽`,
	wait: `\`𝗣𝗥𝗢𝗖𝗘𝗦𝗦𝗜𝗡𝗚\`\n> sᴛᴀᴛᴜs : ᴍᴏʜᴏɴ ᴛᴜɴɢɢᴜ...\n> ɪɴғᴏ : ᴘᴇʀᴍɪɴᴛᴀᴀɴ sᴇᴅᴀɴɢ ᴅɪᴘʀᴏsᴇs`,
	error: `\`𝗘𝗥𝗥𝗢𝗥\`\n> sᴛᴀᴛᴜs : ɢᴀɢᴀʟ\n> ɪɴғᴏ : ᴛᴇʀᴊᴀᴅɪ ᴋᴇsᴀʟᴀʜᴀɴ sɪsᴛᴇᴍ`,
	done: `\`𝗦𝗨𝗖𝗖𝗘𝗦𝗦\`\n> sᴛᴀᴛᴜs : ʙᴇʀʜᴀsɪʟ\n> ɪɴғᴏ : ᴘʀᴏsᴇs sᴇʟᴇsᴀɪ ᴅᴇɴɢᴀɴ sᴜᴋsᴇs`,
	prem: `\`𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗\`\n> sᴛᴀᴛᴜs : ɢᴀɢᴀʟ\n> ɪɴғᴏ : ғɪᴛᴜʀ ɪɴɪ ᴋʜᴜsᴜs 𝗽𝗿𝗲𝗺𝗶𝘂𝗺 (𝘃𝗶𝗽)`,
	limit: `\`𝗟𝗜𝗠𝗜𝗧 𝗛𝗔𝗕𝗜𝗦\`\n> sᴛᴀᴛᴜs : ʟɪᴍɪᴛ ʜᴀʀɪᴀɴ ʜᴀʙɪs\n> ɪɴғᴏ : ʙᴀᴛᴀs ᴘᴇɴɢɢᴜɴᴀᴀɴ ʜᴀʀɪ ɪɴɪ ᴛᴇʀᴄᴀᴘᴀɪ. ʀᴇsᴇᴛ ᴊᴀᴍ 𝟶𝟶:𝟶𝟶 ᴡɪʙ.\n> ᴛɪᴘs : ᴋᴇᴛɪᴋ \`claim\` ᴜɴᴛᴜᴋ ᴋʟᴀɪᴍ +𝟻 ʙᴏɴᴜs ʟɪᴍɪᴛ ɢʀᴀᴛɪs.`
};

// Auto-reload otomatis saat file settings.js disimpan
let file = require.resolve(__filename);
fs.unwatchFile(file);
fs.watchFile(file, () => {
	fs.unwatchFile(file);
	console.log(chalk.redBright(`Update ${__filename}`));
	delete require.cache[file];
	require(file);
});
