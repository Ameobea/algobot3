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
    return new Promise((fulfill, reject)=>{
      ledger.resizePosition(position, multiplier, db).then(()=>{
        fulfill();
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
  var env = {};

  env.timestamp = data.timestamp;
  env.pair = data.pair;

  env.curMomentum = req=>{
    if(data.momentums[req.averagePeriod.toString()][req.momentumPeriod.toString()]){
      return data.momentums[req.averagePeriod.toString()][req.momentumPeriod.toString()][1];
    }else{
      return false;
    }
  };

  env.curAverage = req=>{
    if(data.averages[req.period.toString()]){
      return data.averages[req.period.toString()][1];
    }else{
      return false;
    }
  };

  env.curCrossStatus = req=>{
    if(data.crosses[req.period.toString()] && data.crosses[req.period.toString()][req.momentumPeriod.toString()]){
      return data.crosses[req.period.toString()][req.momentumPeriod.toString()];
    }else{
      return false;
    }
  };

  env.fetch.tick = (req, db)=>{
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
};
