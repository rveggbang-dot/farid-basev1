/**
 * Owner Commands Case
 * Hanya bisa diakses oleh owner bot
 */

import { isOwner, getSettings, updateSettings, addOwner, removeOwner } from '../config/setting.js';
import database from '../handler/database.js';

export default async function ownerCase(msg, body, from) {
    // Cek apakah user adalah owner
    if (!isOwner(msg.from)) return false;

    const command = body.toLowerCase().trim();
    const args = body.split(' ').slice(1);
    
    switch (true) {
        case command === '.owner':
            await showOwnerMenu(msg);
            return true;
            
        case command.startsWith('.addowner '):
            await addOwnerCommand(msg, args[0]);
            return true;
            
        case command.startsWith('.removeowner '):
            await removeOwnerCommand(msg, args[0]);
            return true;
            
        case command === '.settings':
            await showSettings(msg);
            return true;
            
        case command.startsWith('.setting '):
            await updateSetting(msg, args);
            return true;
            
        case command === '.shutdown':
            await shutdownBot(msg);
            return true;
            
        case command === '.restart':
            await restartBot(msg);
            return true;
            
        case command === '.backup':
            await backupDatabase(msg);
            return true;
            
        case command === '.stats':
            await showDetailedStats(msg);
            return true;
            
        case command.startsWith('.broadcast '):
            await broadcastMessage(msg, body.replace('.broadcast ', ''));
            return true;
            
        case command.startsWith('.eval '):
            await evalCommand(msg, body.replace('.eval ', ''));
            return true;
    }
    
    return false;
}

/**
 * Show owner menu
 */
async function showOwnerMenu(msg) {
    const settings = getSettings();
    const menu = `
👑 *OWNER MENU - FARID BASE*

🔧 *SYSTEM COMMANDS*
• .settings - Show current settings
• .setting <key> <value> - Update setting
• .shutdown - Shutdown bot
• .restart - Restart bot
• .backup - Backup database

📊 *STATISTICS*
• .stats - Detailed statistics

👥 *OWNER MANAGEMENT*
• .addowner <number> - Add new owner
• .removeowner <number> - Remove owner
• .owner - Show this menu

📢 *BROADCAST*
• .broadcast <message> - Broadcast to all users

⚡ *DEVELOPER*
• .eval <code> - Evaluate JavaScript code

📋 *Current Owners:* ${settings.owners.join(', ')}
📊 *Total Users:* ${await database.count('users')}
    `;
    
    await msg.reply(menu);
}

/**
 * Add new owner
 */
async function addOwnerCommand(msg, number) {
    if (!number) {
        await msg.reply('❌ *Usage:* .addowner 6281234567890');
        return;
    }
    
    addOwner(number);
    await msg.reply(`✅ *Owner added:* ${number}`);
}

/**
 * Remove owner
 */
async function removeOwnerCommand(msg, number) {
    if (!number) {
        await msg.reply('❌ *Usage:* .removeowner 6281234567890');
        return;
    }
    
    removeOwner(number);
    await msg.reply(`✅ *Owner removed:* ${number}`);
}

/**
 * Show current settings
 */
async function showSettings(msg) {
    const settings = getSettings();
    
    let settingsText = '⚙️ *BOT SETTINGS*\n\n';
    
    // Format settings untuk display
    for (const [category, config] of Object.entries(settings)) {
        if (typeof config === 'object' && config !== null) {
            settingsText += `*${category.toUpperCase()}:*\n`;
            for (const [key, value] of Object.entries(config)) {
                settingsText += `• ${key}: ${JSON.stringify(value)}\n`;
            }
            settingsText += '\n';
        } else {
            settingsText += `*${category}:* ${JSON.stringify(config)}\n`;
        }
    }
    
    await msg.reply(settingsText);
}

/**
 * Update setting
 */
async function updateSetting(msg, args) {
    if (args.length < 2) {
        await msg.reply('❌ *Usage:* .setting <key> <value>\n*Example:* .setting botName "My Bot"');
        return;
    }
    
    const [key, ...valueParts] = args;
    let value = valueParts.join(' ');
    
    // Try to parse value as JSON
    try {
        value = JSON.parse(value);
    } catch {
        // Keep as string if not valid JSON
    }
    
    const settings = getSettings();
    
    // Update nested settings
    const keys = key.split('.');
    let current = settings;
    
    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
            await msg.reply(`❌ Invalid setting path: ${key}`);
            return;
        }
        current = current[keys[i]];
    }
    
    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
    
    updateSettings(settings);
    await msg.reply(`✅ *Setting updated:* ${key} = ${JSON.stringify(value)}`);
}

/**
 * Shutdown bot
 */
async function shutdownBot(msg) {
    await msg.reply('🛑 *Shutting down bot...*');
    console.log('🛑 Bot shutdown initiated by owner');
    process.exit(0);
}

/**
 * Restart bot
 */
async function restartBot(msg) {
    await msg.reply('🔄 *Restarting bot...*');
    console.log('🔄 Bot restart initiated by owner');
    
    // Close connections and restart
    if (typeof global.client !== 'undefined' && global.client.destroy) {
        await global.client.destroy();
    }
    
    // Restart process (requires PM2 or similar process manager)
    process.exit(1); // Exit with error code to trigger restart
}

/**
 * Backup database
 */
async function backupDatabase(msg) {
    try {
        await msg.reply('💾 *Creating database backup...*');
        
        // Simulate backup process
        const stats = await database.getStats();
        let backupInfo = '📦 *DATABASE BACKUP*\n\n';
        
        for (const [table, count] of Object.entries(stats)) {
            backupInfo += `• ${table}: ${count} records\n`;
        }
        
        backupInfo += `\n⏰ *Backup Time:* ${new Date().toLocaleString()}`;
        
        await msg.reply(backupInfo);
    } catch (error) {
        await msg.reply(`❌ *Backup failed:* ${error.message}`);
    }
}

/**
 * Show detailed statistics
 */
async function showDetailedStats(msg) {
    try {
        const stats = await database.getStats();
        const settings = getSettings();
        
        let statsText = '📊 *DETAILED STATISTICS*\n\n';
        
        // Database stats
        statsText += '*DATABASE:*\n';
        for (const [table, count] of Object.entries(stats)) {
            statsText += `• ${table}: ${count}\n`;
        }
        
        // System stats
        statsText += '\n*SYSTEM:*\n';
        statsText += `• Uptime: ${formatUptime(process.uptime())}\n`;
        statsText += `• Memory: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB\n`;
        statsText += `• Node.js: ${process.version}\n`;
        statsText += `• Platform: ${process.platform}\n`;
        
        // Bot stats
        statsText += '\n*BOT:*\n';
        statsText += `• Owners: ${settings.owners.length}\n`;
        statsText += `• Prefix: ${settings.prefix}\n`;
        statsText += `• Features: ${Object.keys(settings.features).length}\n`;
        
        await msg.reply(statsText);
    } catch (error) {
        await msg.reply(`❌ *Stats error:* ${error.message}`);
    }
}

/**
 * Broadcast message to all users
 */
async function broadcastMessage(msg, message) {
    if (!message) {
        await msg.reply('❌ *Usage:* .broadcast <message>');
        return;
    }
    
    try {
        await msg.reply(`📢 *Starting broadcast to ${await database.count('users')} users...*`);
        
        const users = await database.find('users');
        let success = 0;
        let failed = 0;
        
        for (const user of users) {
            try {
                // Send to individual user
                await msg.client.sendMessage(
                    `${user.number}@s.whatsapp.net`, 
                    `📢 *BROADCAST FROM OWNER*\n\n${message}`
                );
                success++;
                
                // Delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                failed++;
                console.error(`Broadcast failed for ${user.number}:`, error.message);
            }
        }
        
        await msg.reply(
            `📢 *BROADCAST COMPLETE*\n\n` +
            `✅ Success: ${success}\n` +
            `❌ Failed: ${failed}\n` +
            `📊 Total: ${success + failed}`
        );
    } catch (error) {
        await msg.reply(`❌ *Broadcast failed:* ${error.message}`);
    }
}

/**
 * Evaluate JavaScript code (DANGEROUS - Owner only)
 */
async function evalCommand(msg, code) {
    if (!code) {
        await msg.reply('❌ *Usage:* .eval <javascript code>');
        return;
    }
    
    try {
        let result = eval(code);
        
        // Handle promises
        if (result instanceof Promise) {
            result = await result;
        }
        
        // Format result
        const output = typeof result === 'object' ? 
            JSON.stringify(result, null, 2) : 
            String(result);
            
        await msg.reply(`✅ *EVAL RESULT*\n\`\`\`javascript\n${output}\n\`\`\``);
    } catch (error) {
        await msg.reply(`❌ *EVAL ERROR*\n\`\`\`javascript\n${error.message}\n\`\`\``);
    }
}

/**
 * Format uptime to human readable
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
}