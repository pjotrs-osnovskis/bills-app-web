'use strict';
const { scrypt, randomBytes, timingSafeEqual } = require('crypto');

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 64;

function hashPassword(password) {
  return new Promise(function (resolve, reject) {
    const salt = randomBytes(16).toString('hex');
    scrypt(password, salt, KEY_LEN, SCRYPT_PARAMS, function (err, derivedKey) {
      if (err) return reject(err);
      resolve('scrypt:' + salt + ':' + derivedKey.toString('hex'));
    });
  });
}

function verifyPassword(password, stored) {
  return new Promise(function (resolve, reject) {
    const parts = stored ? stored.split(':') : [];
    if (parts.length !== 3 || parts[0] !== 'scrypt') return resolve(false);
    const salt = parts[1];
    const keyHex = parts[2];
    const keyBuf = Buffer.from(keyHex, 'hex');
    scrypt(password, salt, KEY_LEN, SCRYPT_PARAMS, function (err, derivedKey) {
      if (err) return reject(err);
      try {
        resolve(timingSafeEqual(keyBuf, derivedKey));
      } catch (_) {
        resolve(false);
      }
    });
  });
}

module.exports = { hashPassword, verifyPassword };
