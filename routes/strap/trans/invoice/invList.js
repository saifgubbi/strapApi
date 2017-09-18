var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');


router.get('/', function (req, res) {
    getData(req, res);
});

router.delete('/', function (req, res) {
    removeInv(req, res);
});



module.exports = router;

function getData(req, res) {
    var invId = (req.query.invId || '%') + '%';
    var fromLoc = (req.query.fromLoc || '%') + '%';
    var toLoc = (req.query.toLoc || '%') + '%';
    var status = (req.query.status || '%') + '%';
    var partNo = (req.query.partNo || '%') + '%';
    var partGrp = req.query.partGrp;

    var lr = '';
    if (req.query.lr) {
        lr = ` AND LR_NO LIKE '${req.query.lr}%' `;
    }
    var sqlStatement = `SELECT * FROM INV_HDR_T A,INV_LINE_T B  WHERE A.INVOICE_NUM LIKE '${invId}' AND A.FROM_LOC LIKE '${fromLoc}' AND A.TO_LOC LIKE '${toLoc}' AND A.STATUS LIKE '${status}' AND                         
                        A.INVOICE_NUM=B.INVOICE_NUM AND A.INV_DT=B.INV_DT AND B.PART_NO LIKE '${partNo}' AND A.PART_GRP = '${partGrp}'  ${lr}`;
    console.log(sqlStatement);
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function removeInv(req, res) {
    let invId = req.query.invId;
    let partGrp = req.query.partGrp;
    let userId = req.query.userId;
    let ts = new Date().getTime();
    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";
    let bindVars = [invId, 'Invoice', 'Delete', new Date(), '', '', '', '', '', invId, userId, '', 0, ts, '', '', partGrp, '', '',''];
    op.singleSQL(sqlStatement, bindVars, req, res);
}
