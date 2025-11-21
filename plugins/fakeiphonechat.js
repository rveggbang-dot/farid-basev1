/**
 * Fake iPhone Chat Plugin untuk Baileys
 */

let sockRef = null;

async function init(sock, database) {
    sockRef = sock;
    console.log('✅ FakeIphoneChat plugin initialized for Baileys');
}

async function handleFakeIphoneChat(message, text) {
    if (!text) {
        await sockRef.sendMessage(message.key.remoteJid, { 
            text: `*🧩 Masukkan teks!*\n*Contoh: .iqc info kangg*` 
        });
        return;
    }

    try {
        await sockRef.sendMessage(message.key.remoteJid, {
            image: {
                url: `https://brat.siputzx.my.id/iphone-quoted?time=12.00&batteryPercentage=90&carrierName=AXIS&messageText=${encodeURIComponent(text)}&emojiStyle=apple`
            },
            caption: '*✨ iPhone chat berhasil dibuat*'
        });
    } catch (err) {
        console.error(err);
        await sockRef.sendMessage(message.key.remoteJid, { 
            text: '*🍂 Gagal membuat gambar. Coba lagi nanti.*' 
        });
    }
}

module.exports = {
    init,
    handleFakeIphoneChat
};