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
var broker = require(`./brokers/${conf.public.broker}`);

var Promise = require("bluebird");
Promise.onPossiblyUnhandledRejection(function(error){
    throw error;
});

var positionsCache = []; //TODO: add functionality to get open positions from broker if bot fails
//TODO: Close all positions in case of an actualy emergency where we have open positions with broker of which we have no record

//called each tick and updates strategies with newest information.
tradeGen.eachTick = (data, db, callback)=>{
  var pair = data.pair;
  var crossStatus = "no";
  var curPairMomentums = data.curPairMomentums;

  /*TODO: Keep a local cache of all open positions and only update them 
    in the database when they are changed.  Since the only thing in the
    bot that changes positions in the database is this module, a local 
    copy can be used to start every tick.*/

  if(positionsCache = []){

  }
};
