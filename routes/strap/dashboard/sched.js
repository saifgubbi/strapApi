var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');
//oracledb.prefetchRows = 100;
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
        dateCrit = `TRUNC(SYSDATE) AND TRUNC(SYSDATE)`;
    } else {
        dateCrit = `TRUNC(SYSDATE) AND TRUNC(SYSDATE+2)`;
    }

              let selectStatement = `SELECT SCHED_DT,PART_NO,NVL(SCHED_QTY,0) SCHED_QTY,NVL(WIP_QTY,0) WIP_QTY, NVL(ASN_QTY,0) ASN_QTY, NVL(WH_QTY,0) WH_QTY,NVL(DISP_QTY,0) DISP_QTY 
                                               FROM(WITH 
                                      SCHED_TBL AS(
                                                  SELECT PART_NO,NVL(QTY,0)QTY,NVL(WIP_QTY,0) WIP_QTY,SCHED_DT
                                                    FROM SCHED_T 
						   WHERE PART_GRP='${partGrp}'
                                                     AND TRUNC(SCHED_DT) BETWEEN ${dateCrit}
                                                   UNION
                                                  SELECT NULL PART_NO,0 QTY,0 WIP_QTY,SYSDATE FROM DUAL),
                                        ASN_TBL AS(
                                                  SELECT PART_NO,NVL(QTY,0) QTY 
						    FROM ASN_T 
						   WHERE PART_GRP='${partGrp}'
                                                     AND TRUNC(ASN_DATE) BETWEEN ${dateCrit}
                                                   UNION
                                                  SELECT NULL PART_NO,0 QTY FROM DUAL ),
                                         INV_TBL AS(
                                                  SELECT IL.PART_NO,DECODE(IH.STATUS,'Dispatched',0,'Reached',0,IL.QTY) WH_QTY,DECODE(IH.STATUS,'Dispatched',IL.QTY,'Reached',IL.QTY,0) DISP_QTY
                                                    FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L 
                                                   WHERE IH.PART_GRP='${partGrp}'
                                                     AND IH.INVOICE_NUM=IL.INVOICE_NUM
                                                     AND IH.FROM_LOC=L.LOC_ID
                                                     AND L.TYPE='Warehouse'
                                                     AND TRUNC(STATUS_DT) BETWEEN ${dateCrit}
                                                   UNION
                                                  SELECT NULL PART_NO,0 WH_QTY,0 DISP_QTY FROM DUAL
                                                     )
                                              SELECT SCHED_TBL.SCHED_DT SCHED_DT,SCHED_TBL.PART_NO PART_NO,NVL(SCHED_TBL.QTY,0) SCHED_QTY,SCHED_TBL.WIP_QTY WIP_QTY, NVL(ASN_TBL.QTY,0) ASN_QTY, NVL(INV_TBL.WH_QTY,0) WH_QTY,NVL(INV_TBL.DISP_QTY,0) DISP_QTY 
						FROM SCHED_TBL,ASN_TBL,INV_TBL
                                               WHERE SCHED_TBL.PART_NO=ASN_TBL.PART_NO(+)
                                                 AND SCHED_TBL.PART_NO=INV_TBL.PART_NO(+)
                                                 AND SCHED_TBL.PART_NO IS NOT NULL)    
                                                 WHERE (SCHED_QTY+WIP_QTY+ASN_QTY+WH_QTY+DISP_QTY )<>0`;
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
//         let selectStatement = `SELECT PART_NO,QTY SCHED_QTY,0 WIP_QTY,0 ASN_QTY,0 WH_QTY,0 DISP_QTY from SCHED_T
//                                 where 1=1
//                                   and PART_GRP='${partGrp}'
//                                   and SCHED_DT BETWEEN ${dateCrit}
//                                   AND PART_NO is not null`;
        
        
              let selectStatement = `WITH SCHED_TBL AS(
                                                  SELECT PART_NO,QTY,WIP_QTY,SCHED_DT
                                                    FROM SCHED_T 
						   WHERE PART_GRP='${partGrp}'
                                                     AND SCHED_DT BETWEEN ${dateCrit}
                                                   UNION
                                                  SELECT NULL PART_NO,0 QTY,0 WIP_QTY,SYSDATE FROM DUAL),
                                        ASN_TBL AS(
                                                  SELECT PART_NO,NVL(QTY,0) QTY 
						    FROM ASN_T 
						   WHERE PART_GRP='${partGrp}'
                                                     AND ASN_DATE BETWEEN ${dateCrit}
                                                   UNION
                                                  SELECT NULL PART_NO,0 QTY FROM DUAL ),
                                         INV_TBL AS(
                                                  SELECT IL.PART_NO,DECODE(IH.STATUS,'Dispatched',0,'Reached',0,IL.QTY) WH_QTY,DECODE(IH.STATUS,'Dispatched',IL.QTY,'Reached',IL.QTY,0) DISP_QTY
                                                    FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L 
                                                   WHERE IH.PART_GRP='${partGrp}'
                                                     AND IH.INVOICE_NUM=IL.INVOICE_NUM
                                                     AND IH.FROM_LOC=L.LOC_ID
                                                     AND L.TYPE='Warehouse'
                                                     AND STATUS_DT BETWEEN ${dateCrit}
                                                   UNION
                                                  SELECT NULL PART_NO,0 WH_QTY,0 DISP_QTY FROM DUAL
                                                     )
                                              SELECT SCHED_TBL.PART_NO PART_NO,SCHED_TBL.QTY SCHED_QTY,SCHED_TBL.WIP_QTY WIP_QTY,ASN_TBL.QTY ASN_QTY,INV_TBL.WH_QTY WH_QTY,INV_TBL.DISP_QTY DISP_QTY 
						FROM SCHED_TBL,ASN_TBL,INV_TBL
                                               WHERE SCHED_TBL.PART_NO=ASN_TBL.PART_NO(+)
                                                 AND SCHED_TBL.PART_NO=INV_TBL.PART_NO(+)
                                                 AND SCHED_TBL.PART_NO IS NOT NULL
                                                 AND (SCHED_TBL.SCHED_QTY + SCHED_TBL.WIP_QTY + ASN_TBL.ASN_QTY + INV_TBL.WH_QTY + INV_TBL.DISP_QTY)<>0`;          
        
        console.log(selectStatement);

        let bindVars = [];
        op.singleSQL(selectStatement, bindVars, req, res);
    }

    
//   
//    function getCounts(conn, cb) {
//        console.log("Getting Counts");
//
//        let selectStatement = `SELECT COUNT(PART_NO) AS PARTCOUNT,
//	                              SUM(QTY) AS PARTQTY 
//	                         FROM SCHED_T
//                                WHERE PART_GRP='${partGrp}' 
//	                          AND SCHED_DT BETWEEN ${dateCrit}`;
//
//        console.log(selectStatement);
//
//        let bindVars = [];
//
//        conn.execute(selectStatement
//                , bindVars, {
//                    outFormat: oracledb.OBJECT, // Return the result as Object
//                    autoCommit: true// Override the default non-autocommit behavior
//                }, function (err, result)
//        {
//            if (err) {
//                console.log("Error Occured: ", err);
//                cb(err, conn);
//            } else {
//
//                result.rows.forEach(function (row) {
//                    parts.partCount = row.PARTCOUNT;
//                    parts.partQty = row.PARTQTY;
//                });
//
//                res.writeHead(200, {'Content-Type': 'application/json'});
//                res.end(JSON.stringify(parts));
//                cb(null, conn);
//            }
//
//        });
//
//    }

    async.waterfall(
            [doConnect,
                getHdr
              //  getCounts
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
