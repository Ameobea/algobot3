/*
Private Configutation Settings

These are configuration settings that are dependant to the environment in which the
bot is being run.  They include things such as server ips, passwords, and other
sensitive information that should not be committed.
*/

var private = exports;

private.mongodbIP = "mongodb://localhost:27017";
private.mongodbDatabase = "bot3";
private.websocketIp = "1.2.3.4:3596"

privateConfig.tickWriterOutputPath = "/path/to/output/directory/";

privateConfig.tickRecorderOutputPath = "/path/to/output/directory/";
