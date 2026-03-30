'use strict';
const fs = require('fs').promises;
const path = require('path');
const { randomBytes } = require('crypto');

const DATA_DIR = process.env.BILLS_APP_DATA_DIR || path.join(__dirname, 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, '_accounts.json');

// ── File-based helpers ────────────────────────────────────────────────────────

async function readAccountsFile() {
  try {
    const raw = await fs.readFile(ACCOUNTS_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    return [];
  }
}

async function writeAccountsFile(accounts) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8');
}

// ── Firebase helpers ──────────────────────────────────────────────────────────

function accountsCollection(db) {
  return db.collection('_accounts');
}

// ── Public API ────────────────────────────────────────────────────────────────

async function findByEmail(email, db) {
  const emailNorm = email ? email.trim().toLowerCase() : '';
  if (!emailNorm) return null;
  if (db) {
    const snap = await accountsCollection(db).where('email', '==', emailNorm).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return Object.assign({ id: doc.id }, doc.data());
  }
  const accounts = await readAccountsFile();
  return accounts.find(function (a) { return a.email === emailNorm; }) || null;
}

async function findById(id, db) {
  if (!id) return null;
  if (db) {
    const doc = await accountsCollection(db).doc(String(id)).get();
    if (!doc.exists) return null;
    return Object.assign({ id: doc.id }, doc.data());
  }
  const accounts = await readAccountsFile();
  return accounts.find(function (a) { return a.id === id; }) || null;
}

async function createAccount(opts, db) {
  const emailNorm = opts.email.trim().toLowerCase();
  const id = 'local_' + randomBytes(12).toString('hex');
  const now = new Date().toISOString();
  const account = {
    id: id,
    email: emailNorm,
    name: opts.name || '',
    passwordHash: opts.passwordHash,
    createdAt: now,
    updatedAt: now,
    resetToken: null,
    resetTokenExpiry: null
  };
  if (db) {
    await accountsCollection(db).doc(id).set(account);
    return account;
  }
  const accounts = await readAccountsFile();
  accounts.push(account);
  await writeAccountsFile(accounts);
  return account;
}

async function updateAccount(id, updates, db) {
  const now = new Date().toISOString();
  const patch = Object.assign({}, updates, { updatedAt: now });
  if (db) {
    await accountsCollection(db).doc(String(id)).update(patch);
    return Object.assign({ id: id }, patch);
  }
  const accounts = await readAccountsFile();
  const idx = accounts.findIndex(function (a) { return a.id === id; });
  if (idx === -1) return null;
  accounts[idx] = Object.assign({}, accounts[idx], patch);
  await writeAccountsFile(accounts);
  return accounts[idx];
}

async function findByResetToken(token, db) {
  if (!token) return null;
  if (db) {
    const snap = await accountsCollection(db).where('resetToken', '==', token).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return Object.assign({ id: doc.id }, doc.data());
  }
  const accounts = await readAccountsFile();
  return accounts.find(function (a) { return a.resetToken === token; }) || null;
}

module.exports = { findByEmail, findById, createAccount, updateAccount, findByResetToken };
