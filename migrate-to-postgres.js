const mysql = require('./db-config');  // MySQL pool
const pg = require('./pg-config');     // PostgreSQL pool
const log = require('./reportgeneration/report');  // Custom logger

async function migrateToPostgres() {
  try {
    log('🚀 Starting migration from MySQL to PostgreSQL...');

    // Fetch student data including GPA mapping
    const [rows] = await mysql.query(`
      SELECT 
        s.STUDENTS_ID AS id,
        s.STUDENTS_FIRST_NAME AS first_name,
        s.STUDENTS_LAST_NAME AS last_name,
        s.STUDENTS_EMAIL AS email,
        d.DEPARTMENTS_NAME AS department,
        s.STUDENTS_JOINING_DATE AS joining_date,
        m.MARKS_OBTAIN AS marks,
        g.GRADE_GPA_EQUIVALENT AS gpa
      FROM STUDENTS s
      JOIN DEPARTMENTS d ON s.STUDENTS_DEPT_ID = d.DEPARTMENTS_ID
      JOIN MARKS m ON s.STUDENTS_ID = m.MARKS_STUDENT_ID
      JOIN GRADE g ON (
        m.MARKS_OBTAIN BETWEEN 
        CAST(SUBSTRING_INDEX(g.GRADE_PERCENTAGE_RANGE, '-', 1) AS UNSIGNED) AND 
        CAST(SUBSTRING_INDEX(g.GRADE_PERCENTAGE_RANGE, '-', -1) AS UNSIGNED)
      )
    `);

    log(`📥 Retrieved ${rows.length} academic records from MySQL.`);

    const studentMap = new Map();

    // Aggregate GPA by student
    for (const row of rows) {
      if (!studentMap.has(row.id)) {
        studentMap.set(row.id, {
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          department: row.department,
          joining_date: row.joining_date,
          totalGpa: 0,
          subjectCount: 0,
        });
      }
      const student = studentMap.get(row.id);
      student.totalGpa += parseFloat(row.gpa);
      student.subjectCount += 1;
    }

    // Compute average GPA
    const studentRecords = Array.from(studentMap.values()).map(s => ({
      first_name: s.first_name,
      last_name: s.last_name,
      email: s.email,
      department: s.department,
      joining_date: s.joining_date,
      gpa: Number((s.totalGpa / s.subjectCount).toFixed(2)),
    }));

    let successCount = 0;
    let failedCount = 0;

    // Migrate each record to PostgreSQL
    for (const student of studentRecords) {
      try {
        await pg.query(
          `INSERT INTO student_academics (
            student_academics_first_name,
            student_academics_last_name,
            student_academics_email,
            student_academics_department,
            student_academics_joining_date,
            student_academics_gpa
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (student_academics_email) DO UPDATE SET
            student_academics_first_name = EXCLUDED.student_academics_first_name,
            student_academics_last_name = EXCLUDED.student_academics_last_name,
            student_academics_department = EXCLUDED.student_academics_department,
            student_academics_joining_date = EXCLUDED.student_academics_joining_date,
            student_academics_gpa = EXCLUDED.student_academics_gpa
          `,
          [
            student.first_name,
            student.last_name,
            student.email,
            student.department,
            student.joining_date,
            student.gpa,
          ]
        );
        successCount++;
      } catch (err) {
        failedCount++;
        log(`⚠️ Could not migrate student ${student.email}: ${err.message}`);
      }
    }

    log(`✅ Migration completed.`);
    log(`   - ✅ Successful migrations: ${successCount}`);
    log(`   - ❌ Failed migrations: ${failedCount}`);
  } catch (err) {
    log(`🔥 Migration process failed unexpectedly: ${err.message}`);
  } finally {
    try {
      await mysql.end();
      log('🔒 MySQL connection closed.');
    } catch (err) {
      log(`⚠️ Failed to close MySQL connection: ${err.message}`);
    }

    try {
      await pg.end();
      log('🔒 PostgreSQL connection closed.');
    } catch (err) {
      log(`⚠️ Failed to close PostgreSQL connection: ${err.message}`);
    }
  }
}

migrateToPostgres();
