var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');

router.post('/', function (req, res) {
    partsAssign(req, res);
});

router.get('/', function (req, res) {
    getInvPallet(req, res);
});

router.get('/parts', function (req, res) {
    getInvParts(req, res);
});

router.get('/id', function (req, res) {
    getId(req, res);

});

module.exports = router;


function partsAssign(req, res) {
    let invId = req.body.id;
    let partGrp = req.body.partGrp;
    let userId = req.body.userId;
    let locId = req.body.locId;
    let partNo = req.body.partNo;
    let qty = req.body.qty;

    let ts = new Date().getTime();

    let bindArr = [];

    /*Insert Pallet SQL*/

    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";
    let bindVars = [invId, 'Invoice', 'Parts Assigned', new Date(), locId, null, null, partNo, qty, invId, userId, null, 0, ts, null, null, partGrp, null, null,null];

    bindArr.push(bindVars);

    req.body.objArray.forEach(function (obj) {
        let binVars = [obj.objId, obj.type, 'Invoiced', new Date(), locId, null, obj.objLbl, obj.objPart, obj.objQty, invId, userId, null, 0, ts, null, null, partGrp, null, null,null];
        bindArr.push(binVars);
    });
    insertEvents(req, res, sqlStatement, bindArr);
}

function insertEvents(req, res, sqlStatement, bindArr) {

    let errArray = [];
    let doneArray = [];

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            cb(null, conn);
        });
    };

    function doInsert(conn, cb) {
        console.log("In  doInsert");
        let arrayCount = 1;
        async.eachSeries(bindArr, function (data, callback) {
            arrayCount++;
            console.log("Inserting :", JSON.stringify(data));
            let insertStatement = sqlStatement;
            let bindVars = data;
            //  console.log(bindVars.join());
            conn.execute(insertStatement
                    , bindVars, {
                        autoCommit: true// Override the default non-autocommit behavior
                    }, function (err, result)
            {
                if (err) {
                    console.log("Error Occured: ", err);
                    errArray.push({row: arrayCount, err: err});
                    callback();
                } else {
                    console.log("Rows inserted: " + result.rowsAffected); // 1
                    doneArray.push({row: arrayCount});
                    callback();
                }
            });
        }, function (err) {
            if (err) {
                console.log("Event Insert Error");
                res.writeHead(500, {'Content-Type': 'application/json'});
                errArray.push({row: 0, err: err});
                res.end(`errorMsg:${err}}`);
            } else {
                res.writeHead(200);
                res.end(`{total : ${bindArr.length},success:${doneArray.length},error:${errArray.length},errorMsg:${errArray}}`);
            }
            cb(null, conn);
        }
        );
    }

    async.waterfall(
            [doConnect,
                doInsert
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


function getId(req, res) {
    var pickList = req.query.pickList;
    var objType = req.query.type;
    var partGrp = req.query.partGrp;
    var sqlStatement;


    if (objType === 'Bin') {
        sqlStatement = `SELECT BIN_ID AS "objId" , PART_NO as "partNo",QTY as "qty" FROM BINS_T WHERE PICK_LIST = '${pickList}' AND PART_GRP='${partGrp}'`;
    } 
//    else {
//        sqlStatement = `SELECT PALLET_ID AS "objId", PART_NO as "partNo",QTY as "qty" FROM PALLETS_T WHERE PICK_LIST = '${pickList}' AND PART_GRP='${partGrp}' AND ROWNUM=1`;
//    }
    console.log(sqlStatement);
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function getInvPallet(req, res) {

    var invId = req.query.invId;
    var partGrp = req.query.partGrp;
    var sqlStatement = `SELECT EVENT_ID,LABEL,PART_NO,QTY FROM EVENTS_T WHERE EVENT_NAME='Invoiced' AND PART_GRP='${partGrp}' and INVOICE_NUM='${invId}'`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);

}



function getInvParts(req, res) {

    var invId = req.query.invId;
    var partGrp = req.query.partGrp;
    var sqlStatement = `SELECT B.PART_NO AS PART_NO,B.QTY AS COUNT FROM INV_HDR_T A,INV_LINE_T B WHERE A.INVOICE_NUM=B.INVOICE_NUM AND A.INVOICE_NUM='${invId}' and A.PART_GRP='${partGrp}'`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);

}