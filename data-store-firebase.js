const admin = require('firebase-admin');
const path = require('path');

let db = null;

function loadServiceAccount() {
  // Priority 1: inline JSON string via env var (recommended for production)
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) {
    try {
      return JSON.parse(jsonEnv);
    } catch (e) {
      console.warn('FIREBASE_SERVICE_ACCOUNT_JSON is set but could not be parsed:', e.message);
      return null;
    }
  }
  // Priority 2: path to a local file (local dev)
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!keyPath) return null;
  try {
    const resolved = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);
    return require(resolved);
  } catch (e) {
    console.warn('Firebase service account file could not be loaded:', e.message);
    return null;
  }
}

function getDb() {
  if (db !== null && db !== undefined) return db;
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    db = null;
    return null;
  }
  try {
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
    return db;
  } catch (e) {
    console.warn('Firebase init failed:', e.message);
    db = null;
    return null;
  }
}

async function read(userId, name) {
  const firestore = getDb();
  if (!firestore) {
    const defaultVal = name === 'settings' ? {} : [];
    return defaultVal;
  }
  const ref = firestore.collection('users').doc(String(userId)).collection('data').doc(name);
  const snap = await ref.get();
  if (!snap.exists) {
    return name === 'settings' ? {} : [];
  }
  const data = snap.data();
  if (name === 'settings') return data.settings != null ? data.settings : {};
  return Array.isArray(data.items) ? data.items : [];
}

async function write(userId, name, data) {
  const firestore = getDb();
  if (!firestore) return;
  const ref = firestore.collection('users').doc(String(userId)).collection('data').doc(name);
  if (name === 'settings') {
    await ref.set({ settings: data });
  } else {
    await ref.set({ items: Array.isArray(data) ? data : [] });
  }
}

module.exports = { getDb, read, write };
