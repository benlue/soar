var  assert = require('assert'),
     dbConn = require('../lib/dbConn.js'),
     path = require('path'),
     soar = require('../lib/soar.js');

var  dbUser = 'my_acc',
     rightPasswd = 'my_passwd',
     wrongPasswd = 'xxxx';

//soar.setDebug( true );

describe('Test configuration and settings', function()  {

    it('Reading default configurations', function(done) {
        soar.config();
        soar.list('Person/general.dvml', function(err, list) {
            assert.ifError( err );
            assert.equal(list.length, 3, 'We have three samples.');
            done();
        });
    });

    it('Setting wrong DB configurations', function(done) {
        var  options = {
            dbConfig: {
                "host"     : "127.0.0.1",
                "database" : "soar",
                "user"     : dbUser,
                "password" : wrongPasswd,
                "supportBigNumbers" : true,
                "connectionLimit"   : 32
            }
        };
        soar.config( options );
        soar.list('Person/general.dvml', function(err, list) {
            assert(err, 'Should throw exception here.');
            done();
        });
    });

    it('Setting correct DB configurations', function(done) {
        var  options = {
            dbConfig: {
                "host"     : "127.0.0.1",
                "database" : "soar",
                "user"     : dbUser,
                "password" : rightPasswd,
                "supportBigNumbers" : true,
                "connectionLimit"   : 32
            }
        };
        soar.config( options );
        soar.list('Person/general.dvml', function(err, list) {
            assert.ifError( err );
            assert.equal(list.length, 3, 'We have three samples.');
            done();
        });
    });

    /*
    it('Setting the wrong definition file path', function(done) {
        var  options = {
            defPath: '/usr/john'
        };
        soar.config( options );
        soar.list('Person/general.dvml', function(err, list) {
            assert(err, 'Should throw exception here.');
            done();
        });
    });

    it('Setting the correct definition file path', function(done) {
        var  options = {
            defPath: path.join(__dirname, '../def/')
        };
        soar.config( options );
        soar.list('Person/general.dvml', function(err, list) {
            assert.ifError( err );
            assert.equal(list.length, 3, 'We have three samples.');
            done();
        });
    });
    */
});
