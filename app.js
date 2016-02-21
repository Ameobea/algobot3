var manager = require("./manager/manager");
var conf = require("./conf/conf");

manager.start(conf.public.manager_server_port);
