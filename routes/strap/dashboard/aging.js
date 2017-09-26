var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');



router.get('/', function (req, res) {
    getChart(req, res);
});


module.exports = router;


function getChart(req, res) {

    var partGrp = req.query.partGrp;
    var locType = req.query.locType;
    var parts = {partsSeries: [], partsGroups: []};

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };


    function getHdr(conn, cb) {

        let selectStatement = `SELECT ROUND(SYSDATE-STATUS_DT) AS AGE,
                                      A.PART_NO,
                                      SUM(QTY) AS QTY 
                                 FROM BINS_T A,
                                      PARTS_T B,
                                      LOCATIONS_T C 
                                WHERE QTY<>0 
                                  AND A.FROM_LOC=C.LOC_ID 
                                  AND C.TYPE='Warehouse' 
                                  AND A.PART_NO=B.PART_NO 
                                  AND B.PART_GRP = '${partGrp}' 
                             GROUP BY ROUND(SYSDATE-STATUS_DT),A.PART_NO ORDER BY 1`;


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
                    let partFound = false;
                    parts.partsSeries.forEach(function (part) {
                        if (part.name === row.PART_NO) {
                            part.items[parseInt(row.AGE) ] = row.QTY;
                            partFound = true;
                        }
                    });
                    if (!partFound) {
                        var seriesObj = {name: row.PART_NO, items: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]};
                        seriesObj.items[parseInt(row.AGE)] = row.QTY;
                        parts.partsSeries.push(seriesObj);
                    }

                });

                parts.partsGroups = [1, 2, 3, 4, 5, 6, 7, 8, 9, '>9'];
                console.log(parts);

                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(parts));

                cb(null, conn);
            }

        });

    }


    async.waterfall(
            [doConnect,
                getHdr
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
