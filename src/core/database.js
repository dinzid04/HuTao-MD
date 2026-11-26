require('../../settings');
const fs = require('fs');
const chalk = require('chalk');
const botCtx = require('./context');

class DataBase {
    getFile = () => {
        return botCtx.getDatabasePath();
    }

    getMode = () => {
        return botCtx.getStorageMode();
    }

    read = async () => {
        if (botCtx.isJadibotContext()) {
            return botCtx.getJadibotMemoryDb(botCtx.getJadibotNumber());
        }
        const res = await botCtx.initStorage();
        return res.data;
    }

    write = async (data, force = false) => {
        if (botCtx.isJadibotContext()) {
            botCtx.setJadibotMemoryDb(botCtx.getJadibotNumber(), data || global.db);
            return botCtx.flushStorage(force);
        }
        if (data) {
            botCtx.setJadibotMemoryDb(null, data);
        }
        return botCtx.flushStorage(force);
    }
}

module.exports = DataBase;

let file = require.resolve(__filename);
fs.unwatchFile(file);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});
