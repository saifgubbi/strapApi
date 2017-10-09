var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getData(req, res);
});

router.get('/pallet', function (req, res) {
    getPallets(req, res);
});

router.get('/bin', function (req, res) {
    getBins(req, res);
});

router.get('/serial', function (req, res) {
    getSerial(req, res);
});

router.get('/details', function (req, res) {
    getDetails(req, res);
});

module.exports = router;

function getData(req, res) {

    /*Get the Search Parameters*/
   // var eventId = (req.query.eventId || '%') + '%';
   // var invoice = (req.query.invoice || '%') + '%';
    var locType = (req.query.locType || '%') + '%';
    //var status = (req.query.status || '%') + '%';
   // var fromLoc = (req.query.fromLoc || '%') + '%';
   // var toLoc = (req.query.toLoc || '%') + '%';
    var invId = '';
    var partNo = '';
    var partGrp = '';
    var serDt = '';

    if (req.query.serDt) {
        serDt = `AND SERIAL_DT = '${moment(req.query.serDt).format("DD-MMM-YYYY")}'`;
    }

    if (req.query.invId) {
        invId = ` AND WH_INVOICE LIKE '${req.query.invId}%' OR CUST_INVOICE LIKE '${req.query.invId}%'`;
    }

    if (req.query.partNo) {
        partNo = ` AND PART_NO LIKE '${req.query.partNo}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND PART_GRP LIKE '${req.query.partGrp}%' `;
    }

    //console
    var sqlStatement =`SELECT SERIAL_DT,SERIAL_NUM,BIN_ID,PART_NO,WH_INVOICE,CUST_INVOICE,PALLET_ID,STATUS
                         FROM SERIAL_T
                        WHERE 1=1 ${serDt} ${invId} ${partNo} ${partGrp}
                          AND STATUS<>'New'
                        ORDER BY SERIAL_DT DESC`;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getPallets(req, res) {

    /*Get the Search Parameters*/
    var serNum = (req.query.serNum || '%') + '%';
    var part = '';
    var partGrp = '';
    //var invoice = '';
   if (req.query.part) {
        part = ` AND PART_NO LIKE '${req.query.part}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND PART_GRP LIKE '${req.query.partGrp}%' `;
    }

    var sqlStatement = `SELECT * 
                          FROM PALLETS_T P, SERIAL_T S 
                         WHERE P.PALLET_ID=S.PALLET_ID
                           AND S.SERIAL_NUM LIKE '${serNum}' ${partGrp} ${part} 
                          ORDER BY PALLET_ID`;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function getBins(req, res) {

    /*Get the Search Parameters*/
    var serNum = (req.query.serNum || '%') + '%';
    var part = '';
    var partGrp = '';
   if (req.query.part) {
        part = ` AND PART_NO LIKE '${req.query.part}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND PART_GRP LIKE '${req.query.partGrp}%' `;
    }

    var sqlStatement = `SELECT * 
                          FROM BINS_T B, SERIAL_T S  
                         WHERE B.BIN_ID=S.BIN_ID
                           AND S.SERIAL_NUM LIKE '${serNum}' ${partGrp} ${part}
                      ORDER BY BIN_ID`;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getSerial(req, res) {

    /*Get the Search Parameters*/
    var serNum = (req.query.serNum || '%') + '%';
    var part = '';
    var partGrp = '';
   if (req.query.part) {
        part = ` AND PART_NO LIKE '${req.query.part}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND PART_GRP LIKE '${req.query.partGrp}%' `;
    }

    var sqlStatement = `SELECT S2.SERIAL_NUM,S2.BIN_ID,S2.PALLET_ID,S2.CUST_INVOICE,S2.WH_INVOICE,S2.STATUS
                          FROM SERIAL_T S1, SERIAL_T S2
                         WHERE S1.SERIAL_NUM LIKE '${serNum}'
                           AND S1.BIN_ID=S2.BIN_ID
                           AND S1.CUST_INVOICE=S2.CUST_INVOICE
                           AND S1.WH_INVOICE=S2.CUST_INVOICE ${partGrp} ${part} ORDER BY SERIAL_NUM`;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getDetails(req, res) {

    /*Get the Search Parameters*/
    var serNum = (req.query.serNum || '%') + '%';
   // var invoice = (req.query.invoice || '%') + '%';
    var locType = (req.query.locType || '%') + '%';
    var status = (req.query.status || '%') + '%';
    
    var part = '';
    var partGrp = '';

    

        if (req.query.part) {
        part = ` AND B.PART_NO LIKE '${req.query.part}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND A.PART_GRP LIKE '${req.query.partGrp}%' `;
    }

    //console
    var sqlStatement =`SELECT A.EVENT_ID NEW_BIN_ID,A.REF_ID OLD_BIN_ID,A.EVENT_NAME,A.EVENT_DATE,B.STATUS_DT,A.PART_NO,B.INVOICE_NUM ,A.SERIAL_NUM 
                                  FROM EVENTS_T A,BINS_T B
                                WHERE EVENT_TYPE = 'Bin' 
                                  AND A.SERIAL_NUM=LIKE '${serNum}'
                                  AND A.EVENT_ID=B.BIN_ID
                                  AND EVENT_NAME='Picked'
                             ORDER BY EVENT_TS DESC`;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}