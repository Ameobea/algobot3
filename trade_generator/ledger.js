"use strict";
/*
Ledger

This module is responsible for keeping track of open positions for the bot
as well as managing the balance and utilisation of margin.  
*/
//TODO: Split up into multiple ledger modules for use with broker APIs.
var ledger = exports;

ledger.init = function(startingBalance, db){
  ledger.reset(db, function(){
    var account = db.collection("account");

    var doc = {type: "balance", balance: startingBalance};
    account.insertOne(doc, function(res){
      db.close();
    });
  });
};

ledger.reset = function(db, callback){
  var openPositions = db.collection("openPositions");

  openPositions.drop(function(err, res){
    db.collection("account").drop(function(err, res){
      db.collection("tradeHistory").drop(callback);
    });
  });
};

ledger.getBalance = function(db, callback){
  db.collection("account").find({type: "balance"}).toArray(function(err, balanceObject){
    callback(balanceObject[0].balance);
  });
};

ledger.updateBalance = function(diff, db, callback){
 ledger.getBalance(db, function(balance){
    db.collection("account").updateOne({type: "balance"}, {$set:{balance: balance + diff}}, function(){
      console.log("account credited " + diff);
      callback();
    });
  });
};

//if pair == ALL returns all positions
//descrim is an object passed to mongo which serve as a filter
ledger.getOpenPositions = function(pair, descrim, db, callback){
  var openPositions = db.collection("openPositions");

  if(pair != "ALL"){
    openPositions.find({}).toArray(function(err, res){
      callback(res);
    });
  }else{
    openPositions.find({}).toArray(function(err, res){
      callback(res);
    });
  }
};

//size in dollars atm
//calls back with the ID of inserted position
ledger.openPosition = function(pair, price, size, direction, db, callback){
  ledger.updateBalance(-size, db, function(){
    var openPositions = db.collection("openPositions");

    var doc = {pair: pair, openPrice: price, value: size, direction: direction, units: size/price};
    openPositions.insertOne(doc, function(err, res){
      callback(res.insertedId);
    });
  });
};

ledger.closePosition = function(id, closePrice, db, callback){
  var openPositions = db.collection("openPositions");

  openPositions.find({_id: id}).toArray(function(err, positionArray){
    if(positionArray.length > 0){
      var position = positionArray[0];
      ledger.updateBalance(position.units * closePrice, db, function(){
        var doc = {_id: id};
        openPositions.removeOne(doc, callback);
      });
    }
  });
};
