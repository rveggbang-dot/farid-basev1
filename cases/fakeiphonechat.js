/**
 * Case handler untuk Fake iPhone Chat
 * Memproses command iqc dan fakeiphonechat
 */

const { handleFakeIphoneChat } = require('../plugins/fakeiphonechat.js');

module.exports.default = async function fakeIphoneCase(msg, body, from) {
    const command = body.toLowerCase().trim();
    
    // Cek apakah message mengandung command iqc atau fakeiphonechat
    if (command.startsWith('.iqc ') || command.startsWith('.fakeiphonechat ')) {
        const text = body.replace('.iqc', '').replace('.fakeiphonechat', '').trim();
        
        await handleFakeIphoneChat(msg, text);
        return true;
    }
    
    // Handle command tanpa prefix untuk menu, dll
    if (command === '.iqc' || command === '.fakeiphonechat') {
        await msg.reply(`* Fake iPhone Chat Maker*\n\n` +
                       `*Usage:* .iqc <teks>\n` +
                       `*Example:* .iqc Hello world!\n\n` +
                       `*Fitur:* Membuat screenshot chat iPhone dengan teks custom`);
        return true;
    }
    
    return false;
};