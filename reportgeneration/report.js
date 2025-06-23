const fs = require('fs');
const path = require('path');

const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-');
const logDir = path.join(__dirname, 'reportgeneration', 'report');
const logFile = path.join(logDir, `report-${timestamp}.txt`);

// Ensure the log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function log(message) {
  const time = new Date().toISOString();
  fs.appendFileSync(logFile, `[${time}] ${message}\n`, 'utf-8');
}

module.exports = log;
