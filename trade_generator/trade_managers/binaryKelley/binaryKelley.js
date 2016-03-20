"use strict";
/*
Binary Kelley Trade Management Strategy

See README.md
*/
var bk1 = exports;

var ledger = require("../../ledger");

bk1.betPercent = 2; //Why not??

bk1.getTradeSize = function(db, callback){
  ledger.getBalance(db, function(balance){
    callback(balance * bk1.betPercent * .01);
  });
}
