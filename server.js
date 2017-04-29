const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const mysql = require('mysql');
const config = require('./config');
const mongoRouter = require('./db/mongo/routes.js');

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
app.set('salt', "mysalt");
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');


app.use(express.static(__dirname + '/public'));


app.get('/', function(req, res) {
  res.render('doc.pug');
});


app.get('/test', (req, res) =>{
  let db = app.locals.mongo;

  let collection = db.collection('test');
  let doc1 = {'hello':'doc1'};
  let doc2 = {'hello':'doc2'};
  let lotsOfDocs = [{'hello':'doc3'}, {'hello':'doc4'}];

  collection.insert(doc1);

  collection.insert(doc2, {w:1}, function(err, result) {});

  collection.insert(lotsOfDocs, {w:1}, function(err, result) {});

  res.send('Done');
});


app.get('/mysql', (req, res) => {
  let db = app.locals.mysql;

  db.getConnection(function(err,connection){

    connection.query("select * from test", (err,rows) => {
      connection.release();
      if(!err) {
        res.json(rows);
      } else {
        res.json({error: true});
      } 
    }); 

  });
});

app.use('/mongo', mongoRouter);



app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


