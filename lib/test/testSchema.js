/*!
* soar
* authors: Ben Lue
* license: MIT License
* Copyright(c) 2015 Gocharm Inc.
*/
var  assert = require('assert'),
     path = require('path'),
     soar = require('../soar.js'),
     schMgr = require('../schemaManager.js');

 before(function() {
     soar.config(
     {
         "dbConfig": {
             "host"     : "127.0.0.1",
             "database" : "udb001",
             "user"     : "your_acc_name",
             "password" : "your_passwd",
             "supportBigNumbers" : true,
             "connectionLimit"   : 16
         },
         "defPath": path.join(__dirname, '../def')
     });
 });


describe('SQL generation', function()  {

    it('Create table', function() {
        var  schema = {
            title: 'Person',
            columns: {
                Person_id: {type: 'serial'},
                fname: {
                    type: 'string',
                    maxLength: 32,
                    options: {
                        notNull: true
                    }
                },
                mdTime: {
                    type: 'datetime'
                }
            },
            primary: ['Person_id', 'fname'],
            options: {
                engine: 'InnoDB'
            }
        };

        schMgr.createTable(mockConn, schema, function(err, sql) {
            var  s1 = 'CREATE TABLE Person\n(\n  Person_id\t\tbigint unsigned not null auto_increment unique,\n',
                 s2 = '  fname\t\tvarchar(32) NOT NULL,\n  mdTime\t\tdatetime,\n  primary key (Person_id, fname)\n)\nengine = InnoDB;',
                 correct = s1 + s2;

            //console.log(sql);
            assert.equal(sql, correct, 'sql mismatch');
        });

        schema.columns = {
            Person_id: {type: "integer", format: 'int64', options: {autoInc: true}},
            salary: {type: 'number', format: 'decimal10,2'},
            isValid: {type: "boolean", options: {default: true}}
        };
        schema.options = {
            engine: 'InnoDB',
            comment: 'Person profile'
        };

        schMgr.createTable(mockConn, schema, function(err, sql) {
            var  s1 = 'CREATE TABLE Person\n(\n  Person_id\t\tbigint AUTO_INCREMENT,\n';
                 s2 = "  salary\t\tdecimal(10,2),\n  isValid\t\tbool DEFAULT true,\n  primary key (Person_id, fname)\n)\nengine = InnoDB COMMENT = 'Person profile';";
                 correct = s1 + s2;
            //console.log(sql);
            assert.equal(sql, correct, 'sql mismatch');
        });
    });

    it('Alter table', function() {
        var  schema = {
            title: 'Person',
            add: {
                column: {
                    salary: {type: 'number', format: 'decimal10,2'},
                    isValid: {type: "boolean", options: {default: true}}
                },
                index: {
                    IDX_PSN_LIST: {
                        columns: ['fname', 'isValid'],
                        unique: true
                    }
                }
            },
            drop: {
                column: ['addr']
            }
        };

        schMgr.alterTable(mockConn, schema, function(err, sql) {
            var  s1 = 'ALTER TABLE Person\nADD COLUMN salary\tdecimal(10,2),\n';
                 s2 = "ADD COLUMN isValid\tbool DEFAULT true,\nADD UNIQUE INDEX IDX_PSN_LIST (fname, isValid),\n",
                 s3 = "DROP COLUMN addr;";
                 correct = s1 + s2 + s3;
            //console.log(sql);
            assert.equal(sql, correct, 'sql mismatch');
        });

        schema.add = {
            column: {
                    salary: {type: 'number', format: 'decimal10,2'}
            },
            foreignKey: {
                FK_bpdRbk: {
                    key: 'bkID',
                    reference: 'Books.bkID',
                    integrity: {
                        delete: 'cascade',
                        update: 'cascade'
                    }
                }
            }
        };
        schema.drop = {
            index: ['IDX_A', 'IDX_B'],
            foreignKey: ['FK_X', 'FK_Y']
        };

        schMgr.alterTable(mockConn, schema, function(err, sql) {
            var  s1 = 'ALTER TABLE Person\nADD COLUMN salary\tdecimal(10,2),\n';
                 s2 = "ADD CONSTRAINT FK_bpdRbk FOREIGN KEY (bkID) references Books (bkID) ON DELETE cascade ON UPDATE cascade,\n",
                 s3 = "DROP INDEX IDX_A,\nDROP INDEX IDX_B,\nDROP FOREIGN KEY FK_X,\nDROP FOREIGN KEY FK_Y;";
                 correct = s1 + s2 + s3;
            //console.log(sql);
            assert.equal(sql, correct, 'sql mismatch');
        });
    });
});


describe('Database administration', function()  {

    it('Create table', function(done) {
        var  schema = {
            title: 'Person',
            columns: {
                Person_id: {type: 'serial'},
                fname: {
                    type: 'string',
                    maxLength: 32,
                    options: {
                        notNull: true
                    }
                },
                mdTime: {
                    type: 'datetime'
                }
            },
            primary: ['Person_id'],
            options: {
                engine: 'InnoDB'
            }
        };

        soar.getConnection(function(err, conn) {
            schMgr.createTable(conn, schema, function(err) {
                done();
                /*
                schMgr.deleteTable(conn, 'Person', function(err) {
                    conn.release();
                    done();
                });
                */
            });
        });
    });

    it('Describe table', function(done) {
        soar.getConnection(function(err, conn) {
            schMgr.describeTable(conn, 'Person', function(err, schema) {
                //console.log( JSON.stringify(schema, null, 4) );
                assert.equal(schema.title, 'Person', "Table name is 'Person'");
                assert(schema.columns.psnID, 'Should have the Person_id column');
                assert.equal(schema.columns.psnID.type, "integer", "integer type");
                assert.equal(schema.columns.name.type, "string", "string type");
                assert.equal(schema.primary.length, 1, 'One primary key');
                assert.equal(schema.primary[0], 'psnID', 'PK is psnID');
                assert.equal(schema.options.engine, 'InnoDB', 'engine type is InnoDB');
                done();
            });
        });
    });

    it('Alter table', function(done) {
        var  schema = {
            title: 'Person',
            add: {
                column: {
                    salary: {type: 'number', format: 'decimal10,2'}
                },
                index: {
                    IDX_PSN_fname: {
                        columns: ['fname'],
                        unique: true
                    }
                }
            },
            drop: {
                column: ['mdTime']
            }
        };

        soar.getConnection(function(err, conn) {
            schMgr.alterTable(conn, schema, function(err) {
                schMgr.deleteTable(conn, 'Person', function(err) {
                    conn.release();
                    done();
                });
            });
        });
    });
});


var  mockConn = {
    query: function(sql, cb)  {
        cb( null, sql );
    }
};
