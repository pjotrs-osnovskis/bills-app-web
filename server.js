require('dotenv').config();
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const https = require('https');
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const firebaseStore = require('./data-store-firebase');
const fileStore = require('./data-store-file');
const FirestoreSessionStore = require('./session-store-firestore');

function getStore() {
  return firebaseStore.getDb() ? firebaseStore : fileStore;
}

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = process.env.BILLS_APP_UPLOADS_DIR || path.join(__dirname, 'public', 'uploads');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const isProduction = process.env.NODE_ENV === 'production';
function clientDevHintsAllowed() {
  const v = String(process.env.CLIENT_DEV_HINTS || '').toLowerCase();
  if (v === '0' || v === 'false') return false;
  if (v === '1' || v === 'true') return true;
  return process.env.NODE_ENV !== 'production';
}
const SESSION_SECRET = process.env.SESSION_SECRET || (isProduction ? null : 'bills-app-web-dev-secret-change-in-production');
if (isProduction && !SESSION_SECRET) {
  console.error('SESSION_SECRET must be set in production');
  process.exit(1);
}

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, 'logo-' + Date.now() + path.extname(file.originalname) || '.png')
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP, SVG).'));
    }
  }
});

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
  }, (accessToken, refreshToken, profile, done) => {
    const user = {
      id: profile.id,
      email: profile.emails && profile.emails[0] ? profile.emails[0].value : null,
      name: profile.displayName || null,
      picture: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
      authProvider: 'google'
    };
    return done(null, user);
  }));
} else {
  console.warn('Google OAuth not configured: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
}

app.use(express.json({ limit: '15mb' }));
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const firestoreDb = firebaseStore.getDb();
const sessionStore = firestoreDb
  ? new FirestoreSessionStore({ db: firestoreDb, ttlMs: SESSION_TTL_MS })
  : undefined; // falls back to MemoryStore (local dev without Firebase)
if (!firestoreDb) {
  console.warn('Session store: using MemoryStore (Firebase not configured). Sessions will not survive restarts.');
}
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: SESSION_TTL_MS }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.get('/auth/me', (req, res) => {
  if (req.isAuthenticated()) {
    const sendResponse = () => res.json({
      user: req.user,
      csrfToken: req.session.csrfToken,
      showClientDevHints: clientDevHintsAllowed()
    });
    if (!req.session.csrfToken) {
      req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
      return req.session.save((err) => {
        if (err) console.error('Session save error in /auth/me:', err);
        sendResponse();
      });
    }
    return sendResponse();
  }
  return res.status(401).json({ error: 'Not authenticated' });
});

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' }));

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?auth=failed' }),
    (req, res) => res.redirect('/')
  );
} else {
  app.get('/auth/google', (req, res) => res.status(503).send('Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'));
}

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    req.session.destroy((err2) => {
      if (err2) return res.status(500).json({ error: 'Logout failed' });
      res.clearCookie('connect.sid', { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      res.redirect('/');
    });
  });
});

// ── Local (email/password) auth ───────────────────────────────────────────────
const passwordUtils = require('./password-utils');
const userStore = require('./user-store');

// Simple in-memory rate limiter for login attempts (per email, 10 attempts per 15 min)
const LOCAL_AUTH_RATE_LIMIT = new Map();
function localAuthRateCheck(key) {
  const now = Date.now();
  const WINDOW_MS = 15 * 60 * 1000;
  const MAX_ATTEMPTS = 10;
  const entry = LOCAL_AUTH_RATE_LIMIT.get(key) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + WINDOW_MS; }
  entry.count++;
  LOCAL_AUTH_RATE_LIMIT.set(key, entry);
  return entry.count <= MAX_ATTEMPTS;
}

app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const emailNorm = email ? email.trim().toLowerCase() : '';
    if (!emailNorm || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    const db = firebaseStore.getDb();
    const existing = await userStore.findByEmail(emailNorm, db);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const passwordHash = await passwordUtils.hashPassword(password);
    const account = await userStore.createAccount({ name: name || '', email: emailNorm, passwordHash }, db);
    const sessionUser = { id: account.id, email: account.email, name: account.name, picture: null, authProvider: 'local' };
    req.login(sessionUser, (err) => {
      if (err) return res.status(500).json({ error: 'Login failed after registration.' });
      if (!req.session.csrfToken) {
        req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
      }
      res.status(201).json({ user: sessionUser, csrfToken: req.session.csrfToken });
    });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post('/auth/login/local', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const emailNorm = email ? email.trim().toLowerCase() : '';
    if (!emailNorm || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (!localAuthRateCheck(emailNorm)) {
      return res.status(429).json({ error: 'Too many login attempts. Please wait 15 minutes.' });
    }
    const db = firebaseStore.getDb();
    const account = await userStore.findByEmail(emailNorm, db);
    if (!account || !account.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const ok = await passwordUtils.verifyPassword(password, account.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const sessionUser = { id: account.id, email: account.email, name: account.name, picture: null, authProvider: 'local' };
    req.login(sessionUser, (err) => {
      if (err) return res.status(500).json({ error: 'Login failed.' });
      if (!req.session.csrfToken) {
        req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
      }
      res.json({ user: sessionUser, csrfToken: req.session.csrfToken });
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Login failed.' });
  }
});

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

app.post('/auth/forgot-password', async (req, res) => {
  const OK_MSG = 'If an account with that email exists, a reset link has been sent.';
  try {
    const { email } = req.body || {};
    const emailNorm = email ? email.trim().toLowerCase() : '';
    if (!emailNorm) return res.status(400).json({ error: 'Email is required.' });
    const db = firebaseStore.getDb();
    const account = await userStore.findByEmail(emailNorm, db).catch(() => null);
    if (!account || !account.passwordHash) return res.json({ ok: true, message: OK_MSG });
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
    await userStore.updateAccount(account.id, { resetToken: token, resetTokenExpiry: expiry }, db);
    const baseUrl = process.env.APP_BASE_URL || ('http://localhost:' + PORT);
    const resetUrl = baseUrl + '/?reset=' + token;
    // Log the reset URL (used when no email sender is configured)
    console.log('[RESET PASSWORD] Link for', emailNorm, '->', resetUrl);
    res.json({ ok: true, message: OK_MSG });
  } catch (e) {
    console.error('Forgot-password error:', e);
    res.status(500).json({ error: 'Request failed.' });
  }
});

app.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    const db = firebaseStore.getDb();
    const account = await userStore.findByResetToken(token, db).catch(() => null);
    if (!account) return res.status(400).json({ error: 'Invalid or expired reset token.' });
    if (!account.resetTokenExpiry || new Date(account.resetTokenExpiry) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired.' });
    }
    const passwordHash = await passwordUtils.hashPassword(password);
    await userStore.updateAccount(account.id, { passwordHash, resetToken: null, resetTokenExpiry: null }, db);
    res.json({ ok: true });
  } catch (e) {
    console.error('Reset-password error:', e);
    res.status(500).json({ error: 'Password reset failed.' });
  }
});

app.get('/auth/account', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  const { id, email, name, picture, authProvider } = req.user;
  res.json({ id, email, name, picture, authProvider });
});

app.put('/auth/account', requireAuth, requireCsrf, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body || {};
    const patch = {};
    if (name != null) patch.name = String(name).trim();
    if (req.user.authProvider !== 'local') {
      // Google users: update display name in session only
      const updated = Object.assign({}, req.user, patch);
      return req.login(updated, function (err) {
        if (err) return res.status(500).json({ error: 'Update failed.' });
        res.json({ ok: true });
      });
    }
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password is required to set a new one.' });
      if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
      const db = firebaseStore.getDb();
      const account = await userStore.findById(req.user.id, db);
      if (!account) return res.status(404).json({ error: 'Account not found.' });
      const ok = await passwordUtils.verifyPassword(currentPassword, account.passwordHash);
      if (!ok) return res.status(401).json({ error: 'Current password is incorrect.' });
      patch.passwordHash = await passwordUtils.hashPassword(newPassword);
    }
    if (Object.keys(patch).length === 0) return res.json({ ok: true });
    const db = firebaseStore.getDb();
    await userStore.updateAccount(req.user.id, patch, db);
    const updated = Object.assign({}, req.user);
    if (patch.name != null) updated.name = patch.name;
    req.login(updated, function (err) {
      if (err) return res.status(500).json({ error: 'Session update failed.' });
      res.json({ ok: true });
    });
  } catch (e) {
    console.error('Account update error:', e);
    res.status(500).json({ error: 'Update failed.' });
  }
});

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

function requireCsrf(req, res, next) {
  const sessionToken = req.session && req.session.csrfToken;
  const headerToken = req.headers['x-csrf-token'];
  if (!sessionToken || !headerToken || sessionToken !== headerToken) {
    return res.status(403).json({ error: 'Invalid CSRF token.' });
  }
  return next();
}

if (process.env.BILLS_APP_UPLOADS_DIR) {
  app.use('/uploads', requireAuth, express.static(UPLOADS_DIR));
}
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.use('/api', requireAuth);

app.use('/api', (req, res, next) => {
  req.store = getStore();
  next();
});

// Enforce CSRF token on all state-changing API requests
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return requireCsrf(req, res, next);
  }
  return next();
});

async function getCollection(req, name) {
  const data = await req.store.read(req.user.id, name);
  return Array.isArray(data) ? data : [];
}

function getById(collection, id) {
  return collection.find((x) => x.id === id) || null;
}

function sanitizePrefix(val) {
  if (val == null || typeof val !== 'string') return '';
  const s = String(val).replace(/[^A-Za-z0-9]/g, '');
  return s;
}

function billDisplayNumber(prefix, documentNumber) {
  const raw = (prefix != null && String(prefix).trim() !== '') ? String(prefix).trim() : '';
  const p = raw ? sanitizePrefix(raw) || 'Nr' : 'Nr';
  const n = parseInt(documentNumber, 10);
  const num = isNaN(n) || n < 1 ? 1 : n;
  return p + '-' + String(num).padStart(4, '0');
}

function ensureBillNumber(bill) {
  if (bill.documentNumber != null && bill.prefix != null) {
    bill.number = billDisplayNumber(bill.prefix, bill.documentNumber);
    return;
  }
  const numStr = bill.number != null ? String(bill.number).trim() : '';
  const m = numStr.match(/^(.+?)-(\d+)$/);
  if (m) {
    bill.prefix = sanitizePrefix(m[1]) || 'Nr';
    bill.documentNumber = parseInt(m[2], 10);
    bill.number = billDisplayNumber(bill.prefix, bill.documentNumber);
  } else {
    bill.prefix = (bill.prefix != null && String(bill.prefix).trim() !== '') ? (sanitizePrefix(bill.prefix) || 'Nr') : 'Nr';
  }
}

function nextDocumentNumber(list) {
  let max = 0;
  list.forEach((b) => {
    const n = parseInt(b.documentNumber, 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return max + 1;
}

function nextDocumentNumberForPrefix(list, prefix) {
  let max = 0;
  list.forEach((b) => {
    if (b.prefix !== prefix) return;
    const n = parseInt(b.documentNumber, 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return max + 1;
}

function recalcBillTotals(items, billDiscountPercent) {
  const billPct = Math.min(100, Math.max(0, parseFloat(billDiscountPercent) || 0));
  let itemsSubtotal = 0;
  const calcedItems = (Array.isArray(items) ? items : []).map(function (item) {
    const qty = Math.max(0, parseFloat(item.quantity) || 0);
    const price = parseFloat(item.pricePerUnit) || 0;
    const rawAmount = qty * price;
    const discountPct = Math.min(100, Math.max(0, parseFloat(item.discountPercent) || 0));
    const amount = Math.round(rawAmount * (1 - discountPct / 100) * 100) / 100;
    const vatPct = item.vatPercent != null ? parseFloat(item.vatPercent) : 21;
    const vatAmount = Math.round(amount * (vatPct / 100) * 100) / 100;
    itemsSubtotal = Math.round((itemsSubtotal + amount) * 100) / 100;
    return Object.assign({}, item, { quantity: qty, pricePerUnit: price, discountPercent: discountPct, amount, vatPercent: vatPct, vatAmount });
  });
  const discountAmount = itemsSubtotal > 0 && billPct > 0
    ? Math.round(itemsSubtotal * (billPct / 100) * 100) / 100
    : 0;
  const subtotal = Math.round((itemsSubtotal - discountAmount) * 100) / 100;
  const billDiscountFactor = itemsSubtotal > 0 ? subtotal / itemsSubtotal : 1;
  const vatByRate = {};
  calcedItems.forEach(function (item) {
    const vatPct = parseFloat(item.vatPercent) || 0;
    if (vatPct <= 0) return;
    const effectiveAmount = Math.round(item.amount * billDiscountFactor * 100) / 100;
    const vatAmt = Math.round(effectiveAmount * (vatPct / 100) * 100) / 100;
    item.vatAmount = vatAmt;
    vatByRate[vatPct] = Math.round(((vatByRate[vatPct] || 0) + vatAmt) * 100) / 100;
  });
  const totalVat = Math.round(Object.values(vatByRate).reduce(function (s, v) { return s + v; }, 0) * 100) / 100;
  const totalGross = Math.round((subtotal + totalVat) * 100) / 100;
  return { items: calcedItems, discountAmount, subtotal, totalVat, totalGross, vatByRate };
}

async function getBillsWithNumbers(req) {
  const list = await getCollection(req, 'bills');
  list.forEach(ensureBillNumber);
  const nextByPrefix = {};
  list.forEach((b) => {
    if (b.documentNumber == null || isNaN(parseInt(b.documentNumber, 10))) {
      const p = b.prefix || 'Nr';
      if (nextByPrefix[p] == null) nextByPrefix[p] = nextDocumentNumberForPrefix(list, p);
      b.documentNumber = nextByPrefix[p]++;
      b.number = billDisplayNumber(p, b.documentNumber);
    }
  });
  return list;
}

app.get('/api/companies', async (req, res) => {
  const list = await getCollection(req, 'companies');
  res.json(list);
});

app.post('/api/companies', async (req, res) => {
  const body = req.body || {};
  const name = body.name != null ? String(body.name).trim() : '';
  if (!name) {
    return res.status(400).json({ error: 'Uzņēmuma nosaukums ir obligāts.' });
  }
  const list = await getCollection(req, 'companies');
  const id = body.id || 'c_' + Date.now();
  if (body.isDefault === true) list.forEach((c) => { c.isDefault = false; });
  const billPrefix = sanitizePrefix(body.billPrefix || '');
  const item = { id, name: name, legalAddress: body.legalAddress || '', registrationNumber: body.registrationNumber || '', vatNumber: body.vatNumber || '', phone: body.phone || '', email: body.email || '', website: body.website || '', logo: body.logo || null, logoType: body.logoType || 'text', logoText: body.logoText || null, billPrefix: billPrefix, isDefault: body.isDefault === true, bankName: body.bankName || '', bankSwiftBic: body.bankSwiftBic || '', bankAccount: body.bankAccount || '', bankId: body.bankId || '', bankUrl: body.bankUrl || '' };
  list.push(item);
  await req.store.write(req.user.id, 'companies', list);
  res.status(201).json(item);
});

app.put('/api/companies/:id', async (req, res) => {
  const body = req.body || {};
  const name = body.name != null ? String(body.name).trim() : '';
  if (!name) {
    return res.status(400).json({ error: 'Uzņēmuma nosaukums ir obligāts.' });
  }
  const list = await getCollection(req, 'companies');
  const existing = getById(list, req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (body.isDefault === true) list.forEach((c) => { c.isDefault = false; });
  if (body.billPrefix !== undefined) body.billPrefix = sanitizePrefix(body.billPrefix);
  Object.assign(existing, body);
  await req.store.write(req.user.id, 'companies', list);
  res.json(existing);
});

app.delete('/api/companies/:id', async (req, res) => {
  const list = (await getCollection(req, 'companies')).filter((x) => x.id !== req.params.id);
  await req.store.write(req.user.id, 'companies', list);
  res.status(204).end();
});

app.get('/api/customers', async (req, res) => {
  const list = await getCollection(req, 'customers');
  res.json(list);
});

app.post('/api/customers', async (req, res) => {
  const body = req.body || {};
  const name = body.name != null ? String(body.name).trim() : '';
  if (!name) {
    return res.status(400).json({ error: 'Klienta nosaukums ir obligāts.' });
  }
  const list = await getCollection(req, 'customers');
  const id = body.id || 'cust_' + Date.now();
  const billPrefix = sanitizePrefix(body.billPrefix || '');
  const item = {
    id,
    name: name,
    address: body.address || '',
    email: body.email || '',
    registrationNumber: body.registrationNumber || '',
    vatNumber: body.vatNumber || '',
    billReference: body.billReference || '',
    billPrefix: billPrefix,
    inactive: body.inactive === true
  };
  list.push(item);
  await req.store.write(req.user.id, 'customers', list);
  res.status(201).json(item);
});

app.put('/api/customers/:id', async (req, res) => {
  const body = req.body || {};
  const name = body.name != null ? String(body.name).trim() : '';
  if (!name) {
    return res.status(400).json({ error: 'Klienta nosaukums ir obligāts.' });
  }
  if (body.billPrefix !== undefined) body.billPrefix = sanitizePrefix(body.billPrefix);
  const list = await getCollection(req, 'customers');
  const existing = getById(list, req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  Object.assign(existing, body);
  await req.store.write(req.user.id, 'customers', list);
  res.json(existing);
});

app.delete('/api/customers/:id', async (req, res) => {
  const bills = await getCollection(req, 'bills');
  const hasBills = bills.some((b) => b.customerId === req.params.id);
  if (hasBills) {
    return res.status(400).json({ error: 'Customer has bills. Mark as inactive instead.' });
  }
  const list = (await getCollection(req, 'customers')).filter((x) => x.id !== req.params.id);
  await req.store.write(req.user.id, 'customers', list);
  res.status(204).end();
});

app.get('/api/services', async (req, res) => {
  const list = await getCollection(req, 'services');
  res.json(list);
});

app.post('/api/services', async (req, res) => {
  const body = req.body || {};
  const name = body.name != null ? String(body.name).trim() : '';
  if (!name) {
    return res.status(400).json({ error: 'Pakalpojuma nosaukums ir obligāts.' });
  }
  const list = await getCollection(req, 'services');
  const id = body.id || 'srv_' + Date.now();
  const item = { id, name: name, unit: body.unit || 'pc', defaultVatPercent: body.defaultVatPercent != null ? body.defaultVatPercent : 21, lastPrice: body.lastPrice != null ? body.lastPrice : 0, measure: body.measure || 'units' };
  list.push(item);
  await req.store.write(req.user.id, 'services', list);
  res.status(201).json(item);
});

app.put('/api/services/:id', async (req, res) => {
  const body = req.body || {};
  const name = body.name != null ? String(body.name).trim() : '';
  if (!name) {
    return res.status(400).json({ error: 'Pakalpojuma nosaukums ir obligāts.' });
  }
  const list = await getCollection(req, 'services');
  const existing = getById(list, req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  Object.assign(existing, body);
  await req.store.write(req.user.id, 'services', list);
  res.json(existing);
});

app.delete('/api/services/:id', async (req, res) => {
  const list = (await getCollection(req, 'services')).filter((x) => x.id !== req.params.id);
  await req.store.write(req.user.id, 'services', list);
  res.status(204).end();
});

app.get('/api/bills', async (req, res) => {
  const list = await getBillsWithNumbers(req);
  res.json(list);
});

app.get('/api/bills/:id', async (req, res) => {
  const list = await getBillsWithNumbers(req);
  const item = getById(list, req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

app.post('/api/bills', async (req, res) => {
  const list = await getBillsWithNumbers(req);
  const settings = (await req.store.read(req.user.id, 'settings')) || {};
  const body = req.body;
  const companies = await getCollection(req, 'companies');
  const company = body.companyId ? getById(companies, body.companyId) : null;
  const defaultPrefix = (settings.billNumberPrefix || settings.defaultBillPrefix || 'Nr').toString().trim() || 'Nr';
  let prefix = (body.prefix != null && String(body.prefix).trim() !== '')
    ? String(body.prefix).trim()
    : (company && company.billPrefix)
      ? company.billPrefix
      : (company && company.name)
        ? String(company.name).trim().toUpperCase().replace(/\s+/g, '-')
        : defaultPrefix;
  prefix = sanitizePrefix(prefix) || 'Nr';
  const documentNumber = nextDocumentNumberForPrefix(list, prefix);
  const number = billDisplayNumber(prefix, documentNumber);
  const VALID_STATUSES = ['draft', 'sent', 'paid'];
  const id = body.id || 'bill_' + Date.now();
  const discountPercent = body.discountPercent != null ? body.discountPercent : 0;
  const recalc = recalcBillTotals(body.items, discountPercent);
  const item = {
    id,
    prefix,
    documentNumber,
    number,
    status: VALID_STATUSES.includes(body.status) ? body.status : 'draft',
    date: body.date || new Date().toISOString().slice(0, 10),
    supplyDate: body.supplyDate || null,
    paymentDueDate: body.paymentDueDate || null,
    companyId: body.companyId || null,
    customerId: body.customerId || null,
    reference: body.reference || '',
    discountPercent,
    discountDescription: body.discountDescription || '',
    items: recalc.items,
    discountAmount: recalc.discountAmount,
    subtotal: recalc.subtotal,
    vatByRate: recalc.vatByRate,
    totalVat: recalc.totalVat,
    totalGross: recalc.totalGross,
    createdAt: body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  list.push(item);
  await req.store.write(req.user.id, 'bills', list);
  res.status(201).json(item);
});

app.put('/api/bills/:id', async (req, res) => {
  const list = await getBillsWithNumbers(req);
  const existing = getById(list, req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const VALID_STATUSES = ['draft', 'sent', 'paid'];
  const body = req.body;
  const { number, prefix, documentNumber, ...rest } = body;
  if (rest.status != null && !VALID_STATUSES.includes(rest.status)) delete rest.status;
  Object.assign(existing, rest, { updatedAt: new Date().toISOString() });
  const recalc = recalcBillTotals(existing.items, existing.discountPercent);
  existing.items = recalc.items;
  existing.discountAmount = recalc.discountAmount;
  existing.subtotal = recalc.subtotal;
  existing.vatByRate = recalc.vatByRate;
  existing.totalVat = recalc.totalVat;
  existing.totalGross = recalc.totalGross;
  ensureBillNumber(existing);
  await req.store.write(req.user.id, 'bills', list);
  res.json(existing);
});

app.delete('/api/bills/:id', async (req, res) => {
  const list = (await getCollection(req, 'bills')).filter((x) => x.id !== req.params.id);
  await req.store.write(req.user.id, 'bills', list);
  res.status(204).end();
});

app.get('/api/settings', async (req, res) => {
  const data = await req.store.read(req.user.id, 'settings');
  res.json(data || {});
});

app.put('/api/settings', async (req, res) => {
  const current = (await req.store.read(req.user.id, 'settings')) || {};
  const next = { ...current, ...req.body };
  await req.store.write(req.user.id, 'settings', next);
  res.json(next);
});

const EMAIL_SEND_RATE = new Map();
function getEmailRateEntry(userId) {
  const now = Date.now();
  const WINDOW_MS = 60 * 60 * 1000;
  let entry = EMAIL_SEND_RATE.get(userId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    EMAIL_SEND_RATE.set(userId, entry);
  }
  return entry;
}

function createMailTransport() {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  if (!host || !from) return null;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const opts = { host, port, secure };
  if (user && pass) opts.auth = { user, pass };
  return nodemailer.createTransport(opts);
}

app.get('/api/email/status', async (req, res) => {
  res.json({ smtpConfigured: !!createMailTransport() });
});

app.post('/api/email/invoice', async (req, res) => {
  try {
    const transport = createMailTransport();
    if (!transport) {
      const errMsg = clientDevHintsAllowed()
        ? 'Email is not configured. Set SMTP_HOST and SMTP_FROM (see .env.example).'
        : 'Email sending is not available.';
      return res.status(503).json({ error: errMsg });
    }
    const rate = getEmailRateEntry(req.user.id);
    if (rate.count >= 20) {
      return res.status(429).json({ error: 'Too many emails sent. Try again in an hour.' });
    }
    const body = req.body || {};
    const billId = body.billId;
    const to = body.to != null ? String(body.to).trim() : '';
    const subject = body.subject != null ? String(body.subject).trim() : '';
    const text = body.body != null ? String(body.body) : '';
    const pdfBase64 = body.pdfBase64 != null ? String(body.pdfBase64) : '';
    let filename = body.filename != null ? String(body.filename).trim() : 'invoice.pdf';
    if (!billId || !to || !subject || !pdfBase64) {
      return res.status(400).json({ error: 'billId, to, subject, and pdfBase64 are required.' });
    }
    filename = filename.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120) || 'invoice.pdf';
    if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';

    const bills = await getBillsWithNumbers(req);
    const bill = getById(bills, billId);
    if (!bill) return res.status(404).json({ error: 'Invoice not found.' });

    const customers = await getCollection(req, 'customers');
    const cust = bill.customerId ? getById(customers, bill.customerId) : null;
    if (!cust || !cust.email) {
      return res.status(400).json({ error: 'Customer has no email on file.' });
    }
    if (to.toLowerCase() !== String(cust.email).trim().toLowerCase()) {
      return res.status(400).json({ error: 'Recipient must match the customer email for this invoice.' });
    }

    let buf;
    try {
      buf = Buffer.from(pdfBase64, 'base64');
    } catch (e) {
      return res.status(400).json({ error: 'Invalid PDF data.' });
    }
    const MAX_PDF = 12 * 1024 * 1024;
    if (!buf.length || buf.length > MAX_PDF) {
      return res.status(400).json({ error: 'PDF is missing or too large.' });
    }
    if (buf.slice(0, 5).toString('latin1') !== '%PDF-') {
      return res.status(400).json({ error: 'Attachment is not a valid PDF.' });
    }

    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      attachments: [{ filename, content: buf, contentType: 'application/pdf' }]
    });
    rate.count += 1;
    res.json({ ok: true });
  } catch (e) {
    console.error('Send invoice email error:', e);
    res.status(500).json({ error: e.message || 'Failed to send email.' });
  }
});

app.post('/api/upload-logo', (req, res, next) => {
  upload.single('logo')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large. Maximum size is 2 MB.'
        : (err.message || 'Upload failed.');
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: 'No file' });
    res.json({ url: '/uploads/' + req.file.filename });
  });
});

app.get('/api/export', async (req, res) => {
  const [companies, customers, services, bills, settings] = await Promise.all([
    getCollection(req, 'companies'),
    getCollection(req, 'customers'),
    getCollection(req, 'services'),
    getBillsWithNumbers(req),
    req.store.read(req.user.id, 'settings')
  ]);
  const data = {
    companies,
    customers,
    services,
    bills,
    settings: settings || {},
    exportedAt: new Date().toISOString()
  };
  res.setHeader('Content-Disposition', 'attachment; filename=bills-app-export.json');
  res.json(data);
});

app.post('/api/import', async (req, res) => {
  const data = req.body;
  const uid = req.user.id;
  if (data.companies) await req.store.write(uid, 'companies', data.companies);
  if (data.customers) await req.store.write(uid, 'customers', data.customers);
  if (data.services) await req.store.write(uid, 'services', data.services);
  if (data.bills) await req.store.write(uid, 'bills', data.bills);
  if (data.settings) await req.store.write(uid, 'settings', data.settings);
  res.json({ ok: true });
});

// ── Google Drive integration ─────────────────────────────────────────────────
const DRIVE_CALLBACK_PATH = '/auth/google/drive/callback';

function driveOAuth2Client() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;
  const appUrl = process.env.APP_URL || ('http://localhost:' + PORT);
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, appUrl + DRIVE_CALLBACK_PATH);
}

// Initiate Drive OAuth consent
app.get('/auth/google/drive', requireAuth, (req, res) => {
  const client = driveOAuth2Client();
  if (!client) return res.status(503).send('Google OAuth not configured.');
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    state: req.sessionID
  });
  res.redirect(url);
});

// Drive OAuth callback — save refresh token to user settings
app.get(DRIVE_CALLBACK_PATH, requireAuth, async (req, res) => {
  const client = driveOAuth2Client();
  if (!client) return res.redirect('/#/settings?drive=error');
  req.store = getStore();
  try {
    const { tokens } = await client.getToken(req.query.code);
    const current = (await req.store.read(req.user.id, 'settings')) || {};
    current.driveRefreshToken = tokens.refresh_token || current.driveRefreshToken || null;
    current.driveConnectedEmail = req.user.email || null;
    await req.store.write(req.user.id, 'settings', current);
  } catch (e) {
    console.error('Drive OAuth callback error:', e.message);
    return res.redirect('/#/settings?drive=error');
  }
  res.redirect('/#/settings?drive=connected');
});

// Drive status
app.get('/api/drive/status', requireAuth, async (req, res) => {
  const settings = (await req.store.read(req.user.id, 'settings')) || {};
  res.json({
    connected: !!settings.driveRefreshToken,
    connectedEmail: settings.driveConnectedEmail || null,
    rootFolderId: settings.driveRootFolderId || '',
    rootFolderName: settings.driveRootFolderName || '',
    monthlyFolders: !!settings.driveMonthlyFolders,
    folderFormat: settings.driveFolderFormat || ''
  });
});

// Expose non-secret client config (Google API key for Picker, client ID)
app.get('/api/config/google', requireAuth, (req, res) => {
  res.json({ apiKey: GOOGLE_API_KEY, clientId: GOOGLE_CLIENT_ID || '' });
});

// Return a fresh Drive access token for use with the Google Picker
app.get('/api/drive/access-token', requireAuth, async (req, res) => {
  const settings = (await req.store.read(req.user.id, 'settings')) || {};
  if (!settings.driveRefreshToken) {
    return res.status(400).json({ error: 'Google Drive not connected.' });
  }
  const client = driveOAuth2Client();
  if (!client) return res.status(503).json({ error: 'Google OAuth not configured.' });
  client.setCredentials({ refresh_token: settings.driveRefreshToken });
  try {
    const { token } = await client.getAccessToken();
    res.json({ accessToken: token });
  } catch (e) {
    console.error('Drive access-token error:', e.message);
    res.status(500).json({ error: e.message || 'Failed to get access token.' });
  }
});

// Save Drive settings (folder ID, monthly toggle, folder format)
app.put('/api/drive/settings', requireAuth, requireCsrf, async (req, res) => {
  const body = req.body || {};
  const current = (await req.store.read(req.user.id, 'settings')) || {};
  if (body.driveRootFolderId !== undefined) current.driveRootFolderId = String(body.driveRootFolderId || '').trim();
  if (body.driveRootFolderName !== undefined) current.driveRootFolderName = String(body.driveRootFolderName || '').trim();
  if (body.driveMonthlyFolders !== undefined) current.driveMonthlyFolders = !!body.driveMonthlyFolders;
  if (body.driveFolderFormat !== undefined) current.driveFolderFormat = String(body.driveFolderFormat || '').trim();
  await req.store.write(req.user.id, 'settings', current);
  res.json({ ok: true });
});

// Disconnect Drive
app.delete('/api/drive/disconnect', requireAuth, requireCsrf, async (req, res) => {
  const current = (await req.store.read(req.user.id, 'settings')) || {};
  delete current.driveRefreshToken;
  delete current.driveConnectedEmail;
  await req.store.write(req.user.id, 'settings', current);
  res.json({ ok: true });
});

// Upload a PDF to Drive
app.post('/api/drive/upload', requireAuth, requireCsrf, async (req, res) => {
  const settings = (await req.store.read(req.user.id, 'settings')) || {};
  if (!settings.driveRefreshToken) {
    return res.status(400).json({ error: 'Google Drive not connected.' });
  }
  const client = driveOAuth2Client();
  if (!client) return res.status(503).json({ error: 'Google OAuth not configured.' });
  client.setCredentials({ refresh_token: settings.driveRefreshToken });

  // Determine parent folder
  const body = req.body || {};
  const pdfBase64 = body.pdfBase64;
  const filename = body.filename || 'invoice.pdf';
  if (!pdfBase64) return res.status(400).json({ error: 'pdfBase64 required.' });

  let parentId = settings.driveRootFolderId || null;

  if (settings.driveMonthlyFolders) {
    const monthLabel = formatMonthLabel(new Date(), settings.driveFolderFormat);
    try {
      const { token } = await client.getAccessToken();
      parentId = await ensureDriveFolder(token, monthLabel, parentId);
    } catch (e) {
      console.error('Drive folder error:', e.message);
    }
  }

  try {
    const { token } = await client.getAccessToken();
    const fileId = await uploadToDrive(token, filename, pdfBase64, parentId);
    res.json({ fileId, viewUrl: 'https://drive.google.com/file/d/' + fileId + '/view' });
  } catch (e) {
    console.error('Drive upload error:', e.message);
    res.status(500).json({ error: e.message || 'Upload failed.' });
  }
});

/**
 * Format a month label using a simple token format string.
 * Supported tokens: YYYY, YY, MMMM, MMM, MM, M
 * Defaults to "YYYY-MM" when format is empty.
 */
function formatMonthLabel(date, format) {
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const yyyy = String(date.getFullYear());
  const yy = yyyy.slice(-2);
  const m = date.getMonth();
  const mm = String(m + 1).padStart(2, '0');
  const mSingle = String(m + 1);
  const fmt = format && format.trim() ? format.trim() : 'YYYY-MM';
  return fmt
    .replace(/YYYY/g, yyyy)
    .replace(/YY/g, yy)
    .replace(/MMMM/g, MONTH_NAMES[m])
    .replace(/MMM/g, MONTH_SHORT[m])
    .replace(/MM/g, mm)
    .replace(/\bM\b/g, mSingle);
}

/** Create or reuse a Drive folder by name under an optional parent, returns folder ID. */
async function ensureDriveFolder(accessToken, name, parentId) {
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    + (parentId ? ` and '${parentId}' in parents` : '');
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`;
  const listResult = await driveApiRequest('GET', listUrl, null, accessToken);
  if (listResult.files && listResult.files.length > 0) return listResult.files[0].id;
  const meta = { name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : [] };
  const created = await driveApiRequest('POST', 'https://www.googleapis.com/drive/v3/files?fields=id',
    JSON.stringify(meta), accessToken, 'application/json');
  return created.id;
}

/** Upload a base64-encoded PDF to Drive via multipart upload, returns file ID. */
function uploadToDrive(accessToken, filename, base64, parentId) {
  return new Promise((resolve, reject) => {
    const pdfBuf = Buffer.from(base64, 'base64');
    const boundary = '-------314159265358979323846';
    const meta = JSON.stringify({ name: filename, mimeType: 'application/pdf', parents: parentId ? [parentId] : [] });
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
      Buffer.from(meta),
      Buffer.from(`\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`),
      pdfBuf,
      Buffer.from(`\r\n--${boundary}--`)
    ]);
    const options = {
      hostname: 'www.googleapis.com',
      path: '/upload/drive/v3/files?uploadType=multipart&fields=id',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
        'Content-Length': body.length
      }
    };
    const req = https.request(options, (resp) => {
      let data = '';
      resp.on('data', (c) => { data += c; });
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.id) resolve(parsed.id);
          else reject(new Error(parsed.error ? parsed.error.message : 'No file ID returned'));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** Generic Drive API request helper. */
function driveApiRequest(method, url, body, accessToken, contentType) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers: { Authorization: 'Bearer ' + accessToken }
    };
    if (body && contentType) {
      options.headers['Content-Type'] = contentType;
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = https.request(options, (resp) => {
      let data = '';
      resp.on('data', (c) => { data += c; });
      resp.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.listen(PORT, () => {
  console.log('Bills app at http://localhost:' + PORT);
});
