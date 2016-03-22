"use strict";
/*
Trade Generator

Makes the decision that the bot believes a position will go up/down, when, and by how much.  
Also reports the expected probability that the event will occur (which can be determined from backtesting)
and conditions on when the trade should be closed.  See README.md
*/
var tradeGen = exports;

var tradeLogger = require("./tradeLogger");
var ledger = require("./ledger");

var strat = require("./strategies/basicMomentumReversal/index");
var manager = require("./trade_managers/binaryKelley/binaryKelley")

tradeGen.config = {

}

//called each tick and updates strategies with newest information.
tradeGen.eachTick = function(pair, timestamp, curPairMomentums, newCrosses, db){
  var crossStatus = "no";

  if(newCrosses.length > 0){
    newCrosses.forEach(function(cross){
      if(cross.period == strat.config.maPeriod && cross.compPeriod == strat.config.maCompPeriod){
        crossStatus = cross.direction;
      }
    });
  }

  var momentum = curPairMomentums[strat.config.averagePeriod.toString()][strat.config.momentumPeriod.toString()][1];

  new Promise(function(fulfill, reject){
    strat.getSignal(pair, momentum, function(signal){
      if(signal){ //if it's time to make a trade
        ledger.getOpenPositions(pair, {}, db, function(positions){
          if(positions.length === 0){//not already a position open
            manager.getTradeSize(db, function(size){
              tradeGen.getTick(pair, timestamp, db, function(tick){
                if(signal.direction){
                  var openPrice = tick.bid;
                }else{
                  var openPrice = tick.ask;
                }

                ledger.openPosition(pair, openPrice, size, signal.direction, db, function(){
                  tradeLogger.logOpenTrade(pair, openPrice, size, signal.direction, timestamp, db);
                  fulfill(signal); //trade made and signal
                });
              });
            });
          }else{
            fulfill(signal); //no trade made + signal
          }
        });
      }else{
        reject(); //no signal
      }
    });
  }).then(function(signal){ //there was a signal
    ledger.getOpenPositions(pair, {direction: !signal.direction}, db, function(positions){
      positions.forEach(function(position){
        tradeGen.getTick(pair, timestamp, db, function(tick){
          if(position.direction){
            var closePrice = tick.ask;
          }else{
            var closePrice = tick.bid;
          }

          ledger.closePosition(position._id, closePrice, db, function(){
            tradeLogger.logClosedTrade(pair, position.units, position.openPrice, closePrice, position.direction, timestamp, db);
          });
        });
      });
    });
  }, function(signal){}).then(function(){ //need to catch the rejection in order to chain thens
    strat.updateStatus(pair, momentum);
  });
}

tradeGen.getTick = function(pair, timestamp, db, callback){
  db.collection("ticks").find({timestamp: timestamp}).toArray(function(err, ticks){
    callback(ticks[0]);
  });
}
