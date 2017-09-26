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
        dateCrit = `TRUNC(SYSDATE-6) AND TRUNC(SYSDATE)`;
    } else {
        dateCrit = `TRUNC(SYSDATE-6) AND TRUNC(SYSDATE+2)`;
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

