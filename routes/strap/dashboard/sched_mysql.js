var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');

router.get('/data', function (req, res) {
    getData(req, res);
});

router.get('/', function (req, res) {
    getChart(req, res);
});


module.exports = router;

function getData(req, res) {
    var partGrp = req.query.partGrp;
    var option = req.query.option;

    if (option === 'TD1') {
        dateCrit = `SYSDATE-1 AND SYSDATE`;
    } else {
        dateCrit = `SYSDATE-1 AND SYSDATE+3`;
    }

    let selectStatement = `SELECT * 
	                     FROM SCHED_T A 
	                    WHERE PART_GRP='${partGrp}' 
	                      AND SCHED_DT BETWEEN ${dateCrit} 
	                 ORDER BY SCHED_DT,SCHED_HR,PART_NO`;
    console.log(selectStatement);

    var bindVars = [];
    op.singleSQL(selectStatement, bindVars, req, res);

}



function getChart(req, res) {

    var partGrp = req.query.partGrp;
    var option = req.query.option;

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };


    var dateCrit;

    if (option === 'TD1') {
        dateCrit = `trunc(SYSDATE) AND trunc(SYSDATE)`;
    } else {
        dateCrit = `trunc(SYSDATE) AND trunc(SYSDATE+2)`;
    }


    function getHdr(conn, cb) {
        console.log("Getting Schedule Counts");

         let selectStatement = `SELECT * from CUST_SCHED_V
                                 where 1=1
                                   and PART_GRP='${partGrp}'
                                   and from_loc='Warehouse'
                                   and (SCHED_QTY + WIP_QTY + ASN_QTY + WH_QTY + DISP_QTY)<>0
                                   and SCHED_DT BETWEEN ${dateCrit}
                                   and ASN_DATE BETWEEN ${dateCrit}
                                   and STATUS_DT BETWEEN ${dateCrit}`;        
        
        console.log(selectStatement);

        let bindVars = [];
        op.singleSQL(selectStatement, bindVars, req, res);
    }

    
   
    function getCounts(conn, cb) {
        console.log("Getting Counts");

        let selectStatement = `SELECT COUNT(PART_NO) AS PARTCOUNT,
	                              SUM(QTY) AS PARTQTY 
	                         FROM SCHED_T
                                WHERE PART_GRP='${partGrp}' 
	                          AND SCHED_DT BETWEEN ${dateCrit}`;

        console.log(selectStatement);

        let bindVars = [];

        conn.execute(selectStatement
                , bindVars, {
                    outFormat: oracledb.OBJECT, // Return the result as Object
                    autoCommit: true// Override the default non-autocommit behavior
                }, function (err, result)
        {
            if (err) {
                console.log("Error Occured: ", err);
                cb(err, conn);
            } else {

                result.rows.forEach(function (row) {
                    parts.partCount = row.PARTCOUNT;
                    parts.partQty = row.PARTQTY;
                });

                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(parts));
                cb(null, conn);
            }

        });

    }

    async.waterfall(
            [doConnect,
                getHdr,
                getCounts
            ],
            function (err, conn) {
                if (err) {
                    console.error("In waterfall error cb: ==>", err, "<==");
                    res.status(500).json({message: err});
                }
                console.log("Done Waterfall");
                if (conn)
                    conn.close();
            });



}
