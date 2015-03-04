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
	soar.config();
});


describe('Schema manipulation with connection specified', function()  {

    it('Create table', function(done) {
    	var  schMgr = soar.getSchemaManager(),
    		 schema = {
    		 	title: 'TestPage',
			    columns: {
			        page_id: {type: 'serial'},
			        title: {
			            type: 'string',
			            maxLength: 32
			        }
			    },
			    primary:  ['page_id']
    		 };

    	soar.getConnection(function(err, conn)  {
    		schMgr.createTable( conn, schema, function(err)  {
    			assert(!err, 'Creation failed');

    			schMgr.describeTable(conn, 'TestPage', function(err, schema) {
    				//console.log( JSON.stringify(schema.columns, null, 2) );
    				assert.equal(schema.title, 'TestPage', 'table name is wrong');
    				assert.equal(Object.keys(schema.columns).length, 2, 'table has 2 columns');
    				done();
    			})
    		});
    	});
    });

    it('Alter table -- add', function(done) {
    	var  schema = {
    		title: 'TestPage',
    		add: {
    			column: {
    				year: {type:'integer', format: 'int16'},
    				psnID: {type: 'integer', format: 'int64'}
    			},
    			index: {
		            IDX_PAGE_YEAR: {
		                columns: ['year']
		            }
		        },
		        foreignKey: {
		            FK_pageRpsn: {
		                key: 'psnID',
		                reference: 'Person.psnID',
		                integrity: {
		                    delete: 'cascade',
		                    update: 'cascade'
		                }
		            }
		        }
    		}
    	};

    	var  schMgr = soar.getSchemaManager();
    	soar.getConnection(function(err, conn)  {
    		schMgr.alterTable( conn, schema, function(err)  {
    			if (err)
    				console.log( err.stack );
    			assert(!err, 'Altering table failed');

    			schMgr.describeTable(conn, 'TestPage', function(err, schema) {
    				//console.log( JSON.stringify(schema.columns, null, 2) );
    				assert.equal(schema.title, 'TestPage', 'table name is wrong');
    				assert.equal(Object.keys(schema.columns).length, 4, 'table has 4 columns');
    				done();
    			})
    		});
    	});
    });

    it('Alter table -- drop', function(done) {
        var  schema = {
            title: 'TestPage',
            drop: {
                column: ['year'],
                index: ['IDX_PAGE_YEAR'],
                foreignKey: ['FK_pageRpsn']
            }
        };

        var  schMgr = soar.getSchemaManager();
        soar.getConnection(function(err, conn)  {
            schMgr.alterTable( conn, schema, function(err)  {
                if (err)
                    console.log( err.stack );
                assert(!err, 'Altering table failed');

                schMgr.describeTable(conn, 'TestPage', function(err, schema) {
                    //console.log( JSON.stringify(schema.columns, null, 2) );
                    assert.equal(schema.title, 'TestPage', 'table name is wrong');
                    assert.equal(Object.keys(schema.columns).length, 3, 'table has 3 columns');
                    done();
                })
            });
        });
    });

    it('Delete table', function(done) {
    	var  schMgr = soar.getSchemaManager();
    	soar.getConnection(function(err, conn)  {
    		schMgr.deleteTable(conn, 'TestPage', function(err)  {
    			assert(!err, 'Deletion failed');
    			done();
    		});
    	});
    });
});

describe('Schema manipulation without connection specified', function()  {

    it('Create table', function(done) {
        var  schema = {
                title: 'TestPage',
                columns: {
                    page_id: {type: 'serial'},
                    title: {
                        type: 'string',
                        maxLength: 32
                    }
                },
                primary:  ['page_id']
             };

        soar.createTable( schema, function(err)  {
            assert(!err, 'Creation failed');

            soar.describeTable('TestPage', function(err, schema) {
                //console.log( JSON.stringify(schema.columns, null, 2) );
                assert.equal(schema.title, 'TestPage', 'table name is wrong');
                assert.equal(Object.keys(schema.columns).length, 2, 'table has 2 columns');
                done();
            })
        });
    });

    it('Alter table -- add', function(done) {
        var  schema = {
            title: 'TestPage',
            add: {
                column: {
                    year: {type:'integer', format: 'int16'},
                    psnID: {type: 'integer', format: 'int64'}
                },
                index: {
                    IDX_PAGE_YEAR: {
                        columns: ['year']
                    }
                },
                foreignKey: {
                    FK_pageRpsn: {
                        key: 'psnID',
                        reference: 'Person.psnID',
                        integrity: {
                            delete: 'cascade',
                            update: 'cascade'
                        }
                    }
                }
            }
        };

        soar.alterTable( schema, function(err)  {
            if (err)
                console.log( err.stack );
            assert(!err, 'Altering table failed');

            soar.describeTable('TestPage', function(err, schema) {
                //console.log( JSON.stringify(schema.columns, null, 2) );
                assert.equal(schema.title, 'TestPage', 'table name is wrong');
                assert.equal(Object.keys(schema.columns).length, 4, 'table has 4 columns');
                done();
            })
        });
    });

    it('Alter table -- drop', function(done) {
        var  schema = {
            title: 'TestPage',
            drop: {
                column: ['year'],
                index: ['IDX_PAGE_YEAR'],
                foreignKey: ['FK_pageRpsn']
            }
        };

        soar.alterTable( schema, function(err)  {
            if (err)
                console.log( err.stack );
            assert(!err, 'Altering table failed');

            soar.describeTable('TestPage', function(err, schema) {
                //console.log( JSON.stringify(schema.columns, null, 2) );
                assert.equal(schema.title, 'TestPage', 'table name is wrong');
                assert.equal(Object.keys(schema.columns).length, 3, 'table has 3 columns');
                done();
            })
        });
    });

    it('Delete table', function(done) {
        soar.deleteTable('TestPage', function(err)  {
            assert(!err, 'Deletion failed');
            done();
        });
    });
});