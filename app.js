var redis = require("redis");

var manager = require("./manager/manager");
var conf = require("./conf/conf");
var tickGenerator = require("./tick_generator/tick_generator");
var backtest = require("./backtest/backtest");
var core = require("./algo_core/core");
var dbUtils = require("./db_utils/utils");

dbUtils.init(function(){
  gRedis = redis.createClient(); //global redis client

  dbUtils.indexIterator(false, conf.public.mongoIndexRebuildPeriod);

  manager.start(conf.public.managerServerPort);
  tickGenerator.listen();
  core.start();

  if(conf.public.environment == "dev"){
    backtest.clearFlags(function(){});
    dbUtils.flush(function(){});
  }
});
