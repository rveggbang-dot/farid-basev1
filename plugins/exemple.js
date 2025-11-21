/**
 * Contoh Plugin dengan Database
 */

let clientRef = null;
let databaseRef = null;

export async function init(client, database) {
  clientRef = client;
  databaseRef = database;
  
  console.log('✅ Example Plugin initialized with database');
  
  // Auto welcome message dengan database
  clientRef.on('group_join', async (notification) => {
    try {
      const chat = await notification.getChat();
      const contact = await notification.getContact();
      
      // Log to database
      await databaseRef.create('groups', {
        groupId: chat.id._serialized,
        groupName: chat.name,
        event: 'member_joined',
        memberId: contact.id._serialized,
        memberName: contact.name || contact.pushname,
        timestamp: new Date().toISOString()
      });
      
      await clientRef.sendMessage(chat.id._serialized, 
        `👋 Welcome @${contact.id.user} to the group!\n\nPlease read the group rules.`,
        { mentions: [contact] }
      );
    } catch (error) {
      console.error('Error in welcome plugin:', error);
    }
  });
}

// Export functions yang bisa dipakai cases/plugins lain
export function getClient() {
  return clientRef;
}

export function getDatabase() {
  return databaseRef;
}