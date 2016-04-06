"use strict";
/*
Instance Spawner

This script creates new tick processor instances for the bot.
*/
var child_process = require("child_process");

var dbUtils = require("../db_utils/utils");
var conf = require("../conf/conf");

var spawner = exports;

spawner.spawnTickProcessor = (port, pairs)=>{
  return new Promise((f,r)=>{
    var listenString = "";
    pairs.forEach((pair, i)=>{
      listenString += pair;
      if(i < pairs.length){
        listenString += ",";
      }
    });
    console.log(listenString);

    var inst = child_process.spawn("node app.js", [`--port: ${port}`, "--nomanager", `--listen ${listenString}`], {cwd: conf.private.appRoot});

    inst.stdout.on("data", data=>{
      f(data);
    });
  });
};

//This creates a placeholder element in the instances collection with the generated port.
spawner.getOpenPort = ()=>{
  return new Promise((f,r)=>{
    dbUtils.mongoConnect(db=>{
      db.collection("instances").find().toArray().then(instances=>{
        var range = conf.public.instancePortRange;
        var port = spawner.portAttempt(range[0], range[1], instances);

        db.collection("instances").insertOne({type: "placeholder", port: port}, (err,res)=>{
          f(port);
        });
      });
    });
  });
};

spawner.portAttempt = (min, max, instances)=>{
  var portAttempt = Math.floor(Math.random() * (max - min + 1)) + min;
  var collisions = instances.filter(instance=>{return instance.port == portAttempt;});

  if(collisions.length === 0){
    return portAttempt;
  }else{
    return spawner.portAttempt(min, max, instances);
  }
};
