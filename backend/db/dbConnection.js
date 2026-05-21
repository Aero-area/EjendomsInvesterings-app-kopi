const sql = require('mssql');
require('dotenv').config();

// Samler databaseindstillinger fra miljøvariabler.
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT) || 1433,
    options: {
        encrypt: true,
        trustServerCertificate: false
    },
    connectionTimeout: 30000,
    requestTimeout: 30000
};
// Opretter en delt connection pool til Azure SQL.
const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Forbundet til Azure SQL');
        return pool;
    })
    .catch(error => {
        console.error('Fejl i databaseforbindelse:', error);
        throw error;
    });

module.exports = poolPromise;