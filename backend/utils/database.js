const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const logger = require('./logger');

const dbDir = process.env.PERSISTENT_DIR || (process.env.NODE_ENV === 'production' ? '/tmp' : path.join(__dirname, '../data'));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'recruitment.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error(`Could not connect to database: ${err.message}`);
  } else {
    logger.info('Connected to SQLite database.');
  }
});

// Wrap DB commands in promises for cleaner async/await usage
const dbQuery = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

const initializeDatabase = async () => {
  try {
    // Enable foreign keys for data integrity
    await dbQuery.run('PRAGMA foreign_keys = ON;');

    // 1. Create Users Table (for recruiter authentication)
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'recruiter',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // No default seed user - full production mode

    // 2. Create Jobs Table
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        requirements TEXT, -- JSON string
        company_values TEXT, -- JSON string
        team_size INTEGER,
        reporting_to TEXT,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 3. Create Candidates Table
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS candidates (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        file_path TEXT,
        resume_text TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending_evaluation',
        FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
      )
    `);

    // 4. Create Evaluations Table
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        candidate_id TEXT NOT NULL,
        overall_score REAL NOT NULL,
        scores TEXT, -- JSON string containing skillMatch, experienceAlignment, cultureFit, riskScore
        rank INTEGER,
        status TEXT, -- 'Strong Match', 'Good Match', 'Potential Match', etc.
        recommendation TEXT,
        strengths TEXT, -- JSON array
        gaps TEXT, -- JSON array
        red_flags TEXT, -- JSON array
        suggested_questions TEXT, -- JSON array
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY(candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
      )
    `);

    // 5. Create Audit Logs Table
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        job_id TEXT,
        action TEXT NOT NULL,
        details TEXT, -- JSON string of action metadata
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Create Candidate Notes Table
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS candidate_notes (
        id TEXT PRIMARY KEY,
        candidate_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    logger.info('Database schemas checked and verified.');
  } catch (err) {
    logger.error(`Database initialization failed: ${err.message}`);
    throw err;
  }
};

module.exports = {
  db,
  dbQuery,
  initializeDatabase
};
