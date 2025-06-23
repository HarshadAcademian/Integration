const pg = require('./pg-config');  // PostgreSQL pool
const log = require('./reportgeneration/report');

async function deletePostgresData() {
  try {
    log('🧹 Starting cleanup: Deleting data from PostgreSQL tables...');

    const result = await pg.query('DELETE FROM student_academics');
    log(`   - Deleted ${result.rowCount} records from student_academics`);

    log('✅ PostgreSQL table data deletion completed successfully!');
  } catch (err) {
    log(`❌ Error while deleting data from PostgreSQL: ${err.message}`);
  } finally {
    try {
      await pg.end();
      log('🔒 PostgreSQL connection closed.');
    } catch (closeErr) {
      log(`⚠️ Error closing PostgreSQL connection: ${closeErr.message}`);
    }
  }
}

deletePostgresData();
