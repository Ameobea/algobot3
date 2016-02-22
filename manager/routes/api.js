var express = require("express");
var router = express.Router();
var backtest = require("../../backtest/backtest");

//URL: [ip]/api/backtest/[fast/live]/[pair]
//POST params: pair, startTime, [interval]
router.post('/backtest/start/:type/:pair', function(req, res, next){
  if(req.params.type.toLowerCase() == "fast"){
    backtest.fast(req.params.pair, req.body.startTime, req.body.interval);
  }else{
    backtest.live(req.params.pair, req.body.startTime);
  }
  //TODO: Return status code
});

//URL: [ip]/api/backtest/stop/[pair]
//POST params: NONE
router.post("/backtest/stop/:pair", function(req, res, next){
  backtest.stop(req.params.pair);
  //TODO: Return status code
});

module.exports = router;
