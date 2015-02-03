/*!
* soar
* authors: Ben Lue
* license: MIT License
* Copyright(c) 2015 Gocharm Inc.
*/
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
                "user"     : "my_acc",
                "password" : "my_passwd",
                "supportBigNumbers" : true,
                "connectionLimit"   : 16
            },
            "defPath": path.join(__dirname, '../def')
        },
        {
            "dbConfig": {
                "host"     : "127.0.0.1",
                "database" : "soar2",
                "user"     : "my_acc",
                "password" : "my_passwd",
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

    it('List query', function(done) {
        soar.list('Person/general.dvml', function(err, list) {
            assert.equal( list.length, 3, 'Should have 3 persons.');

            var  options = {
                vfile: 'soar2.Person/general.dvml',
                range: soar.range(1, 2)
            };

            soar.list( options, function(err, list) {
                assert.equal( list.length, 2, 'Should return 2 records.');
                done();
            });
        });
    });

    it('Update', function(done) {
        var  options = {
            entity: 'Person',
            data: {name: 'John Mayer'},
            terms: {psnID: 1}
        };

        soar.update(options, function(err) {
            assert(!err, 'Failed to do update.');
            soar.query('Person/general.dvml', {psnID: 1}, function(err, data) {
                assert.equal( data.name, 'John Mayer', 'Person name not matched.');

                // restore data
                options.data = {name: 'John'};
                soar.update(options, function(err) {
                    assert(!err, 'Failed to do update.');
                    done();
                });
            });
        })
    });

    it('Insert and delete with transactions', function(done) {
        soar.getConnection( 'soar', function(err, conn) {
            conn.beginTransaction(function(err) {
                assert(!err, 'Transaction failed to get started.');

                var  options = {
                    entity: 'soar.Person',
                    data: {name: 'Scott Cooper'},
                    conn: conn
                };

                soar.insert(options, function(err, psnID) {
                    assert(psnID, 'Failed to insert');

                    options.terms = {psnID: psnID};
                    delete  options.data;

                    soar.del(options, function(err) {
                        assert(!err, 'Failed to delete.');
                        conn.commit( function(err) {
                            assert(!err, 'Transaction failed to commit.');
                            done();
                        });
                    });
                });
            });
        });
    });

    it('Test fields with query', function(done) {
        var  options = {
            vfile: 'soar2.Person/general.dvml',
            params: {psnID: 1},
            fields: ['psnID']
        };

        // do soar.config() again to clear (reload) view definition
        soar.config();
        soar.query( options, function(err, data) {
            assert(!err, 'Failed to query');
            assert.equal( data.psnID, 1, 'Person ID not matched.');
            assert(!data.name, 'Name fields should have been removed.');
            done();
        });
    });

    it('Test fields with list', function(done) {
        var  options = {
            vfile: 'Person/general.dvml',
            fields: ['psnID']
        };

        soar.list( options, function(err, list) {
            assert(!err, 'Failed to list.');
            assert.equal( list.length, 3, 'Should have 3 records.');
            assert(!list[0].name, 'Name fields should have been removed.');
            done();
        });
    });
});
