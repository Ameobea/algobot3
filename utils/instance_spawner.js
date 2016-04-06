"use strict";
/*
Instance Spawner

This script creates new tick processor instances for the bot.
*/
var child_process = require("child_process");

var dbUtils = require("../db_utils/utils");
var conf = require("../conf/conf");

var spawner = exports;

spawner.spawnTickParser = pairs=>{
  return new Promise((f,r)=>{
    var listenString = "";

    if(pairs != "ALL"){
      pairs.forEach((pair, i)=>{
        listenString += pair;
        if(i < pairs.length-1){
          listenString += ",";
        }
      });
    }else{
      listenString = "ALL";
    }

    var inst = child_process.spawn("node", ["app.js", "--nomanager", `--listen ${listenString}`], {cwd: conf.private.appRoot});

    inst.stdout.on("data", data=>{
      console.log(data);
      f(data.toString());
    });
  });
};

spawner.checkRunning
//What used to be here is what happens you you get 4 hours of sleep
//and then code until 2AM on a Tuseday night.
