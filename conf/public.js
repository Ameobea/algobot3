/*
Public Configuration Settings

These are general bot settings that govern how the bot works.  What exists here can
be though of a default options and should be committed to the repository.
*/

var public = exports;

// "dev" for development, "prod" for live
public.environment = "dev";

public.managerServerIP = "new.ameobea.me";
public.managerServerPort = 3002;

public.tickDataDirectory = "/var/algobot3/tick_data/";

/* After this number of backtest iterations, a request will be made to the database to
verify that the backtest has not been cancelled. */
public.fastBacktestCheckInterval = 100;
public.liveBacktestCheckInterval = 5;

/* Determines if an additional database query is made every time a moving average
is calculated to get the tick that came before a matched set of ticks. 

TODO: Replace with a threshold that sets this value depending on the
resolution of the average being calculated. */
public.accurateSMA = true;

//dynamically adjust based on server load?
public.priceResolution = 1; //5 = calc&store tick average every 5 seconds

//enables debug output to the console for mongodb connections
public.mongoDebug = false;

//number the momentum is multiplied by before being stored in the database
public.momentumMultiplier = 10000000;

//if true, raw ticks will be stored in the database for debug/analysis purposes.
public.storeRawTicks = true;

//which average/momentum periods are calculated by the bot and monitored for crosses
public.monitoredAveragePeriods = [10,30,60,300,3000];
public.monitoredMomentumPeriods = [60,120,300,1000];

//set these to true to enable calculations to be sent through redis pusub
public.pubTicks = false;
public.pubPrices = true;
public.pubSmas = true;
public.pubMomentums = true;

public.averageCalcResolution = 6;
public.MomentumCalcResolution = 8;

//****If this is true, backtest ticks will be ignored.  If false, live ticks will be ignored.*****
public.live = true;
