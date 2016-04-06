//"use strict";
/*global: gRedis*/
/*
Algobot 3

This is the starting point for the algobot process.  See the
github repository's readmes for information about how to run.
*/
var redis = require("redis");
var argv = require("minimist")(process.argv.slice(2));
var uuid64 = require("uuid64");

var manager = require("./manager/manager");
var conf = require("./conf/conf");
var tickGenerator = require("./tick_generator/tick_generator");
var backtest = require("./backtest/backtest");

var coreString = conf.public.backtestType;
var tackon = "_core";
if(coreString == "normal"){
  coreString = "core";
  tackon = "";
}
var core = require(`./algo_core/${coreString}${tackon}`);

var dbUtils = require("./db_utils/utils");
var ledger = require("./trade_generator/ledger");

/*
Arguments:

--port: 3002 | manager server port (defaults to value in conf.public)
--nomanager | start without manager server (default false)
--onlymanager -m | start only the manager server. (default false)
--listen/-l AUDUSD,USDCAD,EURUSD | only listen for updates to the following list of pairs. (default all pairs)
*/

var startManager = ()=>{
  if(argv.nomanager){}else{
    var port = conf.public.managerServerPort;
    if(argv.port){
      port = argv.port;
    }

    manager.start(port);
  }
};

if(argv.onlymanager || argv.m){
  console.log("Starting only manager.");
  startManager();
}else{
  dbUtils.init(db=>{
    console.log("Starting tick processor...");
    gRedis = redis.createClient(); //global redis client

    dbUtils.indexIterator(false, conf.public.mongoIndexRebuildPeriod);

    if(!argv.nomanager){
      startManager();
    }

    if(argv.listen || argv.l){
      if(argv.listen){
        var pairs = argv.listen
      }

      if(argv.l){
        var pairs = argv.l;
      }

      if(pairs != "ALL"){
        pairs = pairs.split(",");
      }
      
      tickGenerator.listen(pairs);
    }else{
      tickGenerator.listen("ALL");
    }

    core.start();

    if(conf.public.simulatedLedger){
      dbUtils.mongoConnect(db=>{
        ledger.init(conf.public.startingBalance, db);
      });
    }

    if(conf.public.dumpDbOnStart){
      backtest.clearFlags(()=>{});
      dbUtils.flush(()=>{});
    }
  });
};

//pairs is an array of pairs to listen for.
//fulfills with the id of the newly spawned parser if able to
//rejects if one of the pairs is already listened to.
var parserSpawn = (pairs, db)=>{
  return new Promise((f,r)=>{
    db.collection("instances").find({type: "tickParser"}).toArray().then(instances=>{
      //TODO: Query to see if the instances are actually alive or not.

      var collisions = instances.filter(elem=>{
        var collision = false;

        pairs.forEach(pair=>{
          if(elem.pairs.indexOf(pair) != -1){
            collision = true;
          }
        });

        return collision;
      });

      if(collisions.length != 0){
        r();
      }else{
        db.collection.instances.insertOne({type: "tickParser", id: uuid64(), pairs: pairs}, (err, res)=>{
          f(id);
        });
      }
    });
  });
};

//Queries a tick parser via redis and fulfills true if it responds within 1 second
//otherwise fulfills false after 1 second.
var parserVerify = id=>{
  return new Promise((f,r)=>{
    var pub = redis.createClient();
    var sub = redis.createClient();
    sub.subscribe("instanceCommands");

    
  });
};
