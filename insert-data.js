const fs = require('fs');
const readline = require('readline');
const db = require('./db-config');
const log = require('./reportgeneration/report');

// Validate date (YYYY-MM-DD)
function isValidDate(dateStr) {
  const date = new Date(dateStr);
  return !isNaN(date) && dateStr === date.toISOString().split('T')[0];
}

// Trim and split CSV line
function parseCSVLine(line) {
  return line.split(',').map(cell => cell.trim());
}

// Check MySQL Connection
async function checkConnection() {
  try {
    await db.query('SELECT 1');
    log('✅ Connected to MySQL database.');
  } catch (err) {
    log(`❌ Failed to connect to MySQL: ${err.message}`);
    process.exit(1);
  }
}

// Load Grades
async function loadGrades() {
  try {
    const fileStream = fs.createReadStream('grade.txt');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let first = true;
    for await (const line of rl) {
      if (first) { first = false; continue; }
      if (!line.trim()) continue;

      const [id, code, label, range, gpa] = parseCSVLine(line);

      // Validate fields are present and non-empty
      if (!id || !code || !label || !range || !gpa) {
        log(`⚠️ Skipping GRADE line due to missing fields: ${line}`);
        continue;
      }

      try {
        await db.query(`
          INSERT INTO GRADE (GRADE_ID, GRADE_CODE, GRADE_LABEL, GRADE_PERCENTAGE_RANGE, GRADE_GPA_EQUIVALENT)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            GRADE_CODE = VALUES(GRADE_CODE),
            GRADE_LABEL = VALUES(GRADE_LABEL),
            GRADE_PERCENTAGE_RANGE = VALUES(GRADE_PERCENTAGE_RANGE),
            GRADE_GPA_EQUIVALENT = VALUES(GRADE_GPA_EQUIVALENT)
        `, [parseInt(id), code, label, range, parseFloat(gpa)]);
      } catch (err) {
        log(`⚠️ Skipping grade ID ${id} due to error: ${err.message}`);
      }
    }
    log('✅ Grade data loaded successfully.');
  } catch (err) {
    log(`❌ Failed to load grades: ${err.message}`);
  }
}

// Department cache
const deptCache = {};
async function getDepartmentId(deptName) {
  if (deptCache[deptName]) return deptCache[deptName];

  try {
    const [result] = await db.query(`
      INSERT INTO DEPARTMENTS (DEPARTMENTS_NAME) VALUES (?) 
      ON DUPLICATE KEY UPDATE DEPARTMENTS_ID=LAST_INSERT_ID(DEPARTMENTS_ID)
    `, [deptName]);

    deptCache[deptName] = result.insertId;
    return result.insertId;
  } catch (err) {
    const [rows] = await db.query(`SELECT DEPARTMENTS_ID FROM DEPARTMENTS WHERE DEPARTMENTS_NAME = ?`, [deptName]);
    if (rows.length > 0) {
      deptCache[deptName] = rows[0].DEPARTMENTS_ID;
      return rows[0].DEPARTMENTS_ID;
    }
    throw new Error(`Department lookup failed for "${deptName}"`);
  }
}

// Subject cache
const subjectCache = {};
async function getSubjectId(subjectName, deptId) {
  if (subjectCache[subjectName]) return subjectCache[subjectName];

  try {
    const [result] = await db.query(`
      INSERT INTO SUBJECTS (SUBJECTS_NAME, SUBJECTS_DEPT_ID) VALUES (?, ?)
      ON DUPLICATE KEY UPDATE SUBJECTS_ID=LAST_INSERT_ID(SUBJECTS_ID)
    `, [subjectName, deptId]);

    subjectCache[subjectName] = result.insertId;
    return result.insertId;
  } catch (err) {
    const [rows] = await db.query(`SELECT SUBJECTS_ID FROM SUBJECTS WHERE SUBJECTS_NAME = ?`, [subjectName]);
    if (rows.length > 0) {
      subjectCache[subjectName] = rows[0].SUBJECTS_ID;
      return rows[0].SUBJECTS_ID;
    }
    throw new Error(`Subject lookup failed for "${subjectName}"`);
  }
}

// Insert or update student
async function upsertStudent(student) {
  const sql = `
    INSERT INTO STUDENTS 
      (STUDENTS_ID, STUDENTS_FIRST_NAME, STUDENTS_LAST_NAME, STUDENTS_EMAIL, STUDENTS_DEPT_ID, STUDENTS_JOINING_DATE)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      STUDENTS_FIRST_NAME = VALUES(STUDENTS_FIRST_NAME),
      STUDENTS_LAST_NAME = VALUES(STUDENTS_LAST_NAME),
      STUDENTS_EMAIL = VALUES(STUDENTS_EMAIL),
      STUDENTS_DEPT_ID = VALUES(STUDENTS_DEPT_ID),
      STUDENTS_JOINING_DATE = VALUES(STUDENTS_JOINING_DATE)
  `;
  const params = [student.id, student.firstName, student.lastName, student.email, student.deptId, student.joiningDate];
  await db.query(sql, params);
}

// Insert or update mark
async function upsertMark(studentId, subjectId, mark) {
  const sql = `
    INSERT INTO MARKS (MARKS_STUDENT_ID, MARKS_SUBJECT_ID, MARKS_OBTAIN)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      MARKS_OBTAIN = VALUES(MARKS_OBTAIN)
  `;
  await db.query(sql, [studentId, subjectId, mark]);
}

// Load Students from File
async function loadStudents() {
  try {
    const fileStream = fs.createReadStream('students.txt');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let first = true;
    for await (const line of rl) {
      if (first) { first = false; continue; }
      if (!line.trim()) continue;

      const data = parseCSVLine(line);

      if (data.length !== 16) {
        log(`⚠️ Skipping malformed line: ${line}`);
        continue;
      }

      const [
        id, firstName, lastName, email, deptName, joiningDate,
        sub1, sub2, sub3, sub4, sub5,
        m1, m2, m3, m4, m5
      ] = data;

      // Validate required student fields are present and non-empty
      if (!id || !firstName || !lastName || !email || !deptName || !joiningDate) {
        log(`⚠️ Skipping STUDENT line due to missing key fields: ${line}`);
        continue;
      }

      if (!isValidDate(joiningDate)) {
        log(`⚠️ Skipping student ${id} due to invalid joining date: ${joiningDate}`);
        continue;
      }

      const studentId = parseInt(id);
      let deptId;

      try {
        deptId = await getDepartmentId(deptName);
      } catch (err) {
        log(`❌ Department error for student ${studentId}: ${err.message}`);
        continue;
      }

      try {
        await upsertStudent({ id: studentId, firstName, lastName, email, deptId, joiningDate });
      } catch (err) {
        log(`❌ Could not insert student ${studentId}: ${err.message}`);
        continue;
      }

      const subjects = [sub1, sub2, sub3, sub4, sub5];
      const marks = [m1, m2, m3, m4, m5];

      for (let i = 0; i < 5; i++) {
        const subject = subjects[i];
        const mark = parseFloat(marks[i]);

        // Validate subject and mark before processing
        if (!subject || subject === '' || marks[i] === '' || isNaN(mark)) {
          log(`⚠️ Skipping subject/mark for student ${studentId} at position ${i + 1}: Invalid data`);
          continue;
        }

        let subjectId;
        try {
          subjectId = await getSubjectId(subject, deptId);
        } catch (err) {
          log(`❌ Could not get subject "${subject}" for student ${studentId}: ${err.message}`);
          continue;
        }

        try {
          await upsertMark(studentId, subjectId, mark);
        } catch (err) {
          log(`❌ Could not insert mark for student ${studentId}, subject ${subject}: ${err.message}`);
        }
      }
    }

    log('✅ Student, subject, and mark data processed successfully.');
  } catch (err) {
    log(`❌ Failed to load student data: ${err.message}`);
  }
}

// MAIN EXECUTION
(async () => {
  try {
    await checkConnection();
    await loadGrades();
    await loadStudents();

    const [grades] = await db.query('SELECT COUNT(*) AS count FROM GRADE');
    const [students] = await db.query('SELECT COUNT(*) AS count FROM STUDENTS');
    const [subjects] = await db.query('SELECT COUNT(*) AS count FROM SUBJECTS');
    const [marks] = await db.query('SELECT COUNT(*) AS count FROM MARKS');
    const [depts] = await db.query('SELECT COUNT(*) AS count FROM DEPARTMENTS');

    log('📊 Final record counts:');
    log(`   - Grades: ${grades[0].count}`);
    log(`   - Students: ${students[0].count}`);
    log(`   - Subjects: ${subjects[0].count}`);
    log(`   - Marks: ${marks[0].count}`);
    log(`   - Departments: ${depts[0].count}`);
  } catch (err) {
    log(`❌ Fatal error: ${err.message}`);
  } finally {
    await db.end();
    log('🔒 MySQL connection closed.');
  }
})();
