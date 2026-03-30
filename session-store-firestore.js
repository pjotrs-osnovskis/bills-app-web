/**
 * Minimal Firestore-backed session store for express-session.
 * Requires Firebase Admin to be initialised before use.
 * Sessions are stored under the 'sessions' collection.
 */

const { Store } = require('express-session');

const SESSION_COLLECTION = 'sessions';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

class FirestoreSessionStore extends Store {
  constructor(options) {
    super(options);
    this.db = options.db;
    this.ttlMs = options.ttlMs || DEFAULT_TTL_MS;
  }

  _col() {
    return this.db.collection(SESSION_COLLECTION);
  }

  get(sid, callback) {
    this._col().doc(sid).get()
      .then((snap) => {
        if (!snap.exists) return callback(null, null);
        const data = snap.data();
        if (data.expiresAt && data.expiresAt.toMillis && data.expiresAt.toMillis() < Date.now()) {
          return callback(null, null);
        }
        callback(null, data.session || null);
      })
      .catch((err) => callback(err));
  }

  set(sid, session, callback) {
    const expiresAt = new Date(Date.now() + this.ttlMs);
    const plainSession = JSON.parse(JSON.stringify(session));
    this._col().doc(sid).set({ session: plainSession, expiresAt })
      .then(() => callback(null))
      .catch((err) => callback(err));
  }

  destroy(sid, callback) {
    this._col().doc(sid).delete()
      .then(() => callback(null))
      .catch((err) => callback(err));
  }

  touch(sid, session, callback) {
    const expiresAt = new Date(Date.now() + this.ttlMs);
    const plainSession = JSON.parse(JSON.stringify(session));
    this._col().doc(sid).set({ session: plainSession, expiresAt })
      .then(() => callback(null))
      .catch((err) => callback(err));
  }
}

module.exports = FirestoreSessionStore;
