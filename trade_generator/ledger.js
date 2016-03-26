"use strict";
/*
Ledger

This module is responsible for keeping track of open positions for the bot
as well as managing the balance and utilisation of margin.  
*/
//TODO: Split up into multiple ledger modules for use with broker APIs.
var ledger = exports;

ledger.init = (startingBalance, db)=>{
  ledger.reset(db, ()=>{
    var account = db.collection("account");

    var doc = {type: "balance", balance: startingBalance};
    account.insertOne(doc, res=>{
      db.close();
    });
  });
};//TODO: Rename openPositions collection to just positions

ledger.reset = (db, callback)=>{
  var openPositions = db.collection("openPositions");

  openPositions.drop((err, res)=>{
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
ledger.getOpenPositions = (pair, descrim, db, callback)=>{
  var openPositions = db.collection("openPositions");

  if(pair != "ALL"){
    openPositions.find({}).toArray((err, res)=>{
      callback(res);
    });
  }else{
    openPositions.find({}).toArray((err, res)=>{
      callback(res);
    });
  }
};

//size in dollars atm
//calls back with the ID of inserted position
ledger.openPosition = (pair, price, size, direction, db, callback)=>{
  ledger.updateBalance(-size, db, ()=>{
    var openPositions = db.collection("openPositions");

    var doc = {pair: pair, openPrice: price, value: size, direction: direction, units: size/price};
    openPositions.insertOne(doc, (err, res)=>{
      callback(res.insertedId);
    });
  });
};

ledger.setOpenPositions = 

ledger.closePosition = (id, closePrice, db, callback)=>{
  var openPositions = db.collection("openPositions");

  openPositions.find({_id: id}).toArray((err, positionArray)=>{
    if(positionArray.length > 0){
      var position = positionArray[0];
      ledger.updateBalance(position.units * closePrice, db, ()=>{
        var doc = {_id: id};
        openPositions.removeOne(doc, callback);
      });
    }
  });
};
