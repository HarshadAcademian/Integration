# Integration Task: MySQL to PostgreSQL ETL

This Node.js project reads student academic data from `.txt` files, loads it into a MySQL database, and then transforms and migrates the processed data into a PostgreSQL database.

---

## 🧱 Project Structure

integration-task/
├── create-mysql-table.js # MySQL table creation script  
├── create-pg-table.js # PostgreSQL table creation script  
├── insert-data.js # Reads txt files and inserts into MySQL  
├── migrate-to-pg.js # Migrates data from MySQL to PostgreSQL  
├── db-config.js # MySQL database config  
├── pg-config.js # PostgreSQL config  
├── grade.txt # Grade input data  
├── students.txt # Student input data  
├── .env.example # Environment variable template  
├── reportgeneration/  
│ ├── report/ # Directory for log files  
│ └── report.js # Logger script  
└── package.json  

## 📦 Installation

```bash
git clone https://your-repo-url
cd integration-task
npm install
cp .env.example .env   # Then edit values in .env

