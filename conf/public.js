/*jslint node: true */
"use strict";
/*
Public Configuration Settings

These are general bot settings that govern how the bot works.  What exists here can
be though of a default options and should be committed to the repository.
*/

var publicConfig = exports;

// "dev" for development, "prod" for live
publicConfig.environment = "dev";

publicConfig.managerServerIP = "new.ameobea.me";
publicConfig.managerServerPort = 3002;

publicConfig.tickDataDirectory = "/var/algobot3/tick_data/";

/* After this number of backtest iterations, a request will be made to the database to
verify that the backtest has not been cancelled. */
publicConfig.fastBacktestCheckInterval = 100;
publicConfig.liveBacktestCheckInterval = 5;

/* Determines if an additional database query is made every time a moving average
is calculated to get the tick that came before a matched set of ticks. 

TODO: Replace with a threshold that sets this value depending on the
resolution of the average being calculated. */
publicConfig.accurateSMA = true;

//dynamically adjust based on server load?
publicConfig.priceResolution = 1; //5 = calc&store tick average every 5 seconds

//enables debug output to the console for mongodb connections
publicConfig.mongoDebug = false;

//number the momentum is multiplied by before being stored in the database
publicConfig.momentumMultiplier = 10000000;

//if true, raw ticks will be stored in the database for debug/analysis purposes.
publicConfig.storeRawTicks = true;

//TODO: Teach the bot how to pick these itself
//which average/momentum periods are calculated by the bot and monitored for crosses
publicConfig.monitoredAveragePeriods = [30,60,300,3000,5000,10000];
publicConfig.monitoredMomentumPeriods = [15,30,60,120,300,1000,3000,5000];

//set these to true to enable calculations to be sent through redis pusub
publicConfig.pubTicks = false;
publicConfig.pubPrices = true;
publicConfig.pubSmas = true;
publicConfig.pubMomentums = true;

publicConfig.averageCalcResolution = 8;
publicConfig.momentumCalcResolution = 16;

//****If this is true, backtest ticks will be ignored.  If false, live ticks will be ignored.*****
publicConfig.live = true;

publicConfig.mongoIndexRebuildPeriod = 600 * 1000;
