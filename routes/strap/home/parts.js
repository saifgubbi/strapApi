var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getParts(req, res);
});


module.exports = router;


//function getParts(req, res) {
//
//    var partGrp = req.query.partGrp;  
//    var sqlStatement = `SELECT COUNT(PART_NO) parts ,loc,SUM(PART_QTY) part_qty
//                         FROM(
//                                WITH PARTS AS
//                                      ( select part_no,case  WHEN l.TYPE='Plant' AND ih.STATUS NOT IN ('Dispatched','Reached') Then 'Plant'
//                                                             WHEN l.TYPE='Plant' AND ih.STATUS IN ('Dispatched','Reached') Then 'Transit'
//                                                             WHEN l.TYPE='Warehouse' AND ih.STATUS NOT IN ('Dispatched','Reached') Then 'Warehouse'
//                                                             WHEN l.TYPE='Warehouse' AND ih.STATUS IN ('Dispatched','Reached') Then 'Transit' 
//                                                         end loc,il.qty part_qty
//                                 from inv_line_t il,inv_hdr_t ih,LOCATIONS_T l 
//                                where ih.invoice_num=il.invoice_num 
//                                  AND ih.from_loc=l.loc_id 
//                                  and ih.status <>l.close_status
//                                  and part_no is not null
//                                  and ih.part_grp like '${partGrp}')
//                                 SELECT part_no,loc,sum(part_qty) part_qty from PARTS group by part_no,loc) group by loc
//                                 `;
//    var bindVars = [];
//    console.log(sqlStatement);
//    op.singleSQL(sqlStatement, bindVars, req, res);
//}

function getParts(req, res) {

    var partGrp = req.query.partGrp;  
    var sqlStatement = `SELECT COUNT(PART_NO) parts ,loc,SUM(PART_QTY) part_qty
                         FROM(
                                WITH PARTS AS
                                      ( select part_no,case  WHEN l.TYPE='Plant' AND b.STATUS NOT IN ('Dispatched','Reached') Then 'Plant'
                                                             WHEN l.TYPE='Plant' AND b.STATUS IN ('Dispatched','Reached') Then 'Transit'
                                                             WHEN l.TYPE='Warehouse' AND b.STATUS NOT IN ('Dispatched','Reached') Then 'Warehouse'
                                                             WHEN l.TYPE='Warehouse' AND b.STATUS IN ('Dispatched','Reached') Then 'Transit' 
                                                         end loc,b.qty part_qty
                                 from bins_t b,LOCATIONS_T l 
                                where b.from_loc=l.loc_id 
                                  and part_no is not null
                                  and b.part_grp like '${partGrp}')
                                 SELECT part_no,loc,sum(part_qty) part_qty from PARTS group by part_no,loc) group by loc
                                 `;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}
