var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getParts(req, res);
});


module.exports = router;


function getParts(req, res) {

    var partGrp = req.query.partGrp;
    //console
    var sqlStatement = `SELECT count(1) parts,loc,sum(part_qty) part_qty
                               FROM(
                               select distinct part_no,case  WHEN l.TYPE='Plant' AND ih.STATUS<>'Dispatched' Then 'Plant'
                                                             WHEN l.TYPE='Plant' AND ih.STATUS='Dispatched' Then 'Transit'
                                                             WHEN l.TYPE='Warehouse' AND ih.STATUS<>'Dispatched' Then 'Warehouse'
                                                             WHEN l.TYPE='Warehouse' AND ih.STATUS='Dispatched' Then 'Transit' 
                                                         end loc,il.qty part_qty
                                 from inv_line_t il,inv_hdr_t ih,LOCATIONS_T l 
                                where ih.invoice_num=il.invoice_num 
                                  AND ih.from_loc=l.loc_id 
                                  and part_no is not null
                                  and ih.part_grp like '${partGrp}'
                                  ) group by loc`;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

