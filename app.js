var manager = require("./manager/manager");
var conf = require("./conf/conf");
var tickGenerator = require("./tick_generator/tick_generator");
var backtest = require("./backtest/backtest");

manager.start(conf.public.managerServerPort);
tickGenerator.listen();

if(conf.public.environment == "dev"){
  backtest.clearFlags(function(){});
}
