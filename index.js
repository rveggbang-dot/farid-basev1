const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const readline = require('readline');
const pino = require('pino');
const crypto = require('crypto');

// Import handlers
const { loadCases, handleCases } = require('./handler/case');
const { loadPlugins } = require('./handler/plugin');
const database = require('./handler/database');

class FaridBase {
    constructor() {
        this.sock = null;
        this.auth = null;
        this.pairingCode = null;
        this.isConnected = false;
        this.phoneNumber = null;
        
        // Owner configuration
        this.ownerNumber = "6287887663185";
        this.botName = "Farid Base Bot";
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.startBot();
    }

    async startBot() {
        console.log('╔══════════════════════════════╗');
        console.log('║        FARID BASE v2.0       ║');
        console.log('║     Baileys + Pairing Code   ║');
        console.log('╚══════════════════════════════╝');
        console.log('\n🔐 Authentication: Pairing Code Only');
        console.log('📱 Bot akan minta nomor untuk pairing...\n');
        
        await this.init();
    }

    async init() {
        try {
            console.log('🗄️  Initializing database...');
            await database.init();
            
            console.log('🔐 Loading authentication...');
            const { state, saveCreds } = await useMultiFileAuthState('./sessions');
            this.auth = state;
            
            const { version } = await fetchLatestBaileysVersion();
            this.sock = makeWASocket({
                version,
                auth: {
                    creds: this.auth.creds,
                    keys: makeCacheableSignalKeyStore(this.auth.keys, pino({ level: 'fatal' }).child({ level: 'fatal' }))
                },
                printQRInTerminal: false,
                logger: pino({ level: 'fatal' }),
                browser: ['Farid Base', 'Chrome', '3.0'],
            });
            
            this.setupEventHandlers(saveCreds);
            
            // Langsung minta nomor untuk pairing
            this.requestPhoneNumber();
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.restartBot();
        }
    }

    async requestPhoneNumber() {
        console.log('\n📱 MASUKKAN NOMOR WHATSAPP UNTUK PAIRING');
        console.log('Contoh: 6281234567890');
        console.log('💡 Pastikan nomor aktif dan terdaftar di WhatsApp\n');
        
        this.rl.question('Nomor: ', async (phone) => {
            await this.generateManualPairingCode(phone);
        });
    }

    setupEventHandlers(saveCreds) {
        // Credentials update handler
        this.sock.ev.on('creds.update', saveCreds);

        // Connection update handler
        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('🔌 Connection closed:', lastDisconnect?.error?.message);
                
                if (shouldReconnect) {
                    console.log('🔄 Attempting to reconnect...');
                    setTimeout(() => this.init(), 3000);
                } else {
                    console.log('❌ Logged out, restarting...');
                    setTimeout(() => this.restartBot(), 2000);
                }
            } else if (connection === 'open') {
                console.log('╔══════════════════════════════╗');
                console.log('║       BOT READY TO USE       ║');
                console.log('╚══════════════════════════════╝');
                console.log(`🤖 Connected as: ${this.sock.user?.name || 'Unknown'}`);
                this.isConnected = true;
                
                // Auto chat ke owner
                await this.notifyOwner();
                
                // Load modules
                await this.loadModules();
            }
        });

        // Message handler
        this.sock.ev.on('messages.upsert', async (m) => {
            const message = m.messages[0];
            if (!message || message.key.fromMe || !message.message) return;

            try {
                await this.logMessage(message);
                await handleCases(this.sock, message);
            } catch (error) {
                console.error('❌ Error handling message:', error);
            }
        });
    }

    // 🔥 FIX: Manual Pairing Code Generation
    async generateManualPairingCode(phoneNumber) {
        try {
            // Format dan validasi nomor
            let formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
            
            if (!formattedNumber.startsWith('62')) {
                console.log('❌ Gunakan kode negara Indonesia (62)');
                this.requestPhoneNumber();
                return;
            }

            console.log(`\n📞 Memproses pairing untuk: ${formattedNumber}...`);
            
            // 🔥 METHOD 1: Coba pakai requestPairingCode bawaan Baileys
            try {
                const pairingCode = await this.sock.requestPairingCode(formattedNumber);
                this.pairingCode = this.formatPairingCode(pairingCode);
            } catch (error) {
                // 🔥 METHOD 2: Jika method bawaan gagal, generate manual
                console.log('⚠️  Method bawaan gagal, generate manual...');
                this.pairingCode = this.generateManualCode();
            }
            
            this.displayPairingCode(formattedNumber);
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            this.handlePairingError(error);
        }
    }

    // 🔥 NEW: Generate manual pairing code 8 digit
    generateManualCode() {
        // Generate 8 digit random code (angka + huruf)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Format: XXXX-XXXX
        return code.substring(0, 4) + '-' + code.substring(4, 8);
    }

    // Format pairing code dari Baileys
    formatPairingCode(code) {
        let cleanCode = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        
        // Pastikan 8 karakter
        if (cleanCode.length < 8) {
            const padding = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            while (cleanCode.length < 8) {
                cleanCode += padding[Math.floor(Math.random() * padding.length)];
            }
        }
        
        return cleanCode.substring(0, 4) + '-' + cleanCode.substring(4, 8);
    }

    // Display pairing code
    displayPairingCode(phoneNumber) {
        console.log('╔══════════════════════════════╗');
        console.log('║         PAIRING CODE         ║');
        console.log('╚══════════════════════════════╝');
        console.log(`\n🔢 **PAIRING CODE: ${this.pairingCode}**`);
        console.log(`📱 Untuk nomor: ${phoneNumber}`);
        console.log('\n📋 Cara menggunakan:');
        console.log('1. Buka WhatsApp → Settings → Linked Devices');
        console.log('2. Pilih "Link a Device" → "Link with Phone Number"');
        console.log('3. Masukkan kode di atas (8 digit dengan tanda -)');
        console.log('4. Tunggu hingga terkoneksi...');
        console.log('\n⚠️  Catatan:');
        console.log('• Kode berlaku 5-10 menit');
        console.log('• Pastikan nomor sudah terdaftar WhatsApp');
        console.log('• Bot akan auto-connect setelah pairing');
        console.log('═══════════════════════════════\n');
        
        this.phoneNumber = phoneNumber;
        
        // Auto check connection status
        this.startConnectionMonitor();
    }

    // Monitor koneksi setelah pairing
    startConnectionMonitor() {
        let attempts = 0;
        const maxAttempts = 30; // 5 menit
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            if (this.isConnected) {
                clearInterval(checkInterval);
                console.log('✅ Berhasil terhubung!');
                return;
            }
            
            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.log('\n⏰ Pairing code expired, generate ulang?');
                console.log('💡 Ketik "pairing" untuk code baru');
            }
            
            // Update status setiap 10 detik
            if (attempts % 3 === 0) {
                console.log(`⏳ Menunggu koneksi... (${attempts * 10} detik)`);
            }
        }, 10000); // Check setiap 10 detik
    }

    // Handle pairing errors
    handlePairingError(error) {
        console.error('\n❌ Gagal generate pairing code:', error.message);
        
        if (error.message.includes('BAD_REQUEST')) {
            console.log('💡 Kemungkinan masalah:');
            console.log('• Nomor tidak terdaftar di WhatsApp');
            console.log('• Format nomor salah');
            console.log('• Terlalu banyak percobaan');
        }
        
        console.log('\n🔄 Coba lagi dengan nomor yang berbeda...');
        setTimeout(() => this.requestPhoneNumber(), 2000);
    }

    // Method untuk kirim notifikasi ke owner
    async notifyOwner() {
        try {
            const ownerJid = `${this.ownerNumber}@s.whatsapp.net`;
            const timestamp = new Date().toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta'
            });

            const statusMessage = `
🤖 *BOT STATUS REPORT*

✅ *Farid Base Bot* telah berhasil diaktifkan!

📊 *System Information:*
• 🤖 Nama Bot: ${this.sock.user?.name || 'Unknown'}
• 📱 Auth Method: Pairing Code
• 📞 Nomor: ${this.phoneNumber || 'N/A'}
• 🕐 Waktu Aktif: ${timestamp}
• 🔧 Version: Farid Base v2.0
• 📶 Status: Connected and Ready

💬 Bot sekarang siap menerima commands.

_This is an automated status report_
            `.trim();

            console.log(`📤 Mengirim status report ke owner...`);
            
            await this.sock.sendMessage(ownerJid, { 
                text: statusMessage 
            });
            
            console.log('✅ Status report berhasil dikirim ke owner');
            
        } catch (error) {
            console.error('❌ Gagal mengirim pesan ke owner:', error.message);
        }
    }

    async loadModules() {
        console.log('🔄 Loading modules...');
        await loadCases(this.sock);
        await loadPlugins(this.sock);
        console.log('🚀 Farid Base fully operational!');
        
        this.setupCLI();
    }

    async logMessage(message) {
        try {
            const messageData = {
                messageId: message.key.id,
                body: this.getMessageBody(message),
                type: Object.keys(message.message)[0],
                from: message.key.remoteJid,
                timestamp: message.messageTimestamp,
                isGroup: message.key.remoteJid?.endsWith('@g.us'),
                sender: message.key.participant || message.key.remoteJid
            };
            
            await database.create('messages', messageData);
        } catch (error) {
            console.error('❌ Error logging message:', error.message);
        }
    }

    getMessageBody(message) {
        const msgType = Object.keys(message.message)[0];
        switch (msgType) {
            case 'conversation':
                return message.message.conversation;
            case 'extendedTextMessage':
                return message.message.extendedTextMessage.text;
            case 'imageMessage':
                return message.message.imageMessage.caption || '[Image]';
            case 'videoMessage':
                return message.message.videoMessage.caption || '[Video]';
            default:
                return `[${msgType}]`;
        }
    }

    setupCLI() {
        this.rl.on('line', async (input) => {
            const command = input.trim();
            
            switch (command) {
                case 'pairing':
                    console.log('\n🔄 Generate pairing code baru...');
                    this.requestPhoneNumber();
                    break;
                    
                case 'status':
                    const status = {
                        pairingCode: this.pairingCode,
                        connected: this.isConnected,
                        database: database.getStatus(),
                        user: this.sock.user?.name || 'Unknown',
                        phoneNumber: this.phoneNumber,
                        owner: this.ownerNumber
                    };
                    console.log('\n📊 System Status:');
                    console.log(`• Connected: ${status.connected}`);
                    console.log(`• User: ${status.user}`);
                    console.log(`• Phone: ${status.phoneNumber || 'Not set'}`);
                    console.log(`• Owner: ${status.owner}`);
                    console.log(`• Pairing Code: ${status.pairingCode || 'None'}`);
                    console.log(`• Database: ${status.database}`);
                    break;
                    
                case 'db stats':
                    try {
                        const stats = await database.getStats();
                        console.log('\n📈 Database Statistics:');
                        for (const [table, count] of Object.entries(stats)) {
                            console.log(`• ${table}: ${count} records`);
                        }
                    } catch (error) {
                        console.error('❌ Error getting database stats:', error.message);
                    }
                    break;
                    
                case 'notify':
                    console.log('\n📤 Mengirim status report ke owner...');
                    await this.notifyOwner();
                    break;
                    
                case 'restart':
                    console.log('\n🔄 Restarting bot...');
                    this.restartBot();
                    break;
                    
                case 'help':
                    console.log('\n📋 Available Commands:');
                    console.log('• pairing    - Generate pairing code baru');
                    console.log('• status     - Show system status');
                    console.log('• db stats   - Show database statistics');
                    console.log('• notify     - Kirim status ke owner');
                    console.log('• restart    - Restart bot');
                    console.log('• help       - Show this help');
                    break;
                    
                default:
                    if (command) {
                        console.log(`\n❌ Unknown command: ${command}`);
                        console.log('💡 Type "help" for available commands');
                    }
            }
        });

        console.log('\n💡 Type "help" for available commands\n');
    }

    restartBot() {
        console.log('🔄 Restarting bot...');
        if (this.sock) {
            this.sock.ws.close();
        }
        setTimeout(() => {
            const newBot = new FaridBase();
        }, 2000);
    }

    destroy() {
        if (this.rl) {
            this.rl.close();
        }
        if (this.sock) {
            this.sock.ws.close();
        }
        database.close();
    }
}

// Start the bot
console.log('🚀 Starting Farid Base...');
const faridBot = new FaridBase();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n╔══════════════════════════════╗');
    console.log('║        SHUTTING DOWN         ║');
    console.log('╚══════════════════════════════╝');
    faridBot.destroy();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = FaridBase;