/*
Trade Manager

This keeps track of open trades and does stuff like close them or enlarge them
based on rules that are set in the open positions collection.  See `tradeManager.md`
for more information about this module and the rules it parses.
*/
var ledger = require("./ledger");

var manager = exports;

manager.manageAll = (pair, db)=>{
  ledger.getOpenPositions(pair, {}, db, (positions)=>{
    positions.forEach((position)=>{
      var manageDoc = position.manage;
    });
  });
}

manager.getCurProfit = position=>{

}

manager.managePosition = manageDoc=>{
  
}
