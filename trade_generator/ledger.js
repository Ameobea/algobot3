"use strict";
/*
Ledger

This module is responsible for keeping track of open positions for the bot
as well as managing the balance and utilisation of margin.  
*/
var ledger = exports;

var Promise = require("bluebird");
Promise.onPossiblyUnhandledRejection(function(error){
    throw error;
});

ledger.init = (startingBalance, db)=>{
  ledger.reset(db, ()=>{
    var account = db.collection("account");

    var doc = {type: "balance", balance: startingBalance};
    account.insertOne(doc, res=>{
      db.close();
    });
  });
};

ledger.reset = (db, callback)=>{
  var positions = db.collection("positions");

  positions.drop((err, res)=>{
    db.collection("account").drop((err, res)=>{
      db.collection("tradeHistory").drop(callback);
    });
  });
};

ledger.getBalance = (db, callback)=>{
  db.collection("account").find({type: "balance"}).toArray(function(err, balanceObject){
    callback(balanceObject[0].balance);
  });
};

ledger.updateBalance = (diff, db, callback)=>{
 ledger.getBalance(db, balance=>{
    db.collection("account").updateOne({type: "balance"}, {$set:{balance: balance + diff}}, ()=>{
      console.log("account credited " + diff);
      callback();
    });
  });
};

//if pair == ALL returns all positions
//descrim is an object passed to mongo which serve as a filter
ledger.getPositions = (pair, descrim, db)=>{
  return new Promise(fulfill, reject){
    var positions = db.collection("positions");

    if(pair != "ALL"){
      positions.find({}).toArray((err, res)=>{
        fulfill(res);
      });
    }else{
      positions.find({}).toArray((err, res)=>{
        fulfill(res);
      });
    }
  }
};

//size in dollars atm
//calls back with the ID of inserted position
ledger.openPosition = (pair, price, size, direction, db, callback)=>{
  ledger.updateBalance(-size, db, ()=>{
    var positions = db.collection("positions");

    var doc = {pair: pair, openPrice: price, value: size, direction: direction, units: size/price};
    positions.insertOne(doc, (err, res)=>{
      callback(res.insertedId);
    });
  });
};

ledger.closePosition = (id, closePrice, db, callback)=>{
  var positions = db.collection("positions");

  positions.find({_id: id}).toArray((err, positionArray)=>{
    if(positionArray.length > 0){
      var position = positionArray[0];
      ledger.updateBalance(position.units * closePrice, db, ()=>{
        var doc = {_id: id};
        positions.removeOne(doc, callback);
      });
    }
  });
};
