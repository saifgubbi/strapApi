var express = require('express');
var router = express.Router();

router.use('/invoice', require('./invoice'));
module.exports = router;