// ═══════════════════════════════════════════════════════════════════
// DATABASE.JS GA QO'SHILISHI KERAK BO'LGAN YANGI FUNKSIYALAR
// Mavjud database.js faylingizga quyidagilarni qo'shing
// ═══════════════════════════════════════════════════════════════════

// ─── INIT DB — yangi jadvallarni qo'shing ───────────────────────────
// initDB() funksiyasi ichiga quyidagi SQL larni qo'shing:

/*
  -- FOYDALANUVCHILAR jadvali
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    full_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- KVARTIRALAR jadvali
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
  );
*/

// ─── FOYDALANUVCHI FUNKSIYALARI ──────────────────────────────────────

async function saveUser({ userId, phone, fullName }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO users (user_id, phone, full_name) VALUES (?, ?, ?)`,
      [String(userId), phone, fullName],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

async function getUserById(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM users WHERE user_id = ?`,
      [String(userId)],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

async function getUserByPhone(phone) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM users WHERE phone = ?`,
      [phone],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

async function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM users ORDER BY created_at DESC`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

async function getUserCount() {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) as count FROM users`, [], (err, row) => {
      if (err) reject(err);
      else resolve(row?.count || 0);
    });
  });
}

// ─── KVARTIRA FUNKSIYALARI ───────────────────────────────────────────

async function getApartments(filters = {}) {
  return new Promise((resolve, reject) => {
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

    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function getApartmentById(id) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM apartments WHERE id = ?`,
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

async function getApartmentsByAddress(address) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM apartments WHERE address LIKE ? OR district LIKE ? OR title LIKE ? ORDER BY created_at DESC LIMIT 10`,
      [`%${address}%`, `%${address}%`, `%${address}%`],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

async function deleteApartment(id) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM apartments WHERE id = ?`, [id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ─── EXPORT ──────────────────────────────────────────────────────────
// module.exports ichiga quyidagilarni qo'shing:
/*
  saveUser,
  getUserById,
  getUserByPhone,
  getAllUsers,
  getUserCount,
  getApartments,
  getApartmentById,
  getApartmentsByAddress,
  deleteApartment,
*/
