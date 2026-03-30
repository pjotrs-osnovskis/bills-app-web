const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = process.env.BILLS_APP_DATA_DIR || path.join(__dirname, 'data');

async function ensureUserDir(userId) {
  const userDir = path.join(DATA_DIR, String(userId));
  await fs.mkdir(userDir, { recursive: true });
  return userDir;
}

async function read(userId, name) {
  const userDir = await ensureUserDir(userId);
  const filePath = path.join(userDir, `${name}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);
    return name === 'settings' ? (data || {}) : (Array.isArray(data) ? data : []);
  } catch (e) {
    if (e.code === 'ENOENT') return name === 'settings' ? {} : [];
    return name === 'settings' ? {} : [];
  }
}

async function write(userId, name, data) {
  const userDir = await ensureUserDir(userId);
  const filePath = path.join(userDir, `${name}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { read, write };
