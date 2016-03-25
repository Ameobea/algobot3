/*
Trade Manager

This keeps track of open trades and does stuff like close them or enlarge them
based on rules that are set in the open positions collection.  See `tradeManager.md`
for more information about this module and the rules it parses.
*/
var ledger = require("../ledger");
var condEnv = require("./conditionEnvironment");
var conf = require("../../conf/conf");
var broker = require("../brokers/" + conf.public.broker);

var manager = exports;

manager.manageAll = (pair, db)=>{
  ledger.getOpenPositions(pair, {}, db, (positions)=>{
    positions.forEach((position)=>{
      manager.manage(position);
    });
  });
};

/*Called on each priceUpdate.  Conditions for each of the 
open positions are evaluated and actions are taken depending
on their results.  See trademanagers.md
*/
manager.manage = position=>{
  var actions = condEnv.getActions(position);

  position.conditions.forEach(condition=>{
    condition(env, position.status, actions);
  });
};

manager.verifyOpenPositions = ()=>{
  //TODO: Connect with broker and verify that positions we think are open
  // are actually open and positions that we don't have record of don't exist.
};
