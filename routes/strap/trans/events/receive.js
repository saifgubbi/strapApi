var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');

router.get('/lr', function (req, res) {
    getPendingLR(req, res);
});

router.get('/lrObj', function (req, res) {
    getLRObjects(req, res);
});

router.post('/lrObj', function (req, res) {
    recieveObj(req, res);
});

module.exports = router;


function getPendingLR(req, res) {
    var locId = req.query.locId;
    var partGrp = req.query.partGrp;

    var sqlStatement = `SELECT DISTINCT LR_NO FROM INV_HDR_T WHERE STATUS='Reached' AND PART_GRP = '${partGrp}' AND TO_LOC='${locId}'`;
    var bindVars = [];

    op.singleSQL(sqlStatement, bindVars, req, res);
}


function getLRObjects(req, res) {
    var lr = req.query.lr;
    var partGrp = req.query.partGrp;

    var sqlStatement = `(SELECT A.BIN_ID AS OBJ_ID,A.QTY,A.PART_NO,'Bin' as OBJ_TYPE,B.INVOICE_NUM FROM BINS_T A,INV_HDR_T B WHERE A.INVOICE_NUM=B.INVOICE_NUM AND A.PART_GRP=B.PART_GRP AND B.LR_NO='${lr}' AND B.PART_GRP = '${partGrp}' AND PALLET_ID is null ) UNION (SELECT A.PALLET_ID AS OBJ_ID,A.QTY,A.PART_NO,'Pallet' as OBJ_TYPE,B.INVOICE_NUM FROM PALLETS_T A,INV_HDR_T B WHERE A.INVOICE_NUM=B.INVOICE_NUM AND A.PART_GRP=B.PART_GRP AND B.LR_NO='${lr}' AND B.PART_GRP = '${partGrp}')`;
    var bindVars = [];

    console.log(sqlStatement);

    op.singleSQL(sqlStatement, bindVars, req, res);
}

function recieveObj(req, res) {

    let partGrp = req.body.partGrp;
    let userId = req.body.userId;
    let locId = req.body.locId;
    let lr = req.body.lr;
    let binVars;


    let ts = new Date().getTime();
    let invArr = [];

    let bindArr = [];

    /*Insert Pallet SQL*/

    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";

    /*Insert Object (bin,pallets as dispatched)*/
    req.body.objArray.forEach(function (obj) {
        if (obj.damaged === 'N') {
            binVars = [obj.objId, obj.type, 'Received', new Date(), locId, null, '', obj.partNo, obj.qty || 0, obj.invId, userId, obj.comments, 0, ts, null, null, partGrp, lr, null, null];
        } else {
            binVars = [obj.objId, obj.type, 'Review', new Date(), locId, null, '', obj.partNo, obj.qty || 0, obj.invId, userId, obj.comments, 0, ts, null, null, partGrp, lr, null, null];
        }
        if (invArr.indexOf() < 0) {
            invArr.push(obj.invId);
        }
        bindArr.push(binVars);
    });

    /*Insert Unique Invoices with Dispatched Status*/
    invArr.forEach(function (invID) {
        let binVars = [invID, 'Invoice', 'Received', new Date(), locId, null, '', '', 0, invID, userId, null, 0, ts, null, null, partGrp, lr, null, null];
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