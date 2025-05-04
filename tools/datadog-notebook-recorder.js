#!/usr/bin/env node

/**
 * Datadog Notebook Recorder
 * 
 * This script captures AI Tools Lab conversations and records them to Datadog notebooks
 * for documentation, sharing, and future reference.
 */

const fs = require('fs');
const path = require('path');
const { client, v1 } = require('@datadog/datadog-api-client');

// Initialize the Datadog client
const configuration = client.Configuration.instance;

// Configure API key authorization
const DD_API_KEY = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
const DD_APP_KEY = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;

if (!DD_API_KEY || !DD_APP_KEY) {
  console.error('Error: Datadog API key and application key are required.');
  console.error('Please set DD_API_KEY and DD_APP_KEY environment variables.');
  process.exit(1);
}

// Set API keys
configuration.authMethods.apiKeyAuth = { apiKey: DD_API_KEY };
configuration.authMethods.appKeyAuth = { apiKey: DD_APP_KEY };

// Create API instance
const apiInstance = new v1.NotebooksApi();

/**
 * Create a new Datadog notebook with the conversation content
 * @param {string} title - Title of the notebook
 * @param {string} content - Markdown content of the conversation
 * @param {Array} tags - Array of tags to apply to the notebook
 * @returns {Promise} - Promise with the notebook response
 */
async function createNotebook(title, content, tags = []) {
  const timestamp = Math.floor(Date.now() / 1000);
  const cells = [
    {
      type: 'markdown',
      content: content
    }
  ];

  const notebookData = {
    data: {
      attributes: {
        name: title,
        time: { live_span: '1h' },
        cells: cells
      },
      type: 'notebooks'
    }
  };

  if (tags && tags.length > 0) {
    notebookData.data.attributes.tags = tags;
  }

  try {
    const response = await apiInstance.createNotebook({ body: notebookData });
    console.log(`Notebook created with ID: ${response.data.id}`);
    return response;
  } catch (error) {
    console.error('Error creating notebook:', error.message);
    console.error('Error details:', JSON.stringify(error.response?.data || {}, null, 2));
    throw error;
  }
}

/**
 * Update an existing Datadog notebook with new content
 * @param {string} notebookId - ID of the notebook to update
 * @param {string} title - New title of the notebook
 * @param {string} content - New markdown content of the conversation
 * @param {Array} tags - Array of tags to apply to the notebook
 * @returns {Promise} - Promise with the notebook response
 */
async function updateNotebook(notebookId, title, content, tags = []) {
  const timestamp = Math.floor(Date.now() / 1000);
  const cells = [
    {
      type: 'markdown',
      content: content
    }
  ];

  const notebookData = {
    data: {
      attributes: {
        name: title,
        time: { live_span: '1h' },
        cells: cells
      },
      type: 'notebooks',
      id: notebookId
    }
  };

  if (tags && tags.length > 0) {
    notebookData.data.attributes.tags = tags;
  }

  try {
    const response = await apiInstance.updateNotebook({
      notebookId: notebookId,
      body: notebookData
    });
    console.log(`Notebook updated with ID: ${response.data.id}`);
    return response;
  } catch (error) {
    console.error('Error updating notebook:', error.message);
    console.error('Error details:', JSON.stringify(error.response?.data || {}, null, 2));
    throw error;
  }
}

/**
 * Format a conversation into a markdown document for Datadog notebooks
 * @param {Object} conversation - Conversation object with messages
 * @returns {string} - Formatted markdown content
 */
function formatConversationToMarkdown(conversation) {
  let markdown = `# AI Tools Lab Conversation: ${conversation.title}\n\n`;
  markdown += `*Recorded on: ${new Date().toISOString()}*\n\n`;
  markdown += `## Summary\n${conversation.summary || 'No summary available'}\n\n`;
  markdown += `## Conversation\n\n`;

  if (conversation.messages && conversation.messages.length > 0) {
    conversation.messages.forEach(msg => {
      const role = msg.role === 'user' ? '👤 User' : '🤖 AI Assistant';
      markdown += `### ${role}\n\n${msg.content}\n\n---\n\n`;
    });
  } else {
    markdown += "No messages in this conversation.\n\n";
  }

  markdown += `## Tags\n\n`;
  if (conversation.tags && conversation.tags.length > 0) {
    conversation.tags.forEach(tag => {
      markdown += `- ${tag}\n`;
    });
  }

  return markdown;
}

/**
 * Main function to process a conversation file and create/update a notebook
 * @param {string} conversationFilePath - Path to the conversation JSON file
 * @returns {Promise} - Promise resolved when the notebook is created/updated
 */
async function processConversation(conversationFilePath) {
  try {
    // Read and parse the conversation file
    const conversationData = JSON.parse(fs.readFileSync(conversationFilePath, 'utf8'));
    
    // Format the conversation as markdown
    const markdown = formatConversationToMarkdown(conversationData);
    
    // Create default tags
    const tags = [
      'ai-tools-lab',
      'conversation',
      'terraform',
      'cascade',
      ...(conversationData.tags || [])
    ];
    
    // Create a title for the notebook
    const title = conversationData.title || 
      `AI Tools Lab Conversation - ${new Date().toLocaleDateString()}`;
    
    // Create or update the notebook
    if (conversationData.notebookId) {
      return await updateNotebook(conversationData.notebookId, title, markdown, tags);
    } else {
      const response = await createNotebook(title, markdown, tags);
      
      // Update the conversation file with the notebook ID for future updates
      conversationData.notebookId = response.data.id;
      fs.writeFileSync(conversationFilePath, JSON.stringify(conversationData, null, 2));
      
      return response;
    }
  } catch (error) {
    console.error(`Error processing conversation file ${conversationFilePath}:`, error);
    throw error;
  }
}

/**
 * Create a new conversation record
 * @param {string} title - Title of the conversation
 * @param {string} summary - Summary of the conversation topic
 * @param {Array} tags - Additional tags to apply
 * @returns {string} - Path to the created conversation file
 */
function initializeConversation(title, summary, tags = []) {
  const timestamp = Date.now();
  const conversationData = {
    id: `conv-${timestamp}`,
    title: title,
    summary: summary,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    tags: tags
  };
  
  const filename = `conversation-${timestamp}.json`;
  const filePath = path.join(__dirname, '../data/conversations', filename);
  
  // Ensure the directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, JSON.stringify(conversationData, null, 2));
  console.log(`Initialized new conversation at: ${filePath}`);
  return filePath;
}

/**
 * Add a message to an existing conversation
 * @param {string} conversationFilePath - Path to the conversation file
 * @param {string} role - Role of the message sender ('user' or 'assistant')
 * @param {string} content - Content of the message
 * @returns {string} - Path to the updated conversation file
 */
function addMessage(conversationFilePath, role, content) {
  const conversationData = JSON.parse(fs.readFileSync(conversationFilePath, 'utf8'));
  
  conversationData.messages.push({
    id: `msg-${Date.now()}`,
    role: role,
    content: content,
    timestamp: new Date().toISOString()
  });
  
  conversationData.updatedAt = new Date().toISOString();
  
  fs.writeFileSync(conversationFilePath, JSON.stringify(conversationData, null, 2));
  console.log(`Added ${role} message to conversation: ${conversationFilePath}`);
  return conversationFilePath;
}

/**
 * Synchronize a conversation to Datadog notebook
 * @param {string} conversationFilePath - Path to the conversation file
 * @returns {Promise} - Promise resolved when the notebook is synchronized
 */
async function syncToDatadog(conversationFilePath) {
  try {
    const result = await processConversation(conversationFilePath);
    console.log(`Conversation synchronized to Datadog notebook: ${result.data.id}`);
    return result;
  } catch (error) {
    console.error('Error synchronizing to Datadog:', error);
    throw error;
  }
}

// Export the main functions for use in other modules
module.exports = {
  initializeConversation,
  addMessage,
  syncToDatadog,
  processConversation
};

// If script is run directly, provide CLI functionality
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch(command) {
    case 'init':
      if (args.length < 3) {
        console.error('Usage: node datadog-notebook-recorder.js init "Title" "Summary" [tag1,tag2,...]');
        process.exit(1);
      }
      const title = args[1];
      const summary = args[2];
      const tags = args[3] ? args[3].split(',') : [];
      initializeConversation(title, summary, tags);
      break;
      
    case 'add':
      if (args.length < 4) {
        console.error('Usage: node datadog-notebook-recorder.js add conversation-file.json "user|assistant" "message content"');
        process.exit(1);
      }
      const filePath = args[1];
      const role = args[2];
      const content = args[3];
      addMessage(filePath, role, content);
      break;
      
    case 'sync':
      if (args.length < 2) {
        console.error('Usage: node datadog-notebook-recorder.js sync conversation-file.json');
        process.exit(1);
      }
      syncToDatadog(args[1]);
      break;
      
    default:
      console.error('Unknown command. Available commands: init, add, sync');
      process.exit(1);
  }
}
