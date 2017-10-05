var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');

router.get('/', function (req, res) {
    getData(req, res);
});

router.get('/detail', function (req, res) {
    getDetail(req, res);
});

router.delete('/', function (req, res) {
    removeData(req, res);
});

module.exports = router;


function getData(req, res) {
    var label = (req.query.label || '%') + '%';
    var binId = '';
    var partGrp = req.query.partGrp;
    var serialDt = '';
    var serial = (req.query.serial || '%') + '%';

    if (req.query.serialDt) {
        serialDt = `AND trunc(SERIAL_DT) = '${req.query.serialDt}'`;
    }

    if (req.query.binId) {
        binId = `AND BIN_ID = '${req.query.binId}'`;
    }

    var sqlStatement = `SELECT TRUNC(SERIAL_DT) as SERIAL_DT,BIN_LABEL,BIN_ID,PART_NO,COUNT(*) AS COUNT FROM SERIAL_T WHERE BIN_LABEL LIKE '${label}' ${serialDt} ${binId} AND SERIAL_NUM LIKE '${serial}' AND PART_GRP='${partGrp}' GROUP BY TRUNC(SERIAL_DT),BIN_LABEL,BIN_ID,PART_NO ORDER BY TRUNC(SERIAL_DT) DESC`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getDetail(req, res) {
    var label = (req.query.label || '%') + '%';
    var partGrp = req.query.partGrp;
    var sqlStatement = `SELECT * FROM SERIAL_T WHERE BIN_LABEL LIKE '${label}' AND PART_GRP='${partGrp}'`;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function removeData(req, res) {
    var label = (req.query.label || '%') + '%';
    var partGrp = req.query.partGrp;
    let sqlStatement = `DELETE FROM SERIAL_T WHERE BIN_LABEL LIKE '${label}' AND PART_GRP='${partGrp}'`;
    let bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

