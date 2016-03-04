"use strict";

var express = require("express");
var router = express.Router();
var backtest = require("../../backtest/backtest");
var dbUtils = require("../../db_utils/utils");

//URL: [ip]/api/backtest/[fast/live]/[pair]
//POST params: pair, startTime, [interval]
router.post("/backtest/start/:type/:pair", function(req, res, next){
  if(req.params.type.toLowerCase() == "fast"){
    res.send(backtest.fast(req.params.pair, req.body.startTime, req.body.interval));
  }else{
    res.send(backtest.live(req.params.pair, req.body.startTime));
  }
});

//URL: [ip]/api/backtest/stop/[pair]
//POST params: NONE
router.post("/backtest/stop/:pair", function(req, res, next){
  if(req.params.pair != "all"){
    res.send(backtest.stop(req.params.pair.toLowerCase()));
  }else{
    res.send(backtest.clearFlags(function(){}));
  }
});

//URL: [ip]/api/data/[pair]/[type]/[range]
//POST params: props = JSON-stringified object for mongo query
router.post("/data/:pair/:type/:range", function(req, res, next){
  dbUtils.fetchData(req.params.pair, req.params.type, JSON.parse(req.body.props), req.params.range, function(data){
    res.send(JSON.stringify(data));
  });
});

module.exports = router;
