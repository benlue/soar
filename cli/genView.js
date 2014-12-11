var  fs = require('fs'),
     descTable = require('../lib/describeTable.js');

var  argCount = process.argv.length;

if (argCount < 3)
    console.log('Missing the table name.\n  Try node genView -h for usage.');
else  {
    var  tableName = process.argv[2],
         options = {};

    if (argCount > 3)  {
        for (var i = 2; i < argCount; i++)  {
            if (process.argv[i] === '-f')  {
                var  configFile = process.argv[++i];
                options = JSON.parse( fs.readFileSync( configFile ) );
            }
            else  if (process.argv[i] === '-h')  {
                console.log('node genView -f configFile tableName\n\t-f path to the configuration file (optional)\n\ttableName: the target database table.');
                return;
            }
            else
                tableName = process.argv[i];
        }
    }

    descTable.config( options );
    descTable.describe( tableName, function(err) {
        if (err)
            console.log( err );
        descTable.close( function(err) {
            if (err)
                console.log( err );
        });
    });
}
