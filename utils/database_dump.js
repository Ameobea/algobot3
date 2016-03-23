/*jslint node: true */
"use strict";
/*
Database Dump Utility

Converts data in the mongoDB into csv files that can
be downloaded and verified for accuracy or analyzed.
*/
var Promise = require("promise");
var fs = require("fs");

var dbUtils = require("../db_utils/utils");

dbUtils.mongoConnect(db=>{
  var toProcess = [];

  toProcess.push(
    new Promise((fulfill, reject)=>{
      db.collection("prices").find().sort({timestamp: 1}).toArray((err, res)=>{
        if(res.length > 0){
          fulfill([res, "prices", ["timestamp", "pair", "price"]]);
        }else{
          fulfill(false);
        }
      });
    })
  );
  toProcess.push(
    new Promise((fulfill, reject)=>{
      db.collection("smas").find().sort({timestamp: 1}).toArray((err, res)=>{
        if(res.length > 0){
          fulfill([res, "smas", ["timestamp", "pair", "period", "value"]]);
        }else{
          fulfill(false);
        }
      });
    })
  );
  toProcess.push(
    new Promise((fulfill, reject)=>{
      db.collection("momentums").find().sort({timestamp: 1}).toArray((err, res)=>{
        if(res.length > 0){
          fulfill([res, "momentum", ["timestamp", "pair", "averagePeriod", "momentumPeriod", "momentum"]]);
        }else{
          fulfill(false);
        }
      });
    })
  );

  toProcess.push(
    new Promise((fulfill, reject)=>{
      db.collection("ticks").find().sort({timestamp: 1}).toArray((err, res)=>{
        if(res.length > 0){
          fulfill([res, "ticks", ["timestamp", "pair", "bid", "ask"]]);
        }else{
          fulfill(false);
        }
      });
    })
  );

  Promise.all(toProcess).then(res=>{
    var resLength = 0;
    res.forEach(element=>{
      if(element){
        resLength++;
      }
    });

    res.forEach((resArray, resIndex)=>{
      if(resArray){
        var resObject = resArray[0];
        var name = resArray[1];
        var keys = resArray[2];
        var outputString = "";

        keys.forEach((key, i)=>{
          outputString += key;
          if(i < keys.length-1){
            outputString += ",";
          }else{
            outputString += "\n";
          }
        });

        resObject.forEach((doc, i)=>{
          keys.forEach((key, i)=>{
            outputString += doc[keys[i]];
            if(i < keys.length-1){
              outputString += ",";
            }else{
              outputString += "\n";
            }
          });
        });

        fs.writeFile("/var/algobot3/utils/output/" + name + ".csv", outputString, ()=>{
          console.log("results file written to " + "/var/algobot3/utils/output/" + name + ".csv");
          if(resIndex == resLength-1){
            process.exit();
          }
        });
      }
    });
  });
});
