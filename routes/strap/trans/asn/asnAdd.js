var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');

router.post('/', function (req, res) {
    addInvoices(req, res);
});

module.exports = router;


function getDate(str1) {
// str1 format should be yyyy/mm/dd. Separator can be anything e.g. / or -. It wont effect
    var dt1 = parseInt(str1.substring(8, 10));
    var mon1 = parseInt(str1.substring(5, 7));
    var yr1 = parseInt(str1.substring(0, 4));
    var date1 = new Date(yr1, mon1 - 1, dt1);
    return date1;
}


function addInvoices(req, res) {
    let userId = req.body.userId;
    let partGrp = req.body.partGrp;
    let locId = req.body.locId;
    let ts = new Date().getTime();

    let bindArr = [];
    /*Insert Pallet SQL*/
    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";

    req.body.asnArr.forEach(function (obj) {
        let bindVars = [obj.invId, 'Invoice', 'ASN Assigned',new Date() , locId, '', '', obj.partNo, obj.qty, obj.invId, userId, 1, 0, ts, getDate(obj.asnDt), obj.asnId, partGrp, '', '', ''];
        bindArr.push(bindVars);
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

