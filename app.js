var manager = require("./manager/manager");
var conf = require("./conf/conf");
var tickGenerator = require("./tick_generator/tick_generator");
var backtest = require("./backtest/backtest");
var core = require("./algo_core/core");
var dbUtil = require("./db_utils/utils");

dbUtil.init(function(){
  manager.start(conf.public.managerServerPort);
  tickGenerator.listen();
  core.start();

  if(conf.public.environment == "dev"){
    backtest.clearFlags(function(){});
    dbUtil.flush(function(){});
  }
});
