const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'crm.db');

let db;

function getDB() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Database ulanishda xatolik:', err.message);
      } else {
        console.log('✅ SQLite bazaga ulandi:', DB_PATH);
      }
    });
  }
  return db;
}

function initDB() {
  return new Promise((resolve, reject) => {
    const database = getDB();

    database.serialize(() => {

      // ── Reklamalar jadvali ──
      database.run(`
        CREATE TABLE IF NOT EXISTS ads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_channel TEXT NOT NULL,
          source_message_id INTEGER,
          original_text TEXT,
          modified_text TEXT NOT NULL,
          media_type TEXT DEFAULT 'text',
          media_file_id TEXT,
          posted_to_channel INTEGER DEFAULT 0,
          posted_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'pending'
        )
      `, (err) => { if (err) console.error('ads jadval:', err); });

      // ── Manba kanallar jadvali ──
      database.run(`
        CREATE TABLE IF NOT EXISTS source_channels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          channel_username TEXT NOT NULL UNIQUE,
          channel_title TEXT,
          is_active INTEGER DEFAULT 1,
          last_checked DATETIME,
          total_collected INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => { if (err) console.error('source_channels jadval:', err); });

      // ── CRM — Mijozlar jadvali ──
      database.run(`
        CREATE TABLE IF NOT EXISTS clients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id INTEGER,
          username TEXT,
          full_name TEXT,
          phone TEXT,
          source TEXT,
          interest TEXT,
          status TEXT DEFAULT 'new',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => { if (err) console.error('clients jadval:', err); });

      // ── Statistika jadvali ──
      database.run(`
        CREATE TABLE IF NOT EXISTS stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          ads_collected INTEGER DEFAULT 0,
          ads_posted INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => { if (err) console.error('stats jadval:', err); });

      // ── Foydalanuvchilar jadvali ──
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT UNIQUE NOT NULL,
          phone TEXT NOT NULL,
          full_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => { if (err) console.error('users jadval:', err); });

      // ── Kvartiralar jadvali ──
      database.run(`
        CREATE TABLE IF NOT EXISTS apartments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT,
          address TEXT,
          district TEXT,
          rooms INTEGER,
          area REAL,
          floor TEXT,
          price INTEGER,
          description TEXT,
          photo_id TEXT,
          posted_to_channel INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('apartments jadval:', err);
          reject(err);
        } else {
          console.log('✅ Barcha jadvallar tayyor');
          resolve();
        }
      });
    });
  });
}

// ═══════════════════════════════════════════
// REKLAMA FUNKSIYALARI
// ═══════════════════════════════════════════

function saveAd(data) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.run(`
      INSERT INTO ads (source_channel, source_message_id, original_text, modified_text, media_type, media_file_id, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [
      data.sourceChannel,
      data.sourceMessageId,
      data.originalText,
      data.modifiedText,
      data.mediaType || 'text',
      data.mediaFileId || null
    ], function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function markAdAsPosted(adId) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.run(
      `UPDATE ads SET posted_to_channel = 1, posted_at = CURRENT_TIMESTAMP, status = 'posted' WHERE id = ?`,
      [adId],
      function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

function getPendingAds(limit = 10) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.all(
      `SELECT * FROM ads WHERE posted_to_channel = 0 AND status = 'pending' ORDER BY created_at ASC LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getStats() {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.get(`
      SELECT
        COUNT(*) as total_ads,
        SUM(CASE WHEN posted_to_channel = 1 THEN 1 ELSE 0 END) as posted_ads,
        SUM(CASE WHEN posted_to_channel = 0 THEN 1 ELSE 0 END) as pending_ads,
        COUNT(DISTINCT source_channel) as unique_channels
      FROM ads
    `, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function getAllAds(limit = 50, offset = 0) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.all(
      `SELECT * FROM ads ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function adExists(sourceChannel, sourceMessageId) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.get(
      `SELECT id FROM ads WHERE source_channel = ? AND source_message_id = ?`,
      [sourceChannel, sourceMessageId],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
}

// ═══════════════════════════════════════════
// KANAL FUNKSIYALARI
// ═══════════════════════════════════════════

function addSourceChannel(username, title) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.run(
      `INSERT OR REPLACE INTO source_channels (channel_username, channel_title) VALUES (?, ?)`,
      [username, title],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getSourceChannels() {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.all(
      `SELECT * FROM source_channels WHERE is_active = 1`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

// ═══════════════════════════════════════════
// MIJOZ (CRM) FUNKSIYALARI
// ═══════════════════════════════════════════

function saveClient(data) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.run(`
      INSERT OR IGNORE INTO clients (telegram_id, username, full_name, phone, source, interest, status)
      VALUES (?, ?, ?, ?, ?, ?, 'new')
    `, [
      data.telegramId,
      data.username,
      data.fullName,
      data.phone,
      data.source,
      data.interest
    ], function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

// ═══════════════════════════════════════════
// FOYDALANUVCHI FUNKSIYALARI
// ═══════════════════════════════════════════

function saveUser({ userId, phone, fullName }) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.run(
      `INSERT OR REPLACE INTO users (user_id, phone, full_name) VALUES (?, ?, ?)`,
      [String(userId), phone, fullName],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function getUserById(userId) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.get(
      `SELECT * FROM users WHERE user_id = ?`,
      [String(userId)],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

function getUserByPhone(phone) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.get(
      `SELECT * FROM users WHERE phone = ?`,
      [phone],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

function getAllUsers() {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.all(
      `SELECT * FROM users ORDER BY created_at DESC`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

function getUserCount() {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.get(
      `SELECT COUNT(*) as count FROM users`,
      [],
      (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      }
    );
  });
}

// ═══════════════════════════════════════════
// KVARTIRA FUNKSIYALARI
// ═══════════════════════════════════════════

function getApartments(filters = {}) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    let query = `SELECT * FROM apartments WHERE 1=1`;
    const params = [];

    if (filters.district) {
      query += ` AND district LIKE ?`;
      params.push(`%${filters.district}%`);
    }
    if (filters.minPrice) {
      query += ` AND price >= ?`;
      params.push(filters.minPrice);
    }
    if (filters.maxPrice) {
      query += ` AND price <= ?`;
      params.push(filters.maxPrice);
    }
    if (filters.rooms) {
      query += ` AND rooms = ?`;
      params.push(filters.rooms);
    }

    query += ` ORDER BY created_at DESC LIMIT 20`;

    database.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function getApartmentById(id) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.get(
      `SELECT * FROM apartments WHERE id = ?`,
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

function getApartmentsByAddress(address) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.all(
      `SELECT * FROM apartments
       WHERE address LIKE ? OR district LIKE ? OR title LIKE ?
       ORDER BY created_at DESC LIMIT 10`,
      [`%${address}%`, `%${address}%`, `%${address}%`],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

function saveApartment(data) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.run(`
      INSERT INTO apartments (title, address, district, rooms, area, floor, price, description, photo_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.title || null,
      data.address || null,
      data.district || null,
      data.rooms || null,
      data.area || null,
      data.floor || null,
      data.price || null,
      data.description || null,
      data.photoId || null
    ], function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function deleteApartment(id) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.run(
      `DELETE FROM apartments WHERE id = ?`,
      [id],
      function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

// ═══════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════

module.exports = {
  // Baza
  initDB,

  // Reklamalar
  saveAd,
  markAdAsPosted,
  getPendingAds,
  getStats,
  getAllAds,
  adExists,

  // Kanallar
  addSourceChannel,
  getSourceChannels,

  // Mijozlar (CRM)
  saveClient,

  // Foydalanuvchilar
  saveUser,
  getUserById,
  getUserByPhone,
  getAllUsers,
  getUserCount,

  // Kvartiralar
  getApartments,
  getApartmentById,
  getApartmentsByAddress,
  saveApartment,
  deleteApartment,
};