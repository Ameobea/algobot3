var express = require("express");
var router = express.Router();
var conf = require("../../conf/conf")

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {api_ip: conf.public.monitor_server_ip});
});

module.exports = router;
