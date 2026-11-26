const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment-timezone');
const botCtx = require('../core/context');
require('../../settings');

const VALID_SERVERS = ['v1', 'v2', 'v3'];

async function sendPanelEmail({ to, subject, text, fromName }) {
    const defaultEmail = global.cpanelEmail?.defaultEmail || '';
    const targetEmail = (to || defaultEmail).trim();
    if (!targetEmail || !targetEmail.includes('@')) return null;

    try {
        const apikey = global.cpanelEmail?.apiKey || global.ApikeyDinz || 'alipaiapikeybaru';
        const apiUrl = global.cpanelEmail?.apiUrl || (global.apiDinz ? `${global.apiDinz}/tools/send-mail` : 'https://docs.lamora.my.id/tools/send-mail');
        const sender = fromName || global.botname || 'Bot';

        const res = await axios.get(apiUrl, {
            params: {
                apikey,
                to: targetEmail,
                from_name: sender,
                fromName: sender,
                subject: subject || 'Detail Akun Panel Pterodactyl',
                text: text || ''
            },
            timeout: 15000
        });
        return res.data;
    } catch (e) {
        console.error('[CPanel Email Error]', e.response?.data || e.message);
        return null;
    }
}

const RAM_SPECS = {
    '1gb': { ram: 1024, cpu: 70, disk: 1024 },
    '2gb': { ram: 2048, cpu: 80, disk: 2048 },
    '3gb': { ram: 3072, cpu: 90, disk: 2048 },
    '4gb': { ram: 4096, cpu: 100, disk: 4096 },
    '5gb': { ram: 5120, cpu: 110, disk: 5120 },
    '6gb': { ram: 6144, cpu: 120, disk: 6144 },
    '7gb': { ram: 7168, cpu: 130, disk: 7168 },
    '8gb': { ram: 8192, cpu: 140, disk: 8192 },
    '9gb': { ram: 9216, cpu: 150, disk: 9216 },
    '10gb': { ram: 10240, cpu: 160, disk: 10240 },
    'unli': { ram: 0, cpu: 0, disk: 0 },
    'unlimited': { ram: 0, cpu: 0, disk: 0 }
};

function initCpanelDb() {
    if (!global.db) global.db = {};
    if (!global.db.cpanel) global.db.cpanel = {};
    if (!global.db.cpanel.servers) global.db.cpanel.servers = {};

    for (const ver of VALID_SERVERS) {
        if (!global.db.cpanel[ver]) {
            global.db.cpanel[ver] = {
                reseller: []
            };
        }
        if (!Array.isArray(global.db.cpanel[ver].reseller)) {
            global.db.cpanel[ver].reseller = [];
        }
    }
    return global.db.cpanel;
}

function cleanNumber(jid) {
    if (!jid) return '';
    return String(jid).replace(/@.*$/, '').replace(/[^0-9]/g, '');
}

function getServerConfig(serverVersion) {
    const ver = (serverVersion || 'v1').toLowerCase();
    const serverKey = 'server' + ver.replace('v', '');
    const customConfig = global.db?.settings?.pterodactyl?.[serverKey];
    const defaultConfig = botCtx.isJadibotContext() ? null : global.pterodactyl?.[serverKey];
    return {
        domain: (customConfig?.domain || defaultConfig?.domain || '').replace(/\/+$/, ''),
        apikey: (customConfig?.apikey || defaultConfig?.apikey || ''),
        capikey: (customConfig?.capikey || defaultConfig?.capikey || ''),
        egg: String(customConfig?.egg || defaultConfig?.egg || '15'),
        nestid: String(customConfig?.nestid || defaultConfig?.nestid || '5'),
        location: String(customConfig?.location || defaultConfig?.location || '1')
    };
}

function getAvailableServers() {
    return VALID_SERVERS.filter(ver => {
        const cfg = getServerConfig(ver);
        return Boolean(cfg.domain && cfg.apikey);
    });
}

function checkAndCleanExpiredResellers(serverVersion) {
    initCpanelDb();
    const ver = (serverVersion || 'v1').toLowerCase();
    if (!VALID_SERVERS.includes(ver)) return;
    const now = Date.now();
    global.db.cpanel[ver].reseller = global.db.cpanel[ver].reseller.filter(r => {
        if (typeof r === 'string') return true;
        if (!r.expiredAt) return true;
        return r.expiredAt > now;
    });
}

function isReseller(jid, serverVersion) {
    initCpanelDb();
    const ver = (serverVersion || 'v1').toLowerCase();
    if (!VALID_SERVERS.includes(ver)) return false;
    checkAndCleanExpiredResellers(ver);

    const num = cleanNumber(jid);
    const list = global.db.cpanel[ver].reseller || [];
    return list.some(r => {
        const rNum = typeof r === 'string' ? r : r.number;
        return rNum === num;
    });
}

function getResellerInfo(jid, serverVersion) {
    initCpanelDb();
    const ver = (serverVersion || 'v1').toLowerCase();
    if (!VALID_SERVERS.includes(ver)) return null;
    checkAndCleanExpiredResellers(ver);

    const num = cleanNumber(jid);
    const list = global.db.cpanel[ver].reseller || [];
    const found = list.find(r => (typeof r === 'string' ? r : r.number) === num);
    if (!found) return null;

    if (typeof found === 'string') {
        return { number: found, days: 'Permanen', remainingDays: 'Permanen', expiredStr: 'Permanen' };
    }

    const now = Date.now();
    const remainingMs = Math.max(0, found.expiredAt - now);
    const remainingDays = Math.ceil(remainingMs / 86400000);
    const expiredStr = moment(found.expiredAt).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm');

    return {
        number: found.number,
        days: found.days,
        remainingDays: `${remainingDays} Hari`,
        expiredStr: `${expiredStr} WIB`,
        expiredAt: found.expiredAt
    };
}

function hasAccessToServer(jid, serverVersion, isBotOwner = false) {
    if (isBotOwner) return true;
    return isReseller(jid, serverVersion);
}

function addReseller(serverVersion, number, days = 30) {
    initCpanelDb();
    const ver = (serverVersion || 'v1').toLowerCase();
    const cleanNum = cleanNumber(number);
    if (!VALID_SERVERS.includes(ver) || !cleanNum) return null;

    const durationDays = Math.max(1, parseInt(days) || 30);
    const now = Date.now();
    const expiredAt = now + (durationDays * 86400000);
    const expiredStr = moment(expiredAt).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm');

    global.db.cpanel[ver].reseller = global.db.cpanel[ver].reseller.filter(r => {
        const rNum = typeof r === 'string' ? r : r.number;
        return rNum !== cleanNum;
    });

    const resellerData = {
        number: cleanNum,
        days: durationDays,
        addedAt: now,
        expiredAt
    };

    global.db.cpanel[ver].reseller.push(resellerData);

    return {
        number: cleanNum,
        days: durationDays,
        expiredStr: `${expiredStr} WIB`
    };
}

function removeReseller(serverVersion, number) {
    initCpanelDb();
    const ver = (serverVersion || 'v1').toLowerCase();
    const cleanNum = cleanNumber(number);
    if (!VALID_SERVERS.includes(ver) || !cleanNum) return false;

    const beforeLen = global.db.cpanel[ver].reseller.length;
    global.db.cpanel[ver].reseller = global.db.cpanel[ver].reseller.filter(r => {
        const rNum = typeof r === 'string' ? r : r.number;
        return rNum !== cleanNum;
    });

    return global.db.cpanel[ver].reseller.length < beforeLen;
}

function listResellers(serverVersion) {
    initCpanelDb();
    const ver = (serverVersion || 'v1').toLowerCase();
    if (!VALID_SERVERS.includes(ver)) return [];
    checkAndCleanExpiredResellers(ver);
    return global.db.cpanel[ver].reseller || [];
}

const CPANEL = {
    VALID_SERVERS,
    RAM_SPECS,
    initCpanelDb,
    cleanNumber,
    getServerConfig,
    getAvailableServers,
    isReseller,
    getResellerInfo,
    hasAccessToServer,
    addReseller,
    removeReseller,
    listResellers,

    async createServer({ serverVersion, ramKey, username, targetNum, days = 30, emailTo, isBotOwner, senderJid }) {
        initCpanelDb();
        const ver = (serverVersion || 'v1').toLowerCase();
        if (!hasAccessToServer(senderJid, ver, isBotOwner)) {
            return {
                success: false,
                message: `\`⌜ Access Denied ⌟\`\n> ◦ Status : *Gagal*\n> ◦ Info : *Kamu bukan Reseller Server ${ver.toUpperCase()}*\n> ◦ Hubungi Owner untuk pendaftaran Reseller.`
            };
        }

        const serverConfig = getServerConfig(ver);
        if (!serverConfig.domain || !serverConfig.apikey) {
            return {
                success: false,
                message: `\`⌜ Server Belum Dikonfigurasi ⌟\`\n> ◦ Info : *Server ${ver.toUpperCase()} belum disetting!*\n> ◦ Gunakan : \`.setptero${ver} domain,apikey,egg,location\``
            };
        }

        const specs = RAM_SPECS[ramKey.toLowerCase()];
        if (!specs) {
            return { success: false, message: `❌ Spesifikasi RAM *${ramKey}* tidak valid.` };
        }

        const cleanUser = (username || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!cleanUser || cleanUser.length < 3 || cleanUser.length > 16) {
            return { success: false, message: `❌ Username hanya boleh 3-16 karakter (huruf, angka, underscore).` };
        }

        const durationDays = Math.max(1, parseInt(days) || 30);
        const now = Date.now();
        const expiredAt = now + (durationDays * 86400000);
        const expiredStr = moment(expiredAt).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm');

        const email = (emailTo && emailTo.includes('@')) ? emailTo.trim() : `${cleanUser}@alipai.my.id`;
        const serverName = `${cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1)} Server`;
        const password = cleanUser + crypto.randomBytes(3).toString('hex');
        const ramLabel = specs.ram === 0 ? 'Unlimited' : `${specs.ram / 1024} GB`;

        try {

            let userRes;
            try {
                userRes = await axios.post(
                    `${serverConfig.domain}/api/application/users`,
                    {
                        email,
                        username: cleanUser,
                        first_name: cleanUser,
                        last_name: 'Panel',
                        language: 'en',
                        password
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${serverConfig.apikey}`,
                            'Content-Type': 'application/json',
                            Accept: 'Application/vnd.pterodactyl.v1+json'
                        },
                        timeout: 20000
                    }
                );
            } catch (uErr) {
                if (uErr.response?.data?.errors?.[0]?.detail?.includes('already been taken')) {
                    let findUser = await axios.get(
                        `${serverConfig.domain}/api/application/users?filter[email]=${encodeURIComponent(email)}`,
                        {
                            headers: {
                                Authorization: `Bearer ${serverConfig.apikey}`,
                                Accept: 'Application/vnd.pterodactyl.v1+json'
                            },
                            timeout: 20000
                        }
                    );
                    if (findUser.data?.data?.[0]) {
                        userRes = { data: findUser.data.data[0] };
                    } else {
                        const findUserByName = await axios.get(
                            `${serverConfig.domain}/api/application/users?filter[username]=${encodeURIComponent(cleanUser)}`,
                            {
                                headers: {
                                    Authorization: `Bearer ${serverConfig.apikey}`,
                                    Accept: 'Application/vnd.pterodactyl.v1+json'
                                },
                                timeout: 20000
                            }
                        );
                        if (findUserByName.data?.data?.[0]) {
                            userRes = { data: findUserByName.data.data[0] };
                        } else {
                            throw uErr;
                        }
                    }
                } else {
                    throw uErr;
                }
            }

            const pteroUser = userRes.data.attributes || userRes.data;

            const eggRes = await axios.get(
                `${serverConfig.domain}/api/application/nests/${serverConfig.nestid}/eggs/${serverConfig.egg}`,
                {
                    headers: {
                        Authorization: `Bearer ${serverConfig.apikey}`,
                        Accept: 'Application/vnd.pterodactyl.v1+json'
                    },
                    timeout: 20000
                }
            );
            const startupCmd = eggRes.data.attributes.startup || 'npm start';

            const serverRes = await axios.post(
                `${serverConfig.domain}/api/application/servers`,
                {
                    name: serverName,
                    description: `Active ${durationDays}d [Exp: ${expiredStr}] (${targetNum})`,
                    user: pteroUser.id,
                    egg: parseInt(serverConfig.egg),
                    docker_image: 'ghcr.io/parkervcp/yolks:nodejs_18',
                    startup: startupCmd,
                    environment: {
                        INST: 'npm',
                        USER_UPLOAD: '0',
                        AUTO_UPDATE: '0',
                        CMD_RUN: 'npm start',
                        JS_FILE: 'index.js'
                    },
                    limits: {
                        memory: specs.ram,
                        swap: 0,
                        disk: specs.disk,
                        io: 500,
                        cpu: specs.cpu
                    },
                    feature_limits: {
                        databases: 5,
                        backups: 5,
                        allocations: 5
                    },
                    deploy: {
                        locations: [parseInt(serverConfig.location) || 1],
                        dedicated_ip: false,
                        port_range: []
                    }
                },
                {
                    headers: {
                        Authorization: `Bearer ${serverConfig.apikey}`,
                        'Content-Type': 'application/json',
                        Accept: 'Application/vnd.pterodactyl.v1+json'
                    },
                    timeout: 25000
                }
            );

            const pteroServer = serverRes.data.attributes;
            const senderNum = cleanNumber(senderJid);

            global.db.cpanel.servers[pteroServer.id] = {
                id: pteroServer.id,
                serverVersion: ver,
                username: cleanUser,
                targetNum,
                creatorNum: senderNum,
                ram: ramLabel,
                days: durationDays,
                createdAt: now,
                expiredAt,
                domain: serverConfig.domain,
                status: 'active'
            };

            const recipientEmail = (emailTo && emailTo.includes('@')) ? emailTo.trim() : (global.cpanelEmail?.defaultEmail || '');
            const detailTxt = `data panel telah di kirim ke email : ${recipientEmail}`;

            const botSenderName = global.botname || 'Bot';
            const emailSubject = `[${botSenderName}] Akses Akun Server Panel Pterodactyl [${ver.toUpperCase()}] - ${cleanUser}`;
            const emailBody = `==================================================
           PTERODACTYL SERVER PROVISIONED
             Powered by ${botSenderName}
==================================================

Kepada Yth. ${cleanUser},
Terima kasih telah mempercayakan layanan server kepada kami.
Berikut adalah rincian kredensial akun panel Pterodactyl Anda:

--------------------------------------------------
[ INFORMASI KREDENSIAL LOGIN ]
--------------------------------------------------
• URL Panel       : ${serverConfig.domain}
• Username        : ${cleanUser}
• Password        : ${password}
• Email Terdaftar : ${email}

--------------------------------------------------
[ SPESIFIKASI & MASA AKTIF SERVER ]
--------------------------------------------------
• Server Node     : ${ver.toUpperCase()}
• Server ID       : #${pteroServer.id}
• Alokasi RAM     : ${ramLabel}
• Durasi Sewa     : ${durationDays} Hari
• Tanggal Expired : ${expiredStr} WIB

--------------------------------------------------
[ PANDUAN PENGGUNAAN ]
--------------------------------------------------
1. Silakan login ke URL panel di atas menggunakan Username/Email dan Password yang tertera.
2. Unggah file server atau bot Anda melalui menu File Manager di panel.
3. Jalankan server dengan menekan tombol Start pada dashboard panel.
4. Jangan bagikan password akun panel Anda kepada siapa pun demi keamanan.

Jika Anda membutuhkan bantuan teknis atau ingin memperpanjang masa aktif server, silakan hubungi Customer Support kami.

Salam hangat,
${botSenderName} Management
==================================================`;
            sendPanelEmail({ to: recipientEmail, subject: emailSubject, text: emailBody }).catch(() => {});

            return {
                success: true,
                serverVersion: ver,
                username: cleanUser,
                password,
                serverId: pteroServer.id,
                domain: serverConfig.domain,
                ramLabel,
                days: durationDays,
                expiredStr,
                emailSentTo: recipientEmail,
                detailText: detailTxt
            };
        } catch (err) {
            const rawMsg = err.response?.data?.errors?.[0]?.detail || err.response?.data?.message || err.message;
            let friendly = rawMsg;
            if (rawMsg.includes('has already been taken')) {
                friendly = `Username / email *${cleanUser}* sudah terdaftar di panel. Coba gunakan username lain.`;
            } else if (rawMsg.includes('could not be found') || rawMsg.includes('could not find')) {
                friendly = `Egg ID (${serverConfig.egg}) atau Nest ID (${serverConfig.nestid}) tidak ditemukan di panel.`;
            } else if (rawMsg.includes('No suitable allocation') || rawMsg.includes('allocation')) {
                friendly = `Tidak ada port/alokasi IP tersedia di Node server panel. Tambah alokasi port di admin panel.`;
            } else if (rawMsg.includes('unauthorized') || rawMsg.includes('401') || rawMsg.includes('403')) {
                friendly = `API Key Pterodactyl (PTLA) tidak valid atau tidak memiliki izin administrator.`;
            } else if (rawMsg.includes('ENOTFOUND') || rawMsg.includes('ECONNREFUSED') || rawMsg.includes('ETIMEDOUT')) {
                friendly = `Gagal terhubung ke domain panel (${serverConfig.domain}). Pastikan panel sedang online.`;
            }
            return {
                success: false,
                message: `\`⌜ Gagal Membuat Server [${ver.toUpperCase()}] ⌟\`\n> ◦ Status : *Error*\n> ◦ Info : *${friendly}*`
            };
        }
    },

    async listServers({ serverVersion, isBotOwner, senderJid }) {
        const ver = (serverVersion || 'v1').toLowerCase();
        if (!hasAccessToServer(senderJid, ver, isBotOwner)) {
            return { success: false, message: `❌ Kamu tidak memiliki akses ke Server ${ver.toUpperCase()}` };
        }
        const serverConfig = getServerConfig(ver);
        if (!serverConfig.domain || !serverConfig.apikey) {
            return { success: false, message: `❌ Server ${ver.toUpperCase()} belum disetting.` };
        }

        try {
            const res = await axios.get(
                `${serverConfig.domain}/api/application/servers?per_page=100`,
                {
                    headers: {
                        Authorization: `Bearer ${serverConfig.apikey}`,
                        Accept: 'Application/vnd.pterodactyl.v1+json'
                    },
                    timeout: 20000
                }
            );

            let servers = res.data.data || [];
            const senderNum = cleanNumber(senderJid);

            if (!isBotOwner) {
                servers = servers.filter(s => {
                    const dbServer = global.db?.cpanel?.servers?.[s.attributes.id];
                    return dbServer?.creatorNum === senderNum;
                });
            }

            if (servers.length === 0) {
                const emptyMsg = isBotOwner
                    ? `\`⌜ List Server ${ver.toUpperCase()} ⌟\`\n> ◦ Status : *Kosong (Belum ada server)*`
                    : `\`⌜ List Server Buyer Kamu [${ver.toUpperCase()}] ⌟\`\n> ◦ Status : *Belum ada server yang kamu buat di Server ${ver.toUpperCase()}*`;
                return { success: true, message: emptyMsg };
            }

            const headerTitle = isBotOwner ? `List Semua Server ${ver.toUpperCase()}` : `List Server Buyer Kamu [${ver.toUpperCase()}]`;
            let text = `\`⌜ ${headerTitle} ⌟\`\n> ◦ Total : *${servers.length} Server*\n\n`;

            servers.forEach((s, idx) => {
                const attr = s.attributes;
                const ram = attr.limits?.memory === 0 ? 'Unlimited' : `${attr.limits?.memory} MB`;
                const disk = attr.limits?.disk === 0 ? 'Unlimited' : `${attr.limits?.disk} MB`;
                const cpu = attr.limits?.cpu === 0 ? 'Unlimited' : `${attr.limits?.cpu}%`;

                const dbServer = global.db?.cpanel?.servers?.[attr.id];
                let expInfo = '';
                let buyerInfo = '';
                if (dbServer?.expiredAt) {
                    const now = Date.now();
                    const sisaHari = Math.ceil((dbServer.expiredAt - now) / 86400000);
                    expInfo = sisaHari > 0 ? ` | Exp: ${sisaHari}h` : ' | Exp: ⚠️ Kadaluarsa';
                }
                if (isBotOwner && dbServer?.creatorNum) {
                    buyerInfo = `\n> ◦ Creator : @${dbServer.creatorNum}`;
                }

                text += `*${idx + 1}. ${attr.name}*\n`;
                text += `> ◦ ID : \`${attr.id}\` | UUID : \`${attr.identifier}\`${expInfo}\n`;
                text += `> ◦ RAM : ${ram} | Disk : ${disk} | CPU : ${cpu}${buyerInfo}\n\n`;
            });

            return { success: true, message: text.trim() };
        } catch (err) {
            return { success: false, message: `❌ Gagal mengambil list server: ${err.message}` };
        }
    },

    async deleteServer({ serverVersion, serverId, isBotOwner, senderJid }) {
        const ver = (serverVersion || 'v1').toLowerCase();
        if (!hasAccessToServer(senderJid, ver, isBotOwner)) {
            return { success: false, message: `❌ Kamu tidak memiliki akses ke Server ${ver.toUpperCase()}` };
        }
        const serverConfig = getServerConfig(ver);
        if (!serverConfig.domain || !serverConfig.apikey) {
            return { success: false, message: `❌ Server ${ver.toUpperCase()} belum disetting.` };
        }

        const id = parseInt(serverId);
        if (isNaN(id)) return { success: false, message: `❌ ID Server tidak valid. Contoh: \`.delserver${ver} 12\`` };

        const senderNum = cleanNumber(senderJid);
        const dbServer = global.db?.cpanel?.servers?.[id];

        if (!isBotOwner && dbServer && dbServer.creatorNum && dbServer.creatorNum !== senderNum) {
            return {
                success: false,
                message: `\`⌜ Access Denied ⌟\`\n> ◦ Status : *Ditolak*\n> ◦ Info : *Server ID ${id} dibuat oleh reseller lain (@${dbServer.creatorNum}). Kamu hanya bisa menghapus server milik buyermu sendiri!*`
            };
        }

        try {
            await axios.delete(
                `${serverConfig.domain}/api/application/servers/${id}`,
                {
                    headers: {
                        Authorization: `Bearer ${serverConfig.apikey}`,
                        Accept: 'Application/vnd.pterodactyl.v1+json'
                    },
                    timeout: 20000
                }
            );

            if (global.db?.cpanel?.servers?.[id]) {
                delete global.db.cpanel.servers[id];
            }

            return {
                success: true,
                message: `\`⌜ Del Server ${ver.toUpperCase()} ⌟\`\n> ◦ Status : *Berhasil Dihapus*\n> ◦ Server ID : \`${id}\``
            };
        } catch (err) {
            const rawMsg = err.response?.data?.errors?.[0]?.detail || err.message;
            return { success: false, message: `❌ Gagal menghapus server ${id}: ${rawMsg}` };
        }
    },

    async serverInfo({ serverVersion, serverId, isBotOwner, senderJid }) {
        const ver = (serverVersion || 'v1').toLowerCase();
        if (!hasAccessToServer(senderJid, ver, isBotOwner)) {
            return { success: false, message: `❌ Kamu tidak punya akses ke Server ${ver.toUpperCase()}` };
        }
        const serverConfig = getServerConfig(ver);
        if (!serverConfig.domain || !serverConfig.apikey) {
            return { success: false, message: `❌ Server ${ver.toUpperCase()} belum disetting.` };
        }

        const id = parseInt(serverId);
        if (isNaN(id)) return { success: false, message: `❌ ID Server tidak valid.` };

        try {
            const res = await axios.get(
                `${serverConfig.domain}/api/application/servers/${id}?include=allocations,user`,
                {
                    headers: {
                        Authorization: `Bearer ${serverConfig.apikey}`,
                        Accept: 'Application/vnd.pterodactyl.v1+json'
                    },
                    timeout: 20000
                }
            );

            const attr = res.data.attributes;
            const ram = attr.limits?.memory === 0 ? 'Unlimited' : `${attr.limits?.memory} MB`;
            const disk = attr.limits?.disk === 0 ? 'Unlimited' : `${attr.limits?.disk} MB`;
            const cpu = attr.limits?.cpu === 0 ? 'Unlimited' : `${attr.limits?.cpu}%`;

            const dbServer = global.db?.cpanel?.servers?.[id];
            let expInfo = '-';
            if (dbServer?.expiredAt) {
                const now = Date.now();
                const sisaHari = Math.ceil((dbServer.expiredAt - now) / 86400000);
                const expDateStr = moment(dbServer.expiredAt).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm');
                expInfo = `${expDateStr} WIB (${sisaHari} Hari)`;
            }

            let txt = `\`⌜ Server Info [${ver.toUpperCase()}] ⌟\`\n`;
            txt += `> ◦ Name : *${attr.name}*\n`;
            txt += `> ◦ ID : \`${attr.id}\` | UUID : \`${attr.identifier}\`\n`;
            txt += `> ◦ Node : Node ${attr.node}\n`;
            txt += `> ◦ RAM : ${ram}\n`;
            txt += `> ◦ Disk : ${disk}\n`;
            txt += `> ◦ CPU : ${cpu}\n`;
            txt += `> ◦ Expired : *${expInfo}*\n`;
            txt += `> ◦ Suspended : ${attr.suspended ? '🔴 YA' : '🟢 TIDAK'}\n`;
            txt += `> ◦ Description : ${attr.description || '-'}`;

            return { success: true, message: txt.trim() };
        } catch (err) {
            return { success: false, message: `❌ Server ID ${id} tidak ditemukan.` };
        }
    },

    async listUsers({ serverVersion, isBotOwner, senderJid }) {
        const ver = (serverVersion || 'v1').toLowerCase();
        if (!hasAccessToServer(senderJid, ver, isBotOwner)) {
            return { success: false, message: `❌ Kamu tidak memiliki akses ke Server ${ver.toUpperCase()}` };
        }
        const serverConfig = getServerConfig(ver);
        if (!serverConfig.domain || !serverConfig.apikey) {
            return { success: false, message: `❌ Server ${ver.toUpperCase()} belum disetting.` };
        }

        try {
            const res = await axios.get(
                `${serverConfig.domain}/api/application/users?per_page=50`,
                {
                    headers: {
                        Authorization: `Bearer ${serverConfig.apikey}`,
                        Accept: 'Application/vnd.pterodactyl.v1+json'
                    },
                    timeout: 20000
                }
            );

            const users = res.data.data || [];
            if (users.length === 0) {
                return { success: true, message: `\`⌜ List User ${ver.toUpperCase()} ⌟\`\n> ◦ Status : *Kosong*` };
            }

            let text = `\`⌜ List User ${ver.toUpperCase()} ⌟\`\n> ◦ Total : *${users.length} Users*\n\n`;
            users.forEach((u, idx) => {
                const attr = u.attributes;
                text += `*${idx + 1}. ${attr.username}* ${attr.root_admin ? '👑 (Admin)' : ''}\n`;
                text += `> ◦ ID : \`${attr.id}\` | Email : \`${attr.email}\`\n\n`;
            });

            return { success: true, message: text.trim() };
        } catch (err) {
            return { success: false, message: `❌ Gagal mengambil list user: ${err.message}` };
        }
    },

    async deleteUser({ serverVersion, userId, isBotOwner, senderJid }) {
        const ver = (serverVersion || 'v1').toLowerCase();
        if (!isBotOwner) {
            return { success: false, message: `❌ Fitur hapus user panel hanya untuk Bot Owner.` };
        }
        const serverConfig = getServerConfig(ver);
        if (!serverConfig.domain || !serverConfig.apikey) {
            return { success: false, message: `❌ Server ${ver.toUpperCase()} belum disetting.` };
        }

        const id = parseInt(userId);
        if (isNaN(id)) return { success: false, message: `❌ User ID tidak valid. Contoh: \`.deluser${ver} 5\`` };

        try {
            await axios.delete(
                `${serverConfig.domain}/api/application/users/${id}`,
                {
                    headers: {
                        Authorization: `Bearer ${serverConfig.apikey}`,
                        Accept: 'Application/vnd.pterodactyl.v1+json'
                    },
                    timeout: 20000
                }
            );

            return {
                success: true,
                message: `\`⌜ Del User ${ver.toUpperCase()} ⌟\`\n> ◦ Status : *Berhasil Dihapus*\n> ◦ User ID : \`${id}\``
            };
        } catch (err) {
            const rawMsg = err.response?.data?.errors?.[0]?.detail || err.message;
            return { success: false, message: `❌ Gagal menghapus user ${id}: ${rawMsg}` };
        }
    },

    async suspendServer({ serverVersion, serverId, isBotOwner, senderJid }) {
        const ver = (serverVersion || 'v1').toLowerCase();
        if (!hasAccessToServer(senderJid, ver, isBotOwner)) {
            return { success: false, message: `❌ Kamu tidak memiliki akses ke Server ${ver.toUpperCase()}` };
        }
        const serverConfig = getServerConfig(ver);
        if (!serverConfig.domain || !serverConfig.apikey) {
            return { success: false, message: `❌ Server ${ver.toUpperCase()} belum disetting.` };
        }
        const id = parseInt(serverId);
        if (isNaN(id)) return { success: false, message: `❌ ID Server tidak valid. Contoh: \`.suspend${ver} 12\`` };

        const senderNum = cleanNumber(senderJid);
        const dbServer = global.db?.cpanel?.servers?.[id];

        if (!isBotOwner && dbServer && dbServer.creatorNum && dbServer.creatorNum !== senderNum) {
            return {
                success: false,
                message: `\`⌜ Access Denied ⌟\`\n> ◦ Status : *Ditolak*\n> ◦ Info : *Server ID ${id} bukan milik buyermu!*`
            };
        }

        try {
            await axios.post(
                `${serverConfig.domain}/api/application/servers/${id}/suspend`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${serverConfig.apikey}`,
                        Accept: 'Application/vnd.pterodactyl.v1+json'
                    },
                    timeout: 20000
                }
            );

            if (global.db?.cpanel?.servers?.[id]) {
                global.db.cpanel.servers[id].status = 'suspended';
            }

            return {
                success: true,
                message: `\`⌜ Suspend Server [${ver.toUpperCase()}] ⌟\`\n> ◦ Server ID : \`${id}\`\n> ◦ Status : *🔴 Berhasil Disuspend*`
            };
        } catch (err) {
            const rawMsg = err.response?.data?.errors?.[0]?.detail || err.message;
            return { success: false, message: `❌ Gagal suspend server ${id}: ${rawMsg}` };
        }
    },

    async unsuspendServer({ serverVersion, serverId, extendDays = 30, isBotOwner, senderJid }) {
        const ver = (serverVersion || 'v1').toLowerCase();
        if (!hasAccessToServer(senderJid, ver, isBotOwner)) {
            return { success: false, message: `❌ Kamu tidak memiliki akses ke Server ${ver.toUpperCase()}` };
        }
        const serverConfig = getServerConfig(ver);
        if (!serverConfig.domain || !serverConfig.apikey) {
            return { success: false, message: `❌ Server ${ver.toUpperCase()} belum disetting.` };
        }
        const id = parseInt(serverId);
        if (isNaN(id)) return { success: false, message: `❌ ID Server tidak valid. Contoh: \`.unsuspend${ver} 12,30\`` };

        const senderNum = cleanNumber(senderJid);
        const dbServer = global.db?.cpanel?.servers?.[id];

        if (!isBotOwner && dbServer && dbServer.creatorNum && dbServer.creatorNum !== senderNum) {
            return {
                success: false,
                message: `\`⌜ Access Denied ⌟\`\n> ◦ Status : *Ditolak*\n> ◦ Info : *Server ID ${id} bukan milik buyermu!*`
            };
        }

        try {
            await axios.post(
                `${serverConfig.domain}/api/application/servers/${id}/unsuspend`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${serverConfig.apikey}`,
                        Accept: 'Application/vnd.pterodactyl.v1+json'
                    },
                    timeout: 20000
                }
            );

            const durationDays = Math.max(1, parseInt(extendDays) || 30);
            const now = Date.now();
            const expiredAt = now + (durationDays * 86400000);
            const expiredStr = moment(expiredAt).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm');

            if (global.db?.cpanel?.servers?.[id]) {
                global.db.cpanel.servers[id].status = 'active';
                global.db.cpanel.servers[id].expiredAt = expiredAt;
            }

            return {
                success: true,
                message: `\`⌜ Unsuspend Server [${ver.toUpperCase()}] ⌟\`\n> ◦ Server ID : \`${id}\`\n> ◦ Status : *🟢 Berhasil Diaktifkan Kembali*\n> ◦ Masa Aktif : *+${durationDays} Hari* (Sampai ${expiredStr} WIB)`
            };
        } catch (err) {
            const rawMsg = err.response?.data?.errors?.[0]?.detail || err.message;
            return { success: false, message: `❌ Gagal unsuspend server ${id}: ${rawMsg}` };
        }
    },

    async checkExpiredServers(Dinz) {
        initCpanelDb();
        const now = Date.now();
        const servers = Object.values(global.db?.cpanel?.servers || {});

        for (const s of servers) {
            if (!s.id || !s.expiredAt || !s.serverVersion) continue;

            if (s.expiredAt <= now && s.status !== 'suspended' && s.status !== 'deleted') {
                const serverConfig = getServerConfig(s.serverVersion);
                if (!serverConfig.domain || !serverConfig.apikey) continue;
                try {
                    await axios.post(
                        `${serverConfig.domain}/api/application/servers/${s.id}/suspend`,
                        {},
                        {
                            headers: {
                                Authorization: `Bearer ${serverConfig.apikey}`,
                                Accept: 'Application/vnd.pterodactyl.v1+json'
                            },
                            timeout: 15000
                        }
                    );
                    s.status = 'suspended';
                    console.log(`[CPANEL CRON] Auto-suspended expired server: ${s.username} (ID: ${s.id}, ${s.serverVersion})`);

                    if (Dinz && s.targetNum) {
                        const targetJid = s.targetNum + '@s.whatsapp.net';
                        const notifTxt = `\`⌜ Peringatan Masa Aktif Panel ⌟\`\n> ◦ Server : *${s.serverVersion.toUpperCase()}*\n> ◦ Username : *${s.username}*\n> ◦ Server ID : *${s.id}*\n> ◦ Status : *🔴 Telah Disuspend (Masa Aktif Habis)*\n> ◦ Info : *Silakan hubungi seller/admin untuk perpanjang masa aktif server.*`;
                        try {
                            await Dinz.sendMessage(targetJid, { text: notifTxt });
                        } catch (_) {}
                    }
                } catch (err) {
                    const statusErr = err.response?.status;
                    if (statusErr === 404) {
                        s.status = 'deleted';
                        console.log(`[CPANEL CRON] Server ID ${s.id} not found on panel, marked as deleted.`);
                    } else if (statusErr === 400 || statusErr === 422) {
                        s.status = 'suspended';
                        console.log(`[CPANEL CRON] Server ID ${s.id} already suspended on panel.`);
                    } else {
                        console.error(`[CPANEL CRON] Failed to auto-suspend server ${s.id}:`, err.response?.data || err.message);
                    }
                }
            }
        }
    },

    setServerConfig({ serverVersion, configStr, isBotOwner }) {
        if (!isBotOwner) {
            return { success: false, message: `❌ Hanya Bot Owner yang dapat mengatur konfigurasi panel.` };
        }
        const ver = (serverVersion || 'v1').toLowerCase();
        if (!VALID_SERVERS.includes(ver)) {
            return { success: false, message: `❌ Versi server tidak valid. Pilihan: *v1*, *v2*, *v3*` };
        }

        const parts = (configStr || '').split(',').map(s => s.trim());
        const domain = parts[0];
        const apikey = parts[1];
        const egg = parts[2] || '15';
        const location = parts[3] || '1';

        if (!domain || !apikey) {
            return {
                success: false,
                message: `*FORMAT SET PTERO:*\n.setptero${ver} domain,apikey,egg,location\n\n*Contoh:*\n.setptero${ver} https://panel.example.com,ptla_xxxx,15,1`
            };
        }

        if (!global.db.settings) global.db.settings = {};
        if (!global.db.settings.pterodactyl) global.db.settings.pterodactyl = {};
        const serverKey = 'server' + ver.replace('v', '');
        global.db.settings.pterodactyl[serverKey] = {
            domain: domain.replace(/\/+$/, ''),
            apikey,
            egg,
            nestid: '5',
            location
        };

        return {
            success: true,
            message: `\`⌜ Set Pterodactyl ${ver.toUpperCase()} ⌟\`\n> ◦ Domain : *${domain}*\n> ◦ Egg ID : *${egg}*\n> ◦ Location : *${location}*\n> ◦ Status : *Berhasil Disimpan*`
        };
    }
};

module.exports = {
    CPANEL,
    sendPanelEmail,
    initCpanelDb
};
