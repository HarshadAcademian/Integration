const db = require('./db-config');  // MySQL pool
const log = require('./reportgeneration/report');

async function deleteMySQLData() {
  try {
    log('🧹 Starting cleanup: Deleting data from MySQL tables...');

    // Delete from MARKS
    const [marksResult] = await db.query('DELETE FROM MARKS');
    log(`   - Deleted ${marksResult.affectedRows} records from MARKS`);

    // Delete from SUBJECTS
    const [subjectsResult] = await db.query('DELETE FROM SUBJECTS');
    log(`   - Deleted ${subjectsResult.affectedRows} records from SUBJECTS`);

    // Delete from STUDENTS
    const [studentsResult] = await db.query('DELETE FROM STUDENTS');
    log(`   - Deleted ${studentsResult.affectedRows} records from STUDENTS`);

    // Delete from GRADE
    const [gradesResult] = await db.query('DELETE FROM GRADE');
    log(`   - Deleted ${gradesResult.affectedRows} records from GRADE`);

    // Delete from DEPARTMENTS
    const [deptsResult] = await db.query('DELETE FROM DEPARTMENTS');
    log(`   - Deleted ${deptsResult.affectedRows} records from DEPARTMENTS`);

    log('✅ MySQL table data deletion completed successfully!');
  } catch (err) {
    log(`❌ Error while deleting data from MySQL tables: ${err.message}`);
  } finally {
    try {
      await db.end();
      log('🔒 MySQL connection closed.');
    } catch (closeErr) {
      log(`⚠️ Error closing MySQL connection: ${closeErr.message}`);
    }
  }
}

deleteMySQLData();
