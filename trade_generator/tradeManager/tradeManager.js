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

var Promise = require("bluebird");
Promise.onPossiblyUnhandledRejection(function(error){
    throw error;
});

var manager = exports;

/*Called on each priceUpdate for each open position.
Conditions for each of the open positions are evaluated
and actions are taken depending on their results.
See trademanagers.md
*/
manager.manage = (position, data, evaluated, db, vardb)=>{
  return new Promise((fulfill, reject)=>{
    if(!evaluated){
      evaluated = [];
    }

    var env = condEnv.getEnv(data, db, vardb);
    var actions = condEnv.getActions(env, position, broker);

    manager.iterConditions(position, env, actions, [], position=>{
      fulfill(position);
    });
  });
};

/*for each condition, evaluate and then
if it returns a new version of the position
use that to evaulate the other positions.*/
manager.iterConditions = (position, env, actions, evaled, callback)=>{
  var unevaledConditions = position.conditions.filter(condition=>{
    var inn = true;
    evaled.forEach(elem=>{
      if(condition.id == elem){
        inn = false;
      }
    });
    return inn;
  }); //don't evaluate already evaluated conditions

  if(unevaledConditions.length > 0){
    evaled.push(unevaledConditions[0].id); //add current condition to already evaluated list
    var func;
    eval("func = " + unevaledConditions[0].func);
    func.call(position, env, unevaledConditions[0].state, actions).then(newPosition=>{
      if(newPosition){//if the condition returned a new version of the position
        manager.iterConditions(newPosition, env, actions, evaled, callback);
      }else{
        manager.iterConditions(position, env, actions, evaled, callback);
      }
    }, ()=>{//rejection of condition = position closed.
      console.log("Condition rejected; position closed.");
      callback(false);
    }).catch(err=>{console.log("Inside func.call promise" + err);});
  }else{
    callback(position); //when all conditions are evaluated, return the updated position
  }
};

manager.verifyPositions = positionCache=>{
  broker.verifyPositions(positionCache);
  //TODO: Connect with broker and verify that positions we think are open
  // are actually open and positions that we don't have record of don't exist.
};
