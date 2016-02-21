var express = require('express');
var path = require("path");

var manager = exports;

manager.start = function(port){
  var app = express();

  var index = require('./routes/index');

  app.engine('html', require('ejs').renderFile);
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');
  app.listen(port);
  console.log("Manager webserver started!");

  app.use('/', index);

  // development error handler
  // will print stacktrace
  if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      console.log(err.stack);
      res.render('error', {
        message: err.message,
        error: err
      });
    });
  }

  // production error handler
  // no stacktraces leaked to user
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {}
    });
  });

  app.use(function(req, res, next) {
    res.status(404).send('Resource not found');
  });
}
