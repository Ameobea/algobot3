"use strict";
/*
Trade Logger

Records data about executed trades and the conditions that led to their executions.
*/
var tradeLogger = exports;

tradeLogger.logOpenTrade = function(pair, price, size, direction, timestamp, db){
  var directionWord;
  if(direction){
    directionWord = "Bought";
  }else{
    directionWord = "Sold";
  }

  var doc = {type: "open", timestamp: timestamp, pair: pair, openPrice: price, size: size, direction: direction};
  db.collection("tradeHistory").insertOne(doc, function(err, res){
    console.log(directionWord + " $" + size.toFixed(2) + " of " + pair + " at " + price);
  });
};

tradeLogger.logClosedTrade = function(pair, size, openPrice, closePrice, direction, timestamp, db){
  var directionNum;
  if(direction){
    directionNum = 1;
  }else{
    directionNum = -1;
  }
  var profit = 50 * size * (closePrice - openPrice) * directionNum;

  var doc = {type: "close", timestamp: timestamp, pair: pair, units: size, closePrice: closePrice, direction: direction};
  db.collection("tradeHistory").insertOne(doc, function(err, res){
    console.log("Closed position in " + pair + " for $" + profit + " profit");
  });
};
