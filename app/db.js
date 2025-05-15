const mysql = require('mysql2');

const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: 'Sqlserver5032.', // kendi şifreni koru
  database: 'gymdb'
});

module.exports = pool.promise();
