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

var strat = require("./strategies/maCross1/maCross1");
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

  strat.getSignal(pair, crossStatus, db, function(signal){
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
              });
            });
          });
        }
      });
    }
  });

  strat.manage(pair, curPairMomentums[strat.config.momentumPeriod.toString()][strat.config.momentumCompPeriod.toString()], function(signal){
    if(signal){
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
    }
  });
}

tradeGen.getTick = function(pair, timestamp, db, callback){
  db.collection("ticks").find({timestamp: timestamp}).toArray(function(err, ticks){
    callback(ticks[0]);
  });
}
