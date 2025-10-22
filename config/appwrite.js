const { Client, Databases, Query } = require('node-appwrite');
require('dotenv').config();

let client = null;
let databases = null;

function initializeAppwrite() {
  if (!client) {
    client = new Client();
    client
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    
    databases = new Databases(client);
  }
  
  return { client, databases };
}

function getAppwriteClient() {
  if (!client) {
    initializeAppwrite();
  }
  return { client, databases };
}

async function testConnection() {
  try {
    const { databases } = getAppwriteClient();
    await databases.listDocuments(
      process.env.DATABASE_ID,
      process.env.COLLECTION_ID,
      [Query.limit(1)]
    );
    return { success: true, message: 'Connected to Appwrite successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = {
  initializeAppwrite,
  getAppwriteClient,
  testConnection,
  Query
};
