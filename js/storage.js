/* ============================================
   PolyChat IndexedDB Storage
   ============================================ */

const DB_NAME = 'polychat_db';
const DB_VERSION = 2; // Upgraded for memory store
const STORE_CHATS = 'chats';
const STORE_MEMORY = 'memory';

let db = null;

/**
 * Open / initialize the database.
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORE_CHATS)) {
        const store = database.createObjectStore(STORE_CHATS, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }
      
      if (!database.objectStoreNames.contains(STORE_MEMORY)) {
        database.createObjectStore(STORE_MEMORY, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Save a chat conversation.
 * @param {Object} chat - { id, title, messages[], model, task, createdAt, updatedAt }
 */
export async function saveChat(chat) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_CHATS, 'readwrite');
    const store = tx.objectStore(STORE_CHATS);

    chat.updatedAt = Date.now();
    if (!chat.createdAt) chat.createdAt = Date.now();

    const request = store.put(chat);
    request.onsuccess = () => resolve(chat);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Get a chat by ID.
 */
export async function getChat(chatId) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_CHATS, 'readonly');
    const store = tx.objectStore(STORE_CHATS);
    const request = store.get(chatId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Get all chats, sorted by most recently updated.
 */
export async function getAllChats() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_CHATS, 'readonly');
    const store = tx.objectStore(STORE_CHATS);
    const request = store.getAll();
    request.onsuccess = () => {
      const chats = request.result || [];
      chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      resolve(chats);
    };
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Delete a chat by ID.
 */
export async function deleteChat(chatId) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_CHATS, 'readwrite');
    const store = tx.objectStore(STORE_CHATS);
    const request = store.delete(chatId);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Delete all chats.
 */
export async function clearAllChats() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_CHATS, 'readwrite');
    const store = tx.objectStore(STORE_CHATS);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Generate a title from the first user message.
 */
export function generateTitle(messages) {
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser) return 'New Chat';
  const text = firstUser.content.trim();
  return text.length > 50 ? text.slice(0, 50) + '…' : text;
}

/* ============================================
   Summarised Memory Injection
   ============================================ */

/**
 * Call this when a conversation ends to extract facts.
 */
export async function summariseAndSave(messages) {
  if (!messages || messages.length < 2) return;

  const transcript = messages
    .filter(m => m.role === 'user' || (m.role === 'ai' || m.role === 'assistant'))
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  try {
    if (typeof puter === 'undefined' || !puter.ai) return;

    const res = await puter.ai.chat([
      {
        role: 'system',
        content: `You extract memory facts from conversations. 
Be concise. Output ONLY a JSON array of strings, no other text.
Example: ["User prefers Python over JS", "User is debugging a FastAPI app"]`
      },
      {
        role: 'user',
        content: `Extract 3-6 important facts about the user from this conversation:\n\n${transcript}`
      }
    ], { model: 'gpt-4o-mini' });

    let jsonStr = res;
    if (typeof res !== 'string' && res.message && res.message.content) {
      jsonStr = res.message.content; // fallback for different formats
    }
    
    // Attempt to extract array if wrapped in backticks
    const match = jsonStr.match(/\[([\s\S]*)\]/);
    if (match) jsonStr = `[${match[1]}]`;

    const newFacts = JSON.parse(jsonStr);
    if (Array.isArray(newFacts)) {
      await mergeMemory(newFacts);
    }
  } catch (e) {
    console.warn('Memory extraction failed:', e);
  }
}

/**
 * Merge new facts with existing.
 */
async function mergeMemory(newFacts) {
  const existing = await getMemory();
  const merged = [...new Set([...existing, ...newFacts])];
  const trimmed = merged.slice(-30);
  await saveMemory(trimmed);
}

/**
 * Save memory facts to IDB.
 */
function saveMemory(facts) {
  return new Promise(async (resolve, reject) => {
    const database = await openDB();
    const tx = database.transaction(STORE_MEMORY, 'readwrite');
    const request = tx.objectStore(STORE_MEMORY).put({ key: 'user_facts', facts });
    request.onsuccess = resolve;
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Get memory facts from IDB.
 */
export async function getMemory() {
  return new Promise(async (resolve) => {
    const database = await openDB();
    const tx = database.transaction(STORE_MEMORY, 'readonly');
    const request = tx.objectStore(STORE_MEMORY).get('user_facts');
    request.onsuccess = () => resolve(request.result?.facts ?? []);
    request.onerror = () => resolve([]); // return empty if fail
  });
}

/**
 * Build the system prompt block injected into chats
 */
export async function buildMemoryPrompt() {
  const facts = await getMemory();
  if (!facts || facts.length === 0) return '';
  return `[Memory about this user]\n${facts.map(f => `- ${f}`).join('\n')}\n`;
}

