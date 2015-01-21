var  fs = require('fs'),
     descTable = require('../lib/describeTable.js');

var  argCount = process.argv.length,
     options = {};

if (argCount > 2)  {
    for (var i = 2; i < argCount; i++)  {
        if (process.argv[i] === '-f')  {
            var  configFile = process.argv[++i];
            options = JSON.parse( fs.readFileSync( configFile ) );
        }
        else  if (process.argv[i] === '-h')  {
            console.log('node cli/genAll -f configFile\n');
            return;
        }
        else
            tableName = process.argv[i];
    }
}

try  {
    descTable.config( options );
}
catch (e)  {
    console.log('Failed to read configurations.');
    return;
}

descTable.getConnection(function(err, conn) {
    if (err)
        console.log( err );
    else  {
        var  sql = 'SHOW TABLES';
        conn.query(sql, function(err, rows) {
            conn.release();

            if (err)
                console.log( err );
            else  {
                var  totalCount = 0;
                for (var i in rows)  {
                    for (var key in rows[i])
                        descTable.describe( rows[i][key], function(err) {
                            if (err)
                                console.log( err );
                            if (++totalCount === rows.length)
                                closeDown();
                        });
                }
            }
        });
    }
});

function  closeDown()  {
    descTable.close( function(err) {
        if (err)
            console.log( err );
    });
};
