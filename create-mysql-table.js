const fs = require('fs');
const path = require('path');
const db = require('./db-config');

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

async function createMySQLTables() {
  try {
    log('🔧 Starting MySQL tables creation...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS DEPARTMENTS (
        DEPARTMENTS_ID INT PRIMARY KEY AUTO_INCREMENT,
        DEPARTMENTS_NAME VARCHAR(100) NOT NULL UNIQUE
      )
    `);
    log('Created table DEPARTMENTS');

    await db.query(`
      CREATE TABLE IF NOT EXISTS STUDENTS (
        STUDENTS_ID INT PRIMARY KEY,
        STUDENTS_FIRST_NAME VARCHAR(50) NOT NULL,
        STUDENTS_LAST_NAME VARCHAR(50) NOT NULL,
        STUDENTS_EMAIL VARCHAR(100) NOT NULL,
        STUDENTS_DEPT_ID INT NOT NULL,
        STUDENTS_JOINING_DATE DATE NOT NULL,
        FOREIGN KEY (STUDENTS_DEPT_ID) REFERENCES DEPARTMENTS(DEPARTMENTS_ID)
      )
    `);
    log('Created table STUDENTS');

    await db.query(`
      CREATE TABLE IF NOT EXISTS SUBJECTS (
        SUBJECTS_ID INT PRIMARY KEY AUTO_INCREMENT,
        SUBJECTS_NAME VARCHAR(100) NOT NULL UNIQUE,
        SUBJECTS_DEPT_ID INT NOT NULL,
        FOREIGN KEY (SUBJECTS_DEPT_ID) REFERENCES DEPARTMENTS(DEPARTMENTS_ID)
      )
    `);
    log('Created table SUBJECTS');

    await db.query(`
      CREATE TABLE IF NOT EXISTS MARKS (
        MARKS_STUDENT_ID INT NOT NULL,
        MARKS_SUBJECT_ID INT NOT NULL,
        MARKS_OBTAIN DECIMAL(5,2) NOT NULL,
        PRIMARY KEY (MARKS_STUDENT_ID, MARKS_SUBJECT_ID),
        FOREIGN KEY (MARKS_STUDENT_ID) REFERENCES STUDENTS(STUDENTS_ID),
        FOREIGN KEY (MARKS_SUBJECT_ID) REFERENCES SUBJECTS(SUBJECTS_ID)
      )
    `);
    log('Created table MARKS');

    await db.query(`
      CREATE TABLE IF NOT EXISTS GRADE (
        GRADE_ID INT PRIMARY KEY,
        GRADE_CODE VARCHAR(10) NOT NULL UNIQUE,
        GRADE_LABEL VARCHAR(50) NOT NULL,
        GRADE_PERCENTAGE_RANGE VARCHAR(20) NOT NULL,
        GRADE_GPA_EQUIVALENT DECIMAL(3,2) NOT NULL
      )
    `);
    log('Created table GRADE');

    log('✅ MySQL tables created successfully.');
  } catch (err) {
    log(`❌ MySQL table creation error: ${err.message}`);
  } finally {
    await db.end();
    log('MySQL connection closed.');
  }
}

createMySQLTables();
