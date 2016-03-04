var express = require("express");
var router = express.Router();
var conf = require("../../conf/conf");

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {ip: conf.public.managerServerIP+":"+conf.public.managerServerPort+"/"});
});

router.get('/sources/:file', function(req, res, next){
  res.render('sources/' + req.params.file.split(".")[0], {websocketIp: conf.private.websocketIp, ip: conf.public.managerServerIP+":"+conf.public.managerServerPort+"/"});
});

router.get("/monitor", function(req, res, next){
  res.render("monitor");
});

module.exports = router;
