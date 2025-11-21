const { readdirSync } = require('fs');
const database = require('./database');

let plugins = new Map();

async function loadPlugins(sock) {
    try {
        const pluginFiles = readdirSync('./plugins').filter(file => 
            file.endsWith('.js') && !file.startsWith('_')
        );

        console.log(`📁 Loading ${pluginFiles.length} plugins...`);

        for (const file of pluginFiles) {
            try {
                delete require.cache[require.resolve(`../plugins/${file}`)];
                const pluginModule = require(`../plugins/${file}`);
                const pluginName = file.replace('.js', '');
                
                pluginModule.database = database;
                pluginModule.sock = sock;
                
                plugins.set(pluginName, pluginModule);
                
                if (typeof pluginModule.init === 'function') {
                    await pluginModule.init(sock, database);
                }
                
                console.log(`✅ Plugin loaded: ${pluginName}`);
            } catch (error) {
                console.error(`❌ Error loading plugin ${file}:`, error.message);
            }
        }
        
        console.log(`✅ Total ${plugins.size} plugins loaded`);
        return plugins;
    } catch (error) {
        console.error('❌ Error loading plugins:', error.message);
        return new Map();
    }
}

function getPlugins() {
    return plugins;
}

function getPlugin(name) {
    return plugins.get(name);
}

module.exports = {
    loadPlugins,
    getPlugins,
    getPlugin
};