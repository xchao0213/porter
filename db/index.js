module.exports = require('knex')({
    client: 'mysql',
    connection: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '123456',
        database: 'titan',
        charset: 'utf8mb4'
    }
})