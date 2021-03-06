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
--help/-h | displays arguments
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

if(argv.help || argv.h){
  console.log("node app.js --port 1000 --nomanager/--onlymanager --listen AUDUSD,USDCAD");
  process.exit(0);
}

if(conf.public.dumpDbOnStart && argv.onlymanager){
  backtest.clearFlags(()=>{});
  dbUtils.flush(()=>{});
}

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
        var pairs = argv.listen;
      }

      if(argv.l){
        var pairs = argv.l;
      }

      if(pairs != "ALL"){
        pairs = pairs.split(",");
      }

      console.log(pairs);

      tickGenerator.listen(pairs, argv.uuid);
    }else{
      tickGenerator.listen("ALL", argv.uuid);
    }

    core.start();

    if(conf.public.simulatedLedger){
      dbUtils.mongoConnect(db=>{
        ledger.init(conf.public.startingBalance, db);
      });
    }
  });
};
