const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
let createCanvas, loadImage;
try { ({ createCanvas, loadImage } = require('canvas')); } catch (e) {}

async function getBratBuffer(text) {
    try {
        const encodedText = encodeURIComponent(text.trim());
        const res = await axios.get(`https://aqul-brat.hf.space/?text=${encodedText}`, {
            responseType: 'arraybuffer',
            timeout: 25000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (res.data && res.data.length > 500) return Buffer.from(res.data);
    } catch (e) {}

    try {
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;
        const res = await axios.get(`${baseUrl}/imagecreator/bratv?apikey=${apiKey}&text=${encodeURIComponent(text.trim())}`, {
            responseType: 'arraybuffer',
            timeout: 25000
        });
        if (res.data && res.data.length > 500) return Buffer.from(res.data);
    } catch (e2) {}

    return renderBratCanvas(text, '#ffffff', '#000000');
}

async function getBratVidBuffer(text) {
    try {
        const encodedText = encodeURIComponent(text.trim());
        const res = await axios.get(`https://brat.siputzx.my.id/mp4?text=${encodedText}`, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        if (res.data && res.data.length > 500) return Buffer.from(res.data);
    } catch (e) {}

    try {
        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;
        const res = await axios.get(`${baseUrl}/imagecreator/bratvid?apikey=${apiKey}&text=${encodeURIComponent(text.trim())}`, {
            responseType: 'arraybuffer',
            timeout: 35000
        });
        if (res.data && res.data.length > 500) return Buffer.from(res.data);
    } catch (e2) {}

    return null;
}

function renderBratCanvas(text, bgColor = '#ffffff', textColor = '#000000') {
    const width = 512;
    const height = 512;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    let fontSize = 84;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const startX = 40;
    const startY = 40;
    const maxWidth = width - (startX * 2);
    const maxHeight = height - (startY * 2);

    const words = String(text || '').split(' ');
    let lines = [];
    let line = '';

    for (let word of words) {
        let testLine = line + (line ? ' ' : '') + word;
        let testWidth = ctx.measureText(testLine).width;
        if (testWidth > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = testLine;
        }
    }
    if (line) lines.push(line);

    while (lines.length * fontSize * 1.1 > maxHeight && fontSize > 20) {
        fontSize -= 3;
        ctx.font = `bold ${fontSize}px Arial`;
        let tempLines = [];
        let tempLine = '';
        for (let word of words) {
            let testLine = tempLine + (tempLine ? ' ' : '') + word;
            let testWidth = ctx.measureText(testLine).width;
            if (testWidth > maxWidth && tempLine) {
                tempLines.push(tempLine);
                tempLine = word;
            } else {
                tempLine = testLine;
            }
        }
        if (tempLine) tempLines.push(tempLine);
        lines = tempLines;
    }

    const lineHeight = fontSize * 1.08;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 1.5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    lines.forEach((l, i) => {
        ctx.fillText(l, startX, startY + (i * lineHeight));
    });

    return canvas.toBuffer('image/png');
}

function renderBratHD(text, bgColor = '#ffffff', textColor = '#000000') {
    const width = 1024;
    const height = 1024;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    let fontSize = 168;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const startX = 80;
    const startY = 80;
    const maxWidth = width - (startX * 2);
    const maxHeight = height - (startY * 2);

    const words = String(text || '').split(' ');
    let lines = [];
    let line = '';

    for (let word of words) {
        let testLine = line + (line ? ' ' : '') + word;
        let testWidth = ctx.measureText(testLine).width;
        if (testWidth > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = testLine;
        }
    }
    if (line) lines.push(line);

    while (lines.length * fontSize * 1.1 > maxHeight && fontSize > 40) {
        fontSize -= 6;
        ctx.font = `bold ${fontSize}px Arial`;
        let tempLines = [];
        let tempLine = '';
        for (let word of words) {
            let testLine = tempLine + (tempLine ? ' ' : '') + word;
            let testWidth = ctx.measureText(testLine).width;
            if (testWidth > maxWidth && tempLine) {
                tempLines.push(tempLine);
                tempLine = word;
            } else {
                tempLine = testLine;
            }
        }
        if (tempLine) tempLines.push(tempLine);
        lines = tempLines;
    }

    const lineHeight = fontSize * 1.08;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    lines.forEach((l, i) => {
        ctx.fillText(l, startX, startY + (i * lineHeight));
    });

    return canvas.toBuffer('image/png');
}

async function renderBratGura(text) {
    const templateUrls = [
        'https://raw.githubusercontent.com/alifalfarel25-commits/dat4/main/uploads/alip-clutch-1770001033541.jpg',
        'https://files.catbox.moe/19c4n5.png'
    ];

    let buffer = null;
    for (const u of templateUrls) {
        try {
            const res = await axios.get(u, { responseType: 'arraybuffer', timeout: 15000 });
            if (res.data) {
                buffer = Buffer.from(res.data);
                break;
            }
        } catch (e) {}
    }

    if (!buffer) {
        return renderBratCanvas(text, '#e0f7fa', '#006064');
    }

    const img = await loadImage(buffer);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, img.width, img.height);

    const areaX = img.width * 0.56;
    const areaY = img.height * 0.28;
    const areaWidth = img.width * 0.36;
    const areaHeight = img.height * 0.32;

    let fontSize = img.height * 0.11;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const words = String(text || '').split(' ');
    let lines = [];
    let line = '';
    for (let word of words) {
        const testLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(testLine).width > areaWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = testLine;
        }
    }
    if (line) lines.push(line);

    while (lines.length * fontSize * 1.2 > areaHeight && fontSize > 14) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px Arial`;
    }

    const lineHeight = fontSize * 1.2;
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], areaX, areaY + i * lineHeight);
    }

    return canvas.toBuffer('image/png');
}

async function renderBratAnime(text) {
    try {
        const response = await axios.get('https://files.catbox.moe/19c4n5.png', {
            responseType: 'arraybuffer',
            timeout: 20000
        });
        const templateBuffer = Buffer.from(response.data);

        const img = await loadImage(templateBuffer);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0, img.width, img.height);

        const paperX = img.width * 0.285;
        const paperY = img.height * 0.42;
        const paperWidth = img.width * 0.30;
        const paperHeight = img.height * 0.28;

        let fontSize = Math.min(paperWidth / 5.5, paperHeight / 2.8);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = 'black';

        const maxWidth = paperWidth * 0.88;
        let words = String(text || '').split(' ');
        let lines = [];
        let line = '';

        for (let word of words) {
            let testLine = line + (line ? ' ' : '') + word;
            let testWidth = ctx.measureText(testLine).width;

            if (testWidth > maxWidth && line) {
                lines.push(line);
                line = word;
            } else {
                line = testLine;
            }
        }
        if (line) lines.push(line);

        while (lines.length * fontSize > paperHeight * 0.80 && fontSize > 10) {
            fontSize -= 1;
            ctx.font = `bold ${fontSize}px Arial`;

            let tempLines = [];
            let tempLine = '';
            for (let word of words) {
                let testLine = tempLine + (tempLine ? ' ' : '') + word;
                let testWidth = ctx.measureText(testLine).width;

                if (testWidth > maxWidth && tempLine) {
                    tempLines.push(tempLine);
                    tempLine = word;
                } else {
                    tempLine = testLine;
                }
            }
            if (tempLine) tempLines.push(tempLine);
            lines = tempLines;
        }

        let lineHeight = fontSize * 1.25;
        let textHeight = lines.length * lineHeight;
        let textStartY = paperY + (paperHeight - textHeight) / 2 + 268;

        ctx.save();
        ctx.translate(paperX + paperWidth / 2 + 300, textStartY + 12);
        ctx.rotate(0.06);
        ctx.textAlign = 'center';

        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], 0, i * lineHeight);
        }
        ctx.restore();

        return canvas.toBuffer('image/png');
    } catch (e) {
        console.error('renderBratAnime error:', e);
        return renderBratCanvas(text, '#ffffff', '#000000');
    }
}

module.exports = {
    getBratBuffer,
    getBratVidBuffer,
    renderBratCanvas,
    renderBratHD,
    renderBratGura,
    renderBratAnime
};
