/*jslint node: true */
"use strict";
/*
FXCM Historical Data Downloader

Using the FXCM Broker API, this utility pulls down historical ticks from their trade servers
in conjunction with the tick_recorder java application which serves as the link to their API.

Requests are made to that application over redis which are then procesed, sent to the FXCM servers,
and sent back as a redis reply.  
*/
var redis = require("redis"); //TODO: Intelligently skip weekends
var fs = require("fs");

var conf = require("../../conf/conf");

//unix timestamp format.
var pair = "usdcad"; //like "usdcad"
var startTime = 1451887200 * 1000; //like 1393826400 * 1000
var endTime = 1459531254 * 1000;

//time between data requests
var downloadDelay = 150;

//0 = no logging, 1 = error logging, 2 = log EVERYTHING
var logLevel = 2;

var redisPubclient = redis.createClient();
var redisSubClient = redis.createClient();
redisSubClient.subscribe("historicalPrices");

//TODO
/*
This downloader will queue up a ton of price segments all at once instead of
waiting for the result of the first one before sending the next request.  

States of the downloads will be stored in an array that contains the ids of the
pending segments.  The same download waiter from the first script can be used in
this case but launched many times asynchronously in order to download faster.
*/
