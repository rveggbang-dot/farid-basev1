/**
 * Contoh Case dengan Database
 */

const { isOwner } = require('../config/setting.js');

module.exports.default = async function exampleCase(msg, body, from) {
    const command = body.toLowerCase().trim();
    
    switch (command) {
        case 'ping':
            await msg.reply('🏓 **Pong!**\nFarid Base is working!');
            return true;
            
        case 'menu':
        case '.menu':
            let menu = `
🤖 *FARID BASE MENU*

• ping - Test bot response
• menu - Show this menu
• time - Current time
• info - Bot information
• stats - User statistics

📱 *MAKER TOOLS*
• .iqc <teks> - Fake iPhone chat
• .fakeiphonechat <teks> - Fake iPhone chat
`;

            // Tambahkan owner menu jika user adalah owner
            if (isOwner(msg.from)) {
                menu += `
👑 *OWNER COMMANDS*
• .owner - Owner menu
• .settings - Bot settings
• .broadcast - Broadcast message
`;
            }

            menu += `\n🔧 _Powered by Farid Base Framework_`;

            await msg.reply(menu);
            return true;
            
        case 'time':
            const now = new Date();
            await msg.reply(`🕒 **Current Time:**\n${now.toLocaleString()}`);
            return true;
            
        case 'info':
            const chat = await msg.getChat();
            const contact = await msg.getContact();
            
            // Save user to database
            const userData = {
                userId: contact.id._serialized,
                name: contact.name || contact.pushname,
                number: contact.id.user,
                isGroup: chat.isGroup,
                groupId: chat.isGroup ? chat.id._serialized : null
            };
            
            await this.database.create('users', userData);
            
            const userCount = await this.database.count('users');
            const messageCount = await this.database.count('messages');
            
            await msg.reply(
                `🤖 **Farid Base Info**\n` +
                `📊 Users: ${userCount}\n` +
                `💬 Messages: ${messageCount}\n` +
                `👤 You: ${contact.name || contact.pushname}`
            );
            return true;
            
        case 'stats':
            const stats = await this.database.getStats();
            let statsText = '📊 **Bot Statistics**\n\n';
            
            for (const [table, count] of Object.entries(stats)) {
                statsText += `• ${table}: ${count}\n`;
            }
            
            await msg.reply(statsText);
            return true;
    }
    
    return false;
};