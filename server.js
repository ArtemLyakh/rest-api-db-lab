const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const mysql = require('mysql');
const config = require('./config');
const mongoRouter = require('./db/mongo/routes.js');
const mysqlRouter = require('./db/mysql/routes.js');

const app = express();

//подключение mongo
MongoClient.connect(config.mongo.connectionString, (err, db) => {
  if (err) throw err;
  app.locals.mongo = db;
});

//подключение mysql
app.locals.mysql = mysql.createPool({
    connectionLimit : 100,
    host     : config.mysql.server,
    user     : config.mysql.username,
    password : config.mysql.password,
    database : config.mysql.name,
    debug    :  false
});

app.set('port', (process.env.PORT || 3000));
app.set('salt', config.salt);

app.use(express.static(__dirname + '/public'));

app.use('/mongo', mongoRouter);
app.use('/mysql', mysqlRouter);

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


