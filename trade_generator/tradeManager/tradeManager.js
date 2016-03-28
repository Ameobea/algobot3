"use strict";
/*
Trade Manager

This keeps track of open trades and does stuff like close them or enlarge them
based on rules that are set in the open positions collection.  See `tradeManager.md`
for more information about this module and the rules it parses.
*/
var condEnv = require("./conditionEnvironment");
var conf = require("../../conf/conf");
var broker = require("../brokers/" + conf.public.broker);

var manager = exports;

/*Called on each priceUpdate for each open position.  
Conditions for each of the open positions are evaluated
and actions are taken depending on their results.
See trademanagers.md
*/
manager.manage = (position, data, evaluated)=>{
  return new Promise((fulfill, reject)=>{
    if(!evaluated){
      evaluated = [];
    }

    var env = condEnv.getEnv(position, data);
    var actions = condEnv.getActions(position);

    manager.iterConditions(position, data, env, actions, [], (condition)=>{
      fulfill(condition);
    });
  });
};

manager.iterConditions = (position, data, env, actions, evaled, callback)=>{
  var toEval = position.conditions.filter(condition=>{
    return !(condition in evaled);
  }); //don't evaluate already evaluated conditions

  evaled.push(toEval[0]); //add current condition to already evaluated list

  toEval[0](env, position.status, actions).then(newPosition=>{
    if(newPosition){
      manager.iterConditions(newPosition, data, env, actions, evaled, callback);
    }else{
      manager.iterConditions(position, data, env, actions, evaled, callback);
    }
  });
};

manager.verifyPositions = positionCache=>{
  broker.verifyPositions(positionCache);
  //TODO: Connect with broker and verify that positions we think are open
  // are actually open and positions that we don't have record of don't exist.
};
