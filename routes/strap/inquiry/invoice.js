var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');

router.get('/', function (req, res) {
    getData(req, res);
});

router.get('/pallet', function (req, res) {
    getPallets(req, res);
});

router.get('/bin', function (req, res) {
    getBins(req, res);
});


module.exports = router;

function getData(req, res) {

    /*Get the Search Parameters*/
    var eventId = (req.query.eventId || '%') + '%';
   // var invoice = (req.query.invoice || '%') + '%';
    var locId = (req.query.locId || '%') + '%';
    var status = (req.query.status || '%') + '%';
    
    var invoice = '';
    var part = '';
    var partGrp = '';
    var eventDt = '';

    if (req.query.eventDt) {
        eventDt = `AND EVENT_DATE = '${moment(req.query.eventDt).format("DD-MMM-YYYY")}'`;
    }

    if (req.query.invoice) {
        invoice = ` AND INVOICE_NUM LIKE '${req.query.invoice}%' `;
    }

    if (req.query.part) {
        part = ` AND PART_NO LIKE '${req.query.part}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND PART_GRP LIKE '${req.query.partGrp}%' `;
    }


    var sqlStatement = `SELECT * FROM EVENTS_T WHERE EVENT_TYPE='Invoice' EVENT_ID LIKE '${eventId}'  ${eventDt}  AND FROM_LOC LIKE '${locId}' AND EVENT_NAME LIKE '${status}' ${partGrp} ${invoice} ${part}`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getPallets(req, res) {

    /*Get the Search Parameters*/
    var invoice = (req.query.invoice || '%') + '%';
    var part = '';
    var partGrp = '';
    //var invoice = '';
   if (req.query.part) {
        part = ` AND PART_NO LIKE '${req.query.part}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND PART_GRP LIKE '${req.query.partGrp}%' `;
    }

    var sqlStatement = `SELECT * FROM PALLETS_T WHERE INVOICE_NUM= '${invoice}' ${partGrp} ${part} `;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getBins(req, res) {

    /*Get the Search Parameters*/
    var invoice = (req.query.invoice || '%') + '%';
    var part = '';
    var partGrp = '';
    //var invoice = '';
   if (req.query.part) {
        part = ` AND PART_NO LIKE '${req.query.part}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND PART_GRP LIKE '${req.query.partGrp}%' `;
    }

    var sqlStatement = `SELECT * FROM BINS_T WHERE INVOICE_NUM= '${invoice}' ${partGrp} ${part} ORDER BY BIN_ID`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}