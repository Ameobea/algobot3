var redis = require("redis");

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

dbUtils.init(()=>{
  gRedis = redis.createClient(); //global redis client

  dbUtils.indexIterator(false, conf.public.mongoIndexRebuildPeriod);

  manager.start(conf.public.managerServerPort);
  tickGenerator.listen();
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
