const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { join, dirname } = require('path');

class Database {
  constructor() {
    this.connected = false;
    this.dataPath = './database/data';
    this.configPath = './config/database.json';
    this.data = {};
    this.config = {};
  }

  async init() {
    try {
      // Load configuration
      await this.loadConfig();
      
      // Create database directory if not exists
      if (!existsSync(this.dataPath)) {
        mkdirSync(this.dataPath, { recursive: true });
      }
      
      // Load existing data
      await this.loadData();
      
      this.connected = true;
      console.log('✅ Database initialized');
      
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      throw error;
    }
  }

  async loadConfig() {
    try {
      if (existsSync(this.configPath)) {
        const configData = readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
      } else {
        // Default configuration
        this.config = {
          driver: 'json',
          path: this.dataPath,
          tables: ['users', 'chats', 'messages', 'groups']
        };
        
        // Create config directory if not exists
        const configDir = dirname(this.configPath);
        if (!existsSync(configDir)) {
          mkdirSync(configDir, { recursive: true });
        }
        
        // Save default config
        this.saveConfig();
      }
    } catch (error) {
      throw new Error(`Config loading failed: ${error.message}`);
    }
  }

  saveConfig() {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('❌ Error saving config:', error.message);
    }
  }

  async loadData() {
    try {
      const tables = this.config.tables || [];
      
      for (const table of tables) {
        const filePath = join(this.dataPath, `${table}.json`);
        
        if (existsSync(filePath)) {
          const fileData = readFileSync(filePath, 'utf8');
          this.data[table] = JSON.parse(fileData);
        } else {
          this.data[table] = [];
          this.saveTable(table);
        }
      }
    } catch (error) {
      throw new Error(`Data loading failed: ${error.message}`);
    }
  }

  saveTable(table) {
    try {
      const filePath = join(this.dataPath, `${table}.json`);
      writeFileSync(filePath, JSON.stringify(this.data[table] || [], null, 2));
    } catch (error) {
      console.error(`❌ Error saving table ${table}:`, error.message);
    }
  }

  // CRUD Operations
  async create(table, data) {
    if (!this.data[table]) {
      this.data[table] = [];
    }
    
    const record = {
      id: this.generateId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.data[table].push(record);
    this.saveTable(table);
    
    return record;
  }

  async find(table, query = {}) {
    if (!this.data[table]) return [];
    
    return this.data[table].filter(record => {
      for (const [key, value] of Object.entries(query)) {
        if (record[key] !== value) return false;
      }
      return true;
    });
  }

  async findOne(table, query = {}) {
    const results = await this.find(table, query);
    return results[0] || null;
  }

  async findById(table, id) {
    if (!this.data[table]) return null;
    
    return this.data[table].find(record => record.id === id) || null;
  }

  async update(table, id, data) {
    if (!this.data[table]) return null;
    
    const index = this.data[table].findIndex(record => record.id === id);
    if (index === -1) return null;
    
    const updatedRecord = {
      ...this.data[table][index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    this.data[table][index] = updatedRecord;
    this.saveTable(table);
    
    return updatedRecord;
  }

  async delete(table, id) {
    if (!this.data[table]) return false;
    
    const index = this.data[table].findIndex(record => record.id === id);
    if (index === -1) return false;
    
    this.data[table].splice(index, 1);
    this.saveTable(table);
    
    return true;
  }

  async count(table, query = {}) {
    const results = await this.find(table, query);
    return results.length;
  }

  // Utility methods
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getStatus() {
    return this.connected ? 'Connected' : 'Disconnected';
  }

  async getStats() {
    const stats = {};
    
    for (const table of Object.keys(this.data)) {
      stats[table] = this.data[table].length;
    }
    
    return stats;
  }

  close() {
    this.connected = false;
    console.log('✅ Database connections closed');
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;