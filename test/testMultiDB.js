var  assert = require('assert'),
     path = require('path'),
     soar = require('../lib/soar.js');

//soar.setDebug( true );

before(function() {
    soar.config([
        {
            "dbConfig": {
                "host"     : "127.0.0.1",
                "database" : "soar",
                "user"     : "root",
                "password" : "xxxxxx",
                "supportBigNumbers" : true,
                "connectionLimit"   : 16
            },
            "defPath": path.join(__dirname, '../def')
        },
        {
            "dbConfig": {
                "host"     : "127.0.0.1",
                "database" : "soar2",
                "user"     : "root",
                "password" : "xxxxxx",
                "supportBigNumbers" : true,
                "connectionLimit"   : 16
            },
            "defPath": path.join(__dirname, '../def/soar2')
        }
    ]);
});


describe('Access multiple databases', function()  {

    it('Simple query', function(done) {
        var  options = {
            vfile: 'soar.Person/general.dvml',
            params: {psnID: 1}
        };

        soar.query(options, function(err, data) {
            assert.equal( data.name, 'John', 'Person name not matched.');

            options.vfile = 'soar2.Person/general.dvml';
            soar.query(options, function(err, data) {
                assert.equal( data.name, 'Steve', 'name should be Steve');
                done();
            });
        });
    });
});
