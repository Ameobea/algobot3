var express = require("express");
var router = express.Router();
var conf = require("../../conf/conf");

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {ip: conf.public.manager_server_ip+":"+conf.public.manager_server_port+"/"});
});

module.exports = router;
