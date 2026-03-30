const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.BILLS_APP_DATA_DIR || path.join(__dirname, 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getFilePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function read(name) {
  ensureDataDir();
  const filePath = getFilePath(name);
  if (!fs.existsSync(filePath)) {
    const defaultVal = name === 'settings' ? {} : [];
    fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2));
    return defaultVal;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    return name === 'settings' ? {} : [];
  }
}

function write(name, data) {
  ensureDataDir();
  const filePath = getFilePath(name);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { read, write, ensureDataDir, getFilePath };
