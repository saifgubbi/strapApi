var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');

router.get('/', function (req, res) {
    getData(req, res);
});

router.post('/', function (req, res) {
    addData(req, res);
});

router.delete('/', function (req, res) {
    removeData(req, res);
});

router.put('/', function (req, res) {
    updateData(req, res);
});

module.exports = router;

function getData(req, res) {

    /*Get the Search Parameters*/
    var partGrp = (req.query.partGrp || '%') + '%';
    var partNo = (req.query.partNo || '%') + '%';
    var custPartNo = (req.query.custPartNo || '%') + '%';
    var variant = (req.query.variant || '%') + '%';
    var partsType = (req.query.partsType || '%') + '%';
    var sqlStatement = `SELECT * FROM PARTS_T WHERE PART_GRP LIKE '${partGrp}' AND PART_NO LIKE '${partNo}' AND NVL(CUST_PART_NO,'Y') LIKE '${custPartNo}' AND NVL(VARIANT,'Y') LIKE '${variant}' AND NVL(PARTS_TYPE,'Y') LIKE '${partsType}' `;
   console.log(sqlStatement);
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function addData(req, res) {
    var sqlStatement = "INSERT INTO PARTS_T VALUES (:1,UPPER(SUBSTR(regexp_replace(:2, '[^[:alnum:]]', null),length(regexp_replace(:3, '[^[:alnum:]]', null))-12)),:4,:5,:6,:7,:8)";
    var bindVars = [req.body.partGrp, req.body.partNo,req.body.partNo, req.body.custPartNo, req.body.variant, req.body.partsType,req.body.serialized,req.body.partNo];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function removeData(req, res) {
    var sqlStatement = "DELETE FROM PARTS_T WHERE PART_GRP=:1 AND PART_NO = :2";
    var bindVars = [req.query.partGrp, req.query.partNo];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function updateData(req, res) {
    var sqlStatement = `UPDATE PARTS_T
                SET CUST_PART_NO = :1 ,
                VARIANT = :2,
                PARTS_TYPE = :3,
                SERIALIZED = :4
                WHERE PART_GRP=:5 AND PART_NO = :6`;
    var bindVars = [req.body.custPartNo, req.body.variant, req.body.partsType, req.body.serialized,req.body.partGrp, req.body.partNo];
    console.log(bindVars.join());
    op.singleSQL(sqlStatement, bindVars, req, res);
}
