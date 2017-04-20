var cool = require('cool-ascii-faces');
var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 3000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.get('/cool', function(request, responce){
  responce.send(cool());
});

app.get('/times', function(request, responce){
  var result = '';
  var times = process.env.TIMES || 5;
  for (var i = 0; i < times; i++) {
    result += i + ' ';
  }
  responce.send(result);
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


