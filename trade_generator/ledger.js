"use strict";
/*
Ledger

This module is responsible for keeping track of open positions for the bot
as well as managing the balance and utilisation of margin.  
*/
var ledger = exports;

var conf = require("../conf/conf");
var broker = require("./brokers/" + conf.public.broker);

var uuid = require("uuid64");

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
  return new Promise((fulfill, reject)=>{
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
  });
};

//size in dollars atm
//calls back with the ID of inserted position
ledger.openPosition = (pair, price, size, direction, conditions, db, callback)=>{
  ledger.updateBalance(-size, db, ()=>{
    var positions = db.collection("positions");

    broker.createLimitOrder(pair, size, direction).then(()=>{
      var doc = {id: uuid(), pair: pair,  conditions: conditions, openPrice: price,
        value: size, direction: direction, units: size/price};
      positions.insertOne(doc, (err, res)=>{
        callback(res.insertedId);
      });
    }).catch(err=>{console.log(err);});
  });
};

ledger.resizePosition = (position, multiplier, db)=>{
  return new Promise((fulfill, reject)=>{
    broker.resizePosition(position.pair, multiplier).then(()=>{
      db.collection("positions").updateOne({id: position.id}, {size: position.size * multiplier}).then(()=>{
        position.size = position.size * multiplier;
        fulfill(position);
      }).catch(err=>{console.log(err);});
    }).catch(err=>{console.log(err);});
  });
};

ledger.closePosition = (position, closePrice, db, callback)=>{
  broker.closePosition(position.pair, position.size).then(()=>{
    ledger.updateBalance(position.units * closePrice, db, ()=>{
      var doc = {id: position.id};
      db.collection("positions").removeOne(doc, callback);
    });
  }).catch(err=>{console.log(err);});
};
