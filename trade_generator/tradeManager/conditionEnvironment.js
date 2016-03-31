"use strict";
/*
Condition Function Environment Functions

This file contains helper functons that supply information about positions
and market conditions to condition functions for open positions.  
*/
var Promise = require("bluebird");
Promise.onPossiblyUnhandledRejection(function(error){
    throw error;
});

var conditionEnvironment = exports;

conditionEnvironment.getActions = (position, broker)=>{
  var actions = {};

  actions.resizePosition = multiplier=>{
    return new Promise((fulfill, reject)=>{
      ledger.resizePosition(position, multiplier, db).then(()=>{
        fulfill(newPosition=>{
          position = newPosition;
        });
      });
    });
  };

  actions.closePosition = closePrice=>{
    return new Promise((fulfill, reject)=>{
      ledger.closePosition(position, closePrice, db, ()=>{
        fulfill();
      });
    });
  }

  actions.addCondition = condition=>{
    position.conditions.push(condition);
  };

  actions.removeCondition = id=>{
    position.conditions = position.conditions.filter(id=>{
      return id != position.id;
    });
  };

  return actions;
};

// data is the collection of information sent/maintained by the bot on each price update
conditionEnvironment.getEnv = (data)=>{
  var env = data;

  env.curMomentum = req=>{
    if(env.momentums[req.averagePeriod.toString()] && env.momentums[req.momentumPeriod.toString()]){
      return env.momentums[req.averagePeriod.toString()][req.momentumPeriod.toString()][1];
    }else{
      return false;
    }
  };

  env.curAverage = req=>{
    if(env.averages[req.period.toString()]){
      return env.averages[req.period.toString()][1];
    }else{
      return false;
    }
  };

  env.curCrossStatus = req=>{
    if(env.crosses[req.period.toString()] && env.crosses[req.period.toString()][req.momentumPeriod.toString()]){
      return env.crosses[req.period.toString()][req.momentumPeriod.toString()];
    }else{
      return false;
    }
  };

  env.fetchTick = (req, db)=>{
    var pair, timestamp;

    if(!req.cur){
      pair = req.pair;
      timestamp = req.timestamp;
    }else{
      pair = env.pair;
      timestamp = env.timestamp;
    }

    return new Promise((fulfill, reject)=>{
      db.collection("ticks").find({pair: pair, timestamp: timestamp}).toArray((err, ticks)=>{
        fulfill(ticks[0]);
      });
    });
  };

  return env;
};
