const fs = require('fs');
const path = require('path');
const pg = require('./pg-config');

// Prepare log file with timestamp
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-');
const logDir = path.join(__dirname, 'reportgeneration', 'report');
const logFile = path.join(logDir, `report-${timestamp}.txt`);

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Logging helper function — writes only to file
function log(message) {
  const time = new Date().toISOString();
  const logMessage = `[${time}] ${message}\n`;
  fs.appendFileSync(logFile, logMessage, 'utf-8');
}

async function createPostgresTables() {
  try {
    log('🔧 Starting PostgreSQL table creation...');

    await pg.query(`
      CREATE TABLE IF NOT EXISTS student_academics (
        student_academics_id SERIAL PRIMARY KEY,
        student_academics_first_name VARCHAR(50) NOT NULL,
        student_academics_last_name VARCHAR(50) NOT NULL,
        student_academics_email VARCHAR(100) UNIQUE NOT NULL,
        student_academics_department VARCHAR(100) NOT NULL,
        student_academics_joining_date DATE NOT NULL,
        student_academics_gpa NUMERIC(3,2) CHECK (student_academics_gpa BETWEEN 0 AND 4) NOT NULL
      )
    `);
    log('✅ PostgreSQL table student_academics created successfully.');
  } catch (err) {
    log(`❌ PostgreSQL table creation error: ${err.message}`);
  } finally {
    await pg.end();
    log('PostgreSQL connection closed.');
  }
}

createPostgresTables();
