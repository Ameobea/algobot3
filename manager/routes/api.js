"use strict";

var express = require("express");
var router = express.Router();
var http = require("http");

var conf = require("../../conf/conf");
var backtest = require("../../backtest/backtest");
var dbUtils = require("../../db_utils/utils");

//URL: [ip]/api/backtest/[fast/live]/[pair]
//POST params: pair, startTime, [interval]
router.post("/backtest/start/:type/:pair", (req, res, next)=>{
  var type = req.params.type.toLowerCase();

  if(type == "fast"){
    res.send(backtest.fast(req.params.pair, req.body.startTime, req.body.interval));
  }else if(type == "live"){
    res.send(backtest.live(req.params.pair, req.body.startTime));
  }else if(type == "precalced"){
    res.send(backtest.precalced(req.params.pair, req.body.startTime, req.body.endTime));
  }else if(type == "nostore"){
    res.send(backtest.nostore(req.params.pair, req.body.startTime));
  }
});

//URL: [ip]/api/backtest/stop/[pair]
//POST params: NONE
router.post("/backtest/stop/:pair", (req, res, next)=>{
  if(req.params.pair != "all"){
    res.send(backtest.stop(req.params.pair.toLowerCase()));
  }else{
    res.send(backtest.clearFlags(()=>{}));
  }
});

//URL: [ip]/api/data/[pair]/[type]/[range]
//POST params: props = JSON-stringified object for mongo query
router.post("/data/:pair/:type/:range", (req, res, next)=>{
  dbUtils.fetchData(req.params.pair, req.params.type, JSON.parse(req.body.props), req.params.range, function(data){
    res.send(JSON.stringify(data));
  });
});

router.get("/utils/dbFlush/", (req, res, next)=>{
  dbUtils.flush(()=>{
    res.send("Database flushed.");
  });
});

router.get("/utils/dbDump", (req, res, next)=>{
  dbUtils.dump(()=>{
    res.send("Database dumped to file!");
  });
});

router.get("/utils/dbRestore/:dbRestoreId", (req, res, next)=>{
  dbUtils.load(req.params.dbRestoreId.trim(), (a,b,c)=>{
    res.send("Database dump loaded.");
  });
});

router.get("/instances", (req, res, next)=>{
  dbUtils.getInstances().then(data=>{
    res.send(JSON.stringify(data));
  }, (err)=>{console.log(err);});
});

router.get("/instances/kill/:type/:data", (req, res, next)=>{
  if(req.params.type == "manager"){
    http.get({hostname: conf.private.managerIp, port: parseInt(req.params.data), path: "/api/kill"}, resp=>{
      resp.on("data", data=>{
        res.send(data);
      });
    });
  }
});

router.get("/ping", (req, res, next)=>{
  res.send("pong");
});

router.get("/kill", (req, res, next)=>{
  res.send(JSON.stringify({success: true}));
  console.log("Message to kill manager recieved.  Suiciding.");
  setTimeout(()=>{
    process.exit(0);
  }, 1000);
});

module.exports = router;
