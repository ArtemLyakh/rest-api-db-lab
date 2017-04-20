const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const config = require('./config');

const app = express();

MongoClient.connect(config.mongo.connectionString, (err, db) => {
  if (err) throw err;
  app.locals.mongo = db;
});

app.set('port', (process.env.PORT || 3000));
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');


app.use(express.static(__dirname + '/public'));


app.get('/', function(req, res) {
  res.send('Hello world');
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


app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


