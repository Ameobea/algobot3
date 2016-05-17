"use strict";
/*
Configutation Setting Descriptions
For each config setting, this file should contain a description of what it does for the bot.  
They are used both as a way to keep track of config settings and allow them to be queried programatically.
Private config definitions are held in desc.priv, and public in desc.pub
*/
var desc = {priv: {}, pub: {}};

//private config
desc.priv.appRoot = "Path relative to the server's root directory of the bot's root directory (example: /var/algobot3)";

desc.priv.mongodbIP = "Address of the mongodb server plus port in format 1.2.3.4:5000";
desc.priv.mongodbDatabase = "Name of the bot's database in monbodb";
desc.priv.websocketIp = "Address and port of websocket server in format ag.com:3000";
desc.priv.managerIp = "Address of manager server";

desc.priv.tickWriterOutputPath = "Absolute path to the directory that the TickWriter will output to";

desc.priv.tickRecorderOutputPath = "Absolute path to the directory that the TickRecorder will output to";

//public config
desc.pub.environment = "dev or prod";
desc.pub.dumpDbOnStart = "If true, mongodb will be completely wiped upon bot restart";

desc.pub.managerServerIP = "Address of the manager server in format test.com";
desc.pub.managerServerPort = "Port on which the manager server is running";

desc.pub.tickDataDirectory = "Absolute path to the directory where flatfile tick data for backtests if stored";
desc.pub.dbDumpDir = "Absolute path to the directory where mongodb database dumps are stored";

desc.pub.fastBacktestCheckInterval = "After this number of fast backtest iterations, a request will be made to the database to verify that the backtest has not been cancelled";
desc.pub.liveBacktestCheckInterval = "After this number of live backtest iterations, a request will be made to the database to verify that the backtest has not been cancelled";

desc.pub.accurateSMA = "Determines if an additional database query is made every time a moving average is calculated to get the tick that came before a matched set of ticks. ";

desc.pub.priceResolution = "Number of seconds of ticks to average before they are sent to the bot; minimum time length between price updates";
desc.pub.mongoDebug = "Enables mongodb debug logging to console";

desc.pub.momentumMultiplier = "The number that the momentum is multiplied by before being stored in the database";

desc.pub.storeRawTicks = "If true, raw ticks will be stored in the database for debug/analysis purposes";

desc.pub.monitoredAveragePeriods = "An array containing numbers which indicate the periods of averages that it will calculate";
desc.pub.monitoredMomentumPeriods = "An array containing the numbers which indicate the periods of momentums it will calculate";

desc.pub.pubTicks = "Set to true to enable incoming ticks to be broadcast to redis";
desc.pub.pubPrices = "Set to true to enable price updates to be broadcast to redis";
desc.pub.pubSmas = "Set to true to enable results from SMA calculations to be broadcast to redis";
desc.pub.pubMomentums = "Set to true to enable results from momentum calculations to be broadcast to redis";

desc.pub.averageCalcResolution = "Average period/this number = how often in seconds SMAs will be calculated.  Increase to increase rate of SMA calculations";
desc.pub.momentumCalcResolution = "Momentum period/this number = how often in seconds momentums will be calculated.  Increase to increase rate of momentum calculations";

desc.pub.live = "If false, live ticks will be ignored.  If true, backtest ticks will be ignored.";

desc.pub.mongoIndexRebuildPeriod = "Time in ms between mongodb index rebuilds";

desc.pub.backtestTimestampMultiplier = "Timestamps from backtests are multiplied by this before being sent to tick_generator";

desc.pub.simulatedLedger = "If set to true, enables simulated trading by ignoring broker API";
desc.pub.startingBalance = "Starting balance of simulated account in dollars";

desc.pub.broker = "The name of the file in trade_generator/brokers that will be used as broker API";

desc.pub.backtestType = "Type of backtest to run (normal, precalc, nostore)";

desc.pub.estimatedSpread = "When tick storage is off, this is the size of the spread used when opening positions.";

desc.pub.nostoreRetentionPeriod = "How many seconds of data to store internally during nostore backtests.  Must be high enough so that all queries find sufficient data";

desc.pub.instancePortRange = "In format [low,high], the range of avaliable ports for the bot's instances";

module.exports = desc;
