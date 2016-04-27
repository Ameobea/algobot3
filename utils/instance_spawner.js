"use strict";
/*
Instance Spawner

This script creates new tick processor instances for the bot.
*/
var child_process = require("child_process");
var redis = require("redis");

var dbUtils = require("../db_utils/utils");
var conf = require("../conf/conf");

var spawner = exports;

spawner.spawnTickParser = pairs=>{
  return new Promise((f,r)=>{
    var listenString = "";

    var inst = child_process.spawn("node", ["app.js", "--nomanager", `--listen`, pairs], {cwd: conf.private.appRoot});

    inst.stdout.on("data", data=>{
      f(data.toString());
    });
  });
};

//Queries a tick parser via redis and fulfills true if it responds within 1 second
//otherwise fulfills false after 1 second.
spawner.checkRunning = ()=>{
  return new Promise((f,r)=>{
    var pub = redis.createClient();
    var sub = redis.createClient();
    sub.subscribe("instanceCommands");

    sub.on("subscribe", ()=>{
      pub.publish("instanceCommands", JSON.stringify({command: "ping"}));

      var alive = []
      sub.on("message", (channel, message)=>{
        var parsed = JSON.parse(message);

        if(parsed.status == "alive"){
          alive.push(parsed.id);
        }
      });

      setTimeout(()=>{
        f(alive);
      }, 1000)
    });
  });
};

spawner.getInstances = ()=>{
  return new Promise((f,r)=>{
    dbUtils.mongoConnect(db=>{
      db.collection("instances").find().toArray((err, instances)=>{
        var nonTickParser = [];
        var toDelete = {$or: []};
        var alive = [];

        spawner.checkRunning().then(onlineTickParsers=>{
          instances.forEach(instance=>{
            if(instance.type == "tickParser"){
              var index = onlineTickParsers.indexOf(instance.id);

              if(index == -1){
                toDelete.$or.push({id: instance.id});
              }else{
                alive.push(instance);
              }
            }else{
              nonTickParser.push(instance);
            }
          });

          if(toDelete.$or.length > 0){
            db.collection("instances").deleteMany(toDelete, (err, done)=>{
              if(!err){ //dead instances are out of DB.
                db.collection("backtestFlags").find().toArray((err, flags)=>{
                  f({backtests: flags, instances: alive.concat(nonTickParser)});
                  db.close();
                });
              }else{
                console.log(err);
              }
            });
          }else{
            db.collection("backtestFlags").find().toArray((err, flags)=>{
              f({backtests: flags, instances: alive.concat(nonTickParser)});
              db.close();
            });
          }
        });
      });
    });
  });
};

//What used to be here is what happens you you get 4 hours of sleep
//and then code until 2AM on a Tuseday night.
