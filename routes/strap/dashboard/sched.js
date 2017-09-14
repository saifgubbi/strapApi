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
    var parts = {schedSeries: [], schedGroups: [], partCount: 0, partQuantity: 0};

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
        dateCrit = `trunc(SYSDATE) AND trunc(SYSDATE+3)`;
    }


    function getHdr(conn, cb) {
        console.log("Getting Schedule Counts");

        let selectStatement = `SELECT PART_NO,
	                              CUST_PART_NO,
			              SUM(QTY) as QTY,
			              SUM(WIP_QTY) as WIP_QTY 
	                         FROM SCHED_T A 
	                        WHERE PART_GRP='${partGrp}' 
	                          AND SCHED_DT BETWEEN ${dateCrit} 
	                     GROUP BY PART_NO,CUST_PART_NO`;
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
                    var seriesObj = {name: row.PART_NO, items: [{y: row.QTY, label: row.QTY}, {y: row.WIP_QTY, label: row.WIP_QTY}, {y: 0, label: 0}, {y: 0, label: 0}, {y: 0, label: 0}]};
                    parts.schedSeries.push(seriesObj);
                });

                parts.schedGroups = ['Sched Qty', 'WIP Qty', 'ASN Qty', 'WH Qty','Disp Qty'];

                cb(null, conn);
            }

        });

    }

    function getASN(conn, cb) {
        console.log("Getting ASN Count");


        let selectStatement = `SELECT PART_NO,
	                              CUST_PART_NO,
			              SUM(QTY) as QTY 
	                         FROM ASN_T A 
	                        WHERE PART_GRP='${partGrp}' 
	                          AND TRUNC(ASN_DATE) BETWEEN ${dateCrit} 
	                     GROUP BY PART_NO,CUST_PART_NO`;
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

                    parts.schedSeries.forEach(function (seriesObj) {
                        if (seriesObj.name === row.PART_NO) {
                            seriesObj.items[2].y = row.QTY;
                            seriesObj.items[2].label = row.QTY;
                        }
                    });

                });


                cb(null, conn);
            }

        });

    }


    function getStock(conn, cb) {
        console.log("Getting Stock Count");

        let selectStatement = `SELECT A.PART_NO,
	                              SUM(A.QTY) as QTY 
		                 FROM BINS_T A , 
		                      PARTS_T B,
			              LOCATIONS_T C 
	                        WHERE B.PART_GRP='${partGrp}' 
	                          AND A.STATUS <> 'Dispatched'
		                  AND C.TYPE='Warehouse' 
		                  AND A.PART_NO=B.PART_NO 
		                  AND A.FROM_LOC = C.LOC_ID 
		             GROUP BY A.PART_NO`;
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

                    parts.schedSeries.forEach(function (seriesObj) {
                        if (seriesObj.name === row.PART_NO) {
                            seriesObj.items[3].y = row.QTY;
                            seriesObj.items[3].label = row.QTY;
                        }
                    });

                });


                cb(null, conn);
            }

        });

    }


    function getDispatched(conn, cb) {
        console.log("Getting Dispatched Counts");

        let selectStatement = `SELECT A.PART_NO,
	                              SUM(A.QTY) AS QTY 
	                         FROM EVENTS_T A , 
	                              PARTS_T B,
		                      LOCATIONS_T C 
                                WHERE A.EVENT_TYPE='Invoice' 
	                          AND A.EVENT_NAME='Dispatched' 
	                          AND B.PART_GRP='${partGrp}' 
	                          AND A.PART_NO=B.PART_NO 
	                          AND TRUNC(A.EVENT_DATE) = trunc(SYSDATE) 
	                          AND A.FROM_LOC = C.LOC_ID 
	                          AND C.TYPE='Warehouse'
	                     GROUP BY A.PART_NO`;
        
        
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

                    parts.schedSeries.forEach(function (seriesObj) {
                        if (seriesObj.name === row.PART_NO) {
                            seriesObj.items[4].y = row.QTY;
                            seriesObj.items[4].label = row.QTY;
                        }
                    });

                });


                cb(null, conn);
            }

        });

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
                getASN,
                getStock,
                getDispatched,
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
