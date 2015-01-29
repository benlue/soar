/*!
* soar
* authors: Ben Lue
* license: MIT License
* Copyright(c) 2015 Gocharm Inc.
*/
var  assert = require('assert'),
     path = require('path'),
     soar = require('../lib/soar.js'),
     sqlComp = require('../lib/sqlComp.js');

//soar.setDebug( true );

before(function() {
    soar.config();
});

describe('Test various SQL commands', function()  {
    it('Simple query', function(done) {
        soar.query('Person/general.dvml', {psnID: 1}, function(err, data) {
            assert( data, 'Missing psnID=1 data');
            assert.equal( data.name, 'John', 'Person name not matched.');

            var  options = {
                vfile: 'Person/general.dvml',
                params: {psnID: 1}
            };

            soar.query(options, function(err, data) {
                assert( data, 'Missing psnID=1 data');
                assert.equal( data.name, 'John', 'Person name not matched.');
                done();
            });
        });
    });

    it('List query', function(done) {
        soar.list('Person/general.dvml', function(err, list) {
            assert.equal( list.length, 3, 'Should have 3 persons.');

            var  options = {
                vfile: 'Person/general.dvml',
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
        soar.getConnection( function(err, conn) {
            conn.beginTransaction(function(err) {
                assert(!err, 'Transaction failed to get started.');

                var  options = {
                    entity: 'Person',
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
                })
            });
        });
    });

    it('Test fields with query', function(done) {
        var  options = {
            vfile: 'Person/general.dvml',
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


describe('Test dynamic query', function()  {
    it('Simple query', function(done) {
        var  scomp = new sqlComp('Person'),
             expr = scomp.column(['psnID', 'name']).
        filter( {name: 'psnID'} ).
        value();

        var  option = {
            op: 'query',
            expr: expr,
            query: {psnID: 1}
        };

        soar.execute(option, function(err, data) {
            assert( data, 'Missing psnID=1 data');
            assert.equal( data.name, 'John', 'Person name not matched.');
            done();
        });
    });

    it('Simple query with alias', function(done) {
        var  scomp = new sqlComp('Person'),
             expr = scomp.column(['psnID', 'name AS fullName']).
        filter( {name: 'psnID'} ).
        value();

        var  option = {
            op: 'query',
            expr: expr,
            query: {psnID: 1}
        };

        soar.execute(option, function(err, data) {
            assert( data, 'Missing psnID=1 data');
            assert.equal( data.fullName, 'John', 'Person name not matched.');
            done();
        });
    });

    it('Update', function(done) {
        var  scomp = new sqlComp('Person'),
             expr = scomp.column(['psnID', 'name']).
        filter( {name: 'psnID'} ).
        value();

        var  option = {
            op: 'update',
            expr: expr,
            data: {name: 'John Mayer'},
            query: {psnID: 1}
        };

        soar.execute(option, function(err) {
            assert(!err, 'Failed to do update.');

            option.op = 'query';
            soar.execute(option, function(err, data) {
                assert.equal( data.name, 'John Mayer', 'Person name not matched.');

                // restore data
                option.op = 'update';
                option.data = {name: 'John'};
                soar.execute(option, function(err) {
                    assert(!err, 'Failed to do update.');
                    done();
                });
            });
        })
    });

    it('Insert and delete with transactions', function(done) {
        var  scomp = new sqlComp('Person'),
             expr = scomp.column(['psnID', 'name']).
        filter( {name: 'psnID'} ).
        value();

        soar.getConnection( function(err, conn) {
            conn.beginTransaction(function(err) {
                assert(!err, 'Transaction failed to get started.');

                var  option = {
                    op: 'insert',
                    expr: expr,
                    data: {name: 'Scott Cooper'},
                    conn: conn
                };

                soar.execute(option, function(err, psnID) {
                    assert(psnID, 'Failed to insert');

                    option.op = 'delete';
                    option.query = {psnID: psnID};
                    delete  option.data;

                    soar.execute(option, function(err) {
                        assert(!err, 'Failed to delete.');
                        conn.commit( function(err) {
                            assert(!err, 'Transaction failed to commit.');
                            done();
                        });
                    });
                })
            });
        });
    });
});