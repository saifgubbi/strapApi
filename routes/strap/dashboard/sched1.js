var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
//var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');

router.get('/data', function (req, res) {
    getData(req, res);
});

router.get('/', function (req, res) {
    getParts(req, res);
});

router.get('/hourly', function (req, res) {
    getSched(req, res);
});


module.exports = router;

function getData(req, res) {
    var partGrp = req.query.partGrp;
    var partNo ='';
    var schArr = [];
    
    
    if (req.query.partNo) {
        partNo = ` AND PART_NO LIKE '${req.query.partNo}%'`;
    }
    
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };
    
    function getSchP(conn, cb) {
        console.log("Getting List");
        let selectStatement = `SELECT PART_NO as "partNo", sum(wip_qty) as "wipQty", sum(close_stk) as "closeStk" 
                                  FROM sched_t p 
                                 WHERE part_grp='${partGrp}'${partNo} 
                                   AND trunc(sched_dt) between trunc(sysdate) and trunc(sysdate+3) 
	                           AND part_no is not null   
                                   GROUP BY part_no`;
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
                //let objArr = [];
                result.rows.forEach(function (row) {
                    let obj = {};
                    obj.partNo = row.partNo;
                    obj.wipQty = row.wipQty;
                    obj.closeStk = row.closeStk;
                    obj.d0 = 0;
                    obj.d1 = 0;
                    obj.d2 = 0;
                    obj.d3 = 0;
                    obj.asnQty = 0;
                    obj.whQty = 0;
                    obj.dispQty = 0;
                    schArr.push(obj);
                });
                // res.writeHead(200, {'Content-Type': 'application/json'});
                // res.end(JSON.stringify(schArr));
                cb(null, conn);
            }
        });

    }

    function getSchP1(conn, cb) {
        console.log("Getting List");
        let selectStatement = `SELECT trunc(sched_dt)-trunc(sysdate) as "day", part_no as "partNo",sum(qty) as "qty"
                                  FROM sched_t p 
                                 WHERE part_grp='${partGrp}' ${partNo}
                                   AND trunc(sched_dt) between trunc(sysdate) and trunc(sysdate+3) 
	                           AND part_no is not null 
                             group by sched_dt,part_no
                             order by sched_dt desc`;
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
                    schArr.forEach(function (sch)
                    {
                        if (row.partNo === sch.partNo)
                        {   
                            console.log(sch["d" + row.day]);
                            console.log(sch[row.qty]);
                            sch["d" + row.day] = row.qty;                            
                        }

                    }
                    );
                });
            }
                cb(null, conn);
            }
        );
    };

    
    function getAsn(conn, cb) {
        console.log("Getting List");
        let selectStatement = `  SELECT PART_NO as "partNo",SUM(NVL(QTY,0)) as "asnQty"
	                           FROM asn_t 
                                  WHERE part_grp='${partGrp}'${partNo}
                                  AND TRUNC(asn_date) BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE+3)
                                  GROUP BY PART_NO,ASN_DATE`;
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
                    schArr.forEach(function (sch)
                    {
                        if (row.partNo === sch.partNo)
                        {   
                            sch.asnQty = row.asnQty;                            
                        }

                    });
                });
            };
             cb(null, conn);
        });
    }
    ;

    function getDisp(conn, cb) {
        console.log("Getting List");

        let selectStatement = `SELECT b.PART_NO as "partNo",SUM(DECODE(b.STATUS,'Dispatched',0,'Reached',0,b.QTY)) as "whQty",SUM(DECODE(b.STATUS,'Dispatched',b.QTY,'Reached',b.QTY,0)) as"dispQty"
                                 FROM bins_t b,LOCATIONS_T L
                                WHERE b.PART_GRP='${partGrp}'${partNo}
                                  AND b.FROM_LOC=L.LOC_ID
                                  AND L.TYPE='Warehouse'
                                  AND TRUNC(b.STATUS_DT) BETWEEN trunc(sysdate) and trunc(sysdate+3)
                                  group by part_no`;
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
                    schArr.forEach(function (sch)
                    {
                        if (row.partNo === sch.partNo)
                        {   
                            sch.whQty = row.whQty; 
                            sch.dispQty = row.dispQty;
                        }

                    });
                });
            };
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(schArr));
            cb(null, conn);
        });

    }
    async.waterfall(
            [doConnect,
             getSchP,
             getSchP1
             ,getAsn,
             getDisp
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


function getSched(req, res) {
    var partGrp = req.query.partGrp;
    var option = req.query.option;
    var partNo = req.query.partNo;
    var schArr =[];
    
    if (option === 'TD1') {
        dateCrit = `TRUNC(SYSDATE) AND TRUNC(SYSDATE)`;
    } else {
        dateCrit = `TRUNC(SYSDATE) AND TRUNC(SYSDATE+3)`;
    }
    
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };
    
    function getSchP(conn, cb) {
        console.log("Getting List");
        let selectStatement = `SELECT PART_NO,SCHED_HR,SCHED_DT
                                                    FROM SCHED_T 
						   WHERE PART_GRP='${partGrp}'
                                                     AND PART_NO ='${partNo}'
                                                     AND TRUNC(SCHED_DT) BETWEEN ${dateCrit}
                                                ORDER BY SCHED_HR,SCHED_DT`;
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
                    let obj = {};
                    obj.schDt = row.SCHED_DT;
                    obj[row.SCHED_HR] = 0;
                    schArr.push(obj);
                });
                cb(null, conn);
            }
        });

    }
    
    function getSchP1(conn, cb) {
        console.log("Getting List");
        let selectStatement = `SELECT SCHED_HR,(NVL(QTY,0))QTY,SCHED_DT
                                                    FROM SCHED_T 
						   WHERE PART_GRP='${partGrp}'
                                                     AND PART_NO ='${partNo}'
                                                     AND TRUNC(SCHED_DT) BETWEEN ${dateCrit}
                                                ORDER BY SCHED_HR,SCHED_DT`;
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
                    schArr.forEach(function(sch)
                    {
                        if (sch.schDt===row.SCHED_DT)
                        {
                            schArr[row.SCHED_HR]=row.QTY;
                            console.log(row.QTY);
                        }
                    });
                });
                 res.writeHead(200, {'Content-Type': 'application/json'});
                 res.end(JSON.stringify(schArr));
                cb(null, conn);
            }
        });

    }
   
    
    async.waterfall(
            [doConnect,
             getSchP,
             getSchP1
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

//function getSched(req, res) {
//    var partGrp = req.query.partGrp;
//    var option = req.query.option;
//    var partNo = req.query.partNo;
//    if (option === 'TD1') {
//        dateCrit = `TRUNC(SYSDATE) AND TRUNC(SYSDATE)`;
//    } else {
//        dateCrit = `TRUNC(SYSDATE) AND TRUNC(SYSDATE+2)`;
//    }
//    let selectStatement = `SELECT PART_NO,SCHED_HR,(NVL(QTY,0))QTY,(NVL(WIP_QTY,0))WIP_QTY,SCHED_DT,(NVL(CLOSE_STK,0)) CLOSE_STK
//                                                    FROM SCHED_T 
//						   WHERE PART_GRP='${partGrp}'
//                                                     AND PART_NO ='${partNo}'
//                                                     AND TRUNC(SCHED_DT) BETWEEN ${dateCrit}
//                                                ORDER BY SCHED_HR,SCHED_DT`;
//
//    console.log(selectStatement);
//
//    var bindVars = [];
//    op.singleSQL(selectStatement, bindVars, req, res);
//
//}

function getParts(req, res) {

    var partGrp = req.query.partGrp;
    var partNo= req.query.partNo;
    var sqlStatement = `SELECT count(1) parts,loc,sum(part_qty) part_qty
                               FROM(
                               select distinct part_no,case  WHEN l.TYPE='Plant' AND ih.STATUS NOT IN ('Dispatched','Reached') Then 'Plant'
                                                             WHEN l.TYPE='Plant' AND ih.STATUS IN ('Dispatched','Reached') Then 'Transit-Warehouse'
                                                             WHEN l.TYPE='Warehouse' AND ih.STATUS NOT IN ('Dispatched','Reached') Then 'Warehouse'
                                                             WHEN l.TYPE='Warehouse' AND ih.STATUS IN ('Dispatched','Reached') Then 'Transit-Customer' 
                                                         end loc,il.qty part_qty
                                 from inv_line_t il,inv_hdr_t ih,LOCATIONS_T l 
                                where ih.invoice_num=il.invoice_num 
                                  AND ih.from_loc=l.loc_id 
                                  and part_no is not null
                                  and ih.part_grp like '${partGrp}'
                                  and il.part_no = '${partNo}'
                                  ) group by loc`;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}
