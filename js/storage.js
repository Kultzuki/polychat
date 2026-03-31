/* ============================================
   PolyChat IndexedDB Storage
   ============================================ */

const DB_NAME = 'polychat_db';
const DB_VERSION = 1;
const STORE_CHATS = 'chats';

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
