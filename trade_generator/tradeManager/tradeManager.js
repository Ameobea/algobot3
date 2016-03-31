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
manager.manage = (position, data, evaluated)=>{
  return new Promise((fulfill, reject)=>{
    console.log("manager.manage");
    if(!evaluated){
      evaluated = [];
    }

    var env = condEnv.getEnv(data);
    var actions = condEnv.getActions(position);

    manager.iterConditions(position, data, env, actions, [], condition=>{
      fulfill(condition);
    });
  });
};

/*for each condition, evaluate and then 
if it returns a new version of the position
use that to evaulate the other positions.*/
manager.iterConditions = (position, data, env, actions, evaled, callback)=>{
  console.log("iterconditions");
  var unevaledConditions = position.conditions.filter(condition=>{
    return !(condition.id in evaled);
  }); //don't evaluate already evaluated conditions

  evaled.push(unevaledConditions[0].id); //add current condition to already evaluated list

  if(unevaledConditions.length > 0){
    console.log("Evaluationg condition...");
    var func = eval(unevaledConditions[0].func);
    func(env, unevaledConditions[0].state, actions).then(newPosition=>{ //***TODO: make these callbacks work.
      if(newPosition){//if the condition returned a new version of the position
        console.log("Evaluating next condition with new position");
        manager.iterConditions(newPosition, data, env, actions, evaled, callback);
      }else{
        manager.iterConditions(position, data, env, actions, evaled, callback);
      }
    });
  }else{
    console.log("Done evaluating all conditions for position");
    callback(position); //when all conditions are evaluated, return the updated position
  } 
};

manager.verifyPositions = positionCache=>{
  broker.verifyPositions(positionCache);
  //TODO: Connect with broker and verify that positions we think are open
  // are actually open and positions that we don't have record of don't exist.
};
