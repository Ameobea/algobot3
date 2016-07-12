/*jslint node: true */
"use strict";
/*
Public Configuration Settings

These are general bot settings that govern how the bot works.  What exists here can
be though of a default options and should be committed to the repository.
*/

//TODO: Make checks on bot startup to verify config is correct

// TODO: Clearn up this config and split it into logical modules
// that correspond to the parts of the bot that it configures.
var publicConfig = exports;

// "dev" for development, "prod" for live
publicConfig.environment = "dev";
publicConfig.dumpDbOnStart = true;

publicConfig.managerServerIP = "new.ameobea.me";
publicConfig.managerServerPort = 3002;

publicConfig.tickDataDirectory = "/root/algobot3/tick_data/";
publicConfig.dbDumpDir = "/root/algobot3/db_dumps/";

/* After this number of backtest iterations, a request will be made to the database to
verify that the backtest has not been cancelled. */
publicConfig.fastBacktestCheckInterval = 1000;
publicConfig.liveBacktestCheckInterval = 15;

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
// publicConfig.monitoredAveragePeriods = [30,60,120,300,1000,3000,5000,10000];
// publicConfig.monitoredMomentumPeriods = [15,30,60,120,300,600,1000,3000,5000];
publicConfig.monitoredAveragePeriods = [30,1000,5000];
publicConfig.monitoredMomentumPeriods = [5000,3000];

//set these to true to enable calculations to be sent through redis pusub
publicConfig.pubTicks = false;
publicConfig.pubPrices = true;
publicConfig.pubSmas = true;
publicConfig.pubMomentums = true;

publicConfig.averageCalcResolution = 32;
publicConfig.momentumCalcResolution = 64;

//****If this is true, backtest ticks will be ignored.  If false, live ticks will be ignored.*****
publicConfig.live = false;

publicConfig.mongoIndexRebuildPeriod = 60 * 1000; //TODO: Get these to actually work

//timestamps from backtests are multiplied by this before being sent to tick_generator
publicConfig.backtestTimestampMultiplier = 0.001;

//don't talk to a broker for any trades; instead use simulated account.
publicConfig.simulatedLedger = true;
publicConfig.startingBalance = 32400;

//The name of the file in trade_generator/brokers that will be used as broker API
publicConfig.broker = "simulated";

//normal, precalc, nostore
publicConfig.backtestType = "normal";

//when tick storage is off, use this for opening positions during backtesting.
publicConfig.estimatedSpread = .0003;

//how many seconds of data to store internally during nostore backtests
publicConfig.nostoreRetentionPeriod = 25000;

//In format [low,high], the range of avaliable ports for the bot's instances.
publicConfig.instancePortRange = [3000,4000];
