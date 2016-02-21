var fs = require('fs');
var path = require('path');
var app_dir = path.dirname(require.main.filename);

var backtest = exports;

backtest.fast = function(pair, start_time, diff){
  //TODO: Verify that a backtest is not already running for the same pair
  //TODO: Set the flag that the backtest is running in the database.
  fs.readFile();
}

backtest.live = function(pair, start_time){
  //TODO: Verify that a backtest is not already running for the same pair
  //TODO: Set the flag that the backtest is running in the database.
  fs.readFile();
}

backtest.reset = function(){
  //TODO: Clear all running backtest flags from database.
}
