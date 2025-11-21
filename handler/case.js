const { readdirSync } = require('fs');
const database = require('./database');

let cases = new Map();

async function loadCases(sock) {
    try {
        const caseFiles = readdirSync('./cases').filter(file => 
            file.endsWith('.js') && !file.startsWith('_')
        );

        console.log(`📁 Loading ${caseFiles.length} cases...`);

        for (const file of caseFiles) {
            try {
                delete require.cache[require.resolve(`../cases/${file}`)];
                const caseModule = require(`../cases/${file}`);
                const caseName = file.replace('.js', '');
                
                caseModule.database = database;
                caseModule.sock = sock;
                
                cases.set(caseName, caseModule);
                console.log(`✅ Case loaded: ${caseName}`);
            } catch (error) {
                console.error(`❌ Error loading case ${file}:`, error.message);
            }
        }
        
        console.log(`✅ Total ${cases.size} cases loaded`);
        return cases;
    } catch (error) {
        console.error('❌ Error loading cases:', error.message);
        return new Map();
    }
}

async function handleCases(sock, message) {
    const body = getMessageBody(message);
    const from = message.key.remoteJid;
    
    for (const [caseName, caseModule] of cases) {
        try {
            if (typeof caseModule.default === 'function') {
                const shouldStop = await caseModule.default(sock, message, body, from);
                if (shouldStop) break;
            }
        } catch (error) {
            console.error(`❌ Error in case ${caseName}:`, error.message);
        }
    }
}

function getMessageBody(message) {
    const msgType = Object.keys(message.message)[0];
    switch (msgType) {
        case 'conversation':
            return message.message.conversation;
        case 'extendedTextMessage':
            return message.message.extendedTextMessage.text;
        case 'imageMessage':
            return message.message.imageMessage.caption || '';
        case 'videoMessage':
            return message.message.videoMessage.caption || '';
        default:
            return '';
    }
}

function getCases() {
    return cases;
}

module.exports = {
    loadCases,
    handleCases,
    getCases
};