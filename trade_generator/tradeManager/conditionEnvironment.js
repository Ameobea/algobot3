"use strict";
/*
Condition Function Environment Functions

This file contains helper functons that supply information about positions
and market conditions to condition functions for open positions.  
*/
var conditionEnvironment = exports;

conditionEnvironment.getActions = (position, broker)=>{
  var actions = {};

  actions.resizePosition = multiplier=>{
    var diff = (position.size * amount) - position.size;

    broker.resizePosition(pair, diff);
  }

  return actions;
};

// data is the collection of information sent/maintained by the bot on each price update
conditionEnvironment.getEnvironment = (position, data)=>{
  var env = {};

  env.bid = data.bid;
  env.ask = data.ask;
  env.timestamp = data.timestamp;

  env.curMomentum = req=>{
    if(data.momentums[req.averagePeriod.toString()][req.momentumPeriod.toString()]){
      return data.momentums[req.averagePeriod.toString()][req.momentumPeriod.toString()][1];
    }else{
      return false;
    }
  }

  env.curAverage = req=>{
    if(data.smas[req.period.toString()]){
      return data.smas[req.period.toString()][1];
    }else{
      return false;
    }
  }

  env.fetch.tick = (pair, timestamp, db)=>{
    return new Promise((fulfill, reject)=>{
      db.collection("ticks").find({pair: pair, timestamp: timestamp}).toArray((err, ticks)=>{
        fulfill(ticks[0]);
      });
    }
  }


};
