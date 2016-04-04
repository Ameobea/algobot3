/*
Algobot 3

This is the starting point for the algobot process.  See the
github repository's readmes for information about how to run.
*/
var redis = require("redis");
var argv = require("minimist")(process.argv.slice(2));

var manager = require("./manager/manager");
var conf = require("./conf/conf");
var tickGenerator = require("./tick_generator/tick_generator");
var backtest = require("./backtest/backtest");

var coreString = conf.public.backtestType;
var tackon = "_core";
if(coreString == "normal"){
  coreString == "core";
  tackon = "";
}
var core = require(`./algo_core/${coreString}${tackon}`);

var dbUtils = require("./db_utils/utils");
var ledger = require("./trade_generator/ledger");

/*
Arguments:

--port: 3002 | manager server port
--nomanager | start without manager server
--onlymanager -m | start only the manager server.
--listen/-l AUDUSD,USDCAD,EURUSD | only listen for updates to the following list of pairs.
*/
console.log(argv);

var startManager = ()=>{
  if(argv.nomanager){}else{
    var port = conf.public.managerServerPort;
    if(argv.port){
      port = argv.port;
    }

    manager.start(port);
  }
}

if(argv.onlymanager || argv.m){
  console.log("Starting only manager.");
  startManager();
}else{
  dbUtils.init(()=>{
    gRedis = redis.createClient(); //global redis client

    dbUtils.indexIterator(false, conf.public.mongoIndexRebuildPeriod);

    startManager();

    if(argv.listen || argv.l){
      if(argv.listen){
        var pairs = argv.listen
      }

      if(argv.l){
        var pairs = argv.l;
      }

      pairs = pairs.split(",");
      tickGenerator.listen(pairs);
    }else{
      tickGenerator.listen();
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
}
