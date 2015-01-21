/*!
* soar
* authors: Ben Lue
* license: MIT License
* Copyright(c) 2015 Gocharm Inc.
*/
var  dbConn = require('./dbConn.js'),
     fs = require('fs'),
     path = require('path');

var  basePath,
     useDB,
     isInit = false;

exports.config = function(options)  {
    if (Object.keys(options).length === 0)
        options = JSON.parse( fs.readFileSync(path.join(__dirname, '../config.json')) );

    if (Array.isArray(options))
        throw  new Error('[genAll] can only scan databases one at a time.');

    useDB = new dbConn(options.dbConfig);

    // then set up the entity definition directory
    basePath = options.defPath || path.join(__dirname, '../def/');

    // clean up definition file cache
    defCache = {};
    isInit = true;
};


exports.close = function(callback)  {
    useDB.closeDown( callback );
};


exports.getConnection = function(callback)  {
    useDB.getConnection(callback);
};


exports.describe = function(tableName, callback)  {
    if (isInit)  {
        useDB.getConnection( function(err, conn) {
            if (err)
                callback( err );
            else  {
                var  sql = 'SHOW COLUMNS FROM ' + tableName;
                conn.query(sql, function(qErr, rows) {
                    conn.release();

                    if (qErr)
                        callback( qErr );
                    else
                        toViewFile( tableName, rows, callback);
                });
            }
        });
    }
    else
        callback( new Error('Describer should be configured before being used.') );
};


function  toViewFile(tableName, columns, callback)  {
    var  vfile = basePath + tableName,
         v = '<db_view>\n\t<table name="' + tableName + '" />\n\n\t<fields>\n',
         filters = [];

    for (var i in columns)  {
        var  c = columns[i];
        v += '\t\t<field name="' + c.Field + '"\t/>\n';

        if (c.Type.indexOf('date') !== 0 && c.Type.indexOf('time') !== 0 && c.Type.indexOf('year') !== 0)
            filters.push( c );
    }

    v += "\t</fields>\n";

    // add filters
    v += '\n\t<filter>\n';
    for (var i in filters)  {
        var  c = filters[i];
        v += '\t\t<filter name="' + c.Field + '"\t/>\n';
    }
    v += '\t</filter>\n</db_view>';

    fs.exists( vfile, function(exists) {
        if (exists)
            fs.writeFile( vfile + '/general.dvml', v, function(err) {
                callback( err );
            });
        else
            fs.mkdir(vfile, function(err) {
				if (err)
					callback( err );
				else
					fs.writeFile( vfile + '/general.dvml', v, function(err) {
                        callback( err );
                    });
			});
    });
};
