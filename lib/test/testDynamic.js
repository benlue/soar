/*!
* soar
* authors: Ben Lue
* license: MIT License
* Copyright(c) 2015 Gocharm Inc.
*/
var  assert = require('assert'),
     path = require('path'),
     soar = require('../soar.js');

//soar.setDebug( true );

before(function() {
    soar.config();
});


describe('Dynamically generated SQL expression', function()  {

    it('Query generation', function() {
    	var  option = {
    		op: 'query',
    		expr: {
    			table: {name: 'Person'},
    			columns: ['id', 'addr AS address'],
    			filters: {
    				op: 'AND',
    				filters: [
    					{name: 'addr', op: '='},
    					{op: 'OR',
    					 filters: [
    					 	{name: 'x', field: 'passwd', op: 'IS NOT NULL', noArg: true},
    					 	{name: 'age', op: '>'}
    					 ]}
    				]
    			},
    			extra: 'ORDER BY id'
    		},
    		query: {
    			addr: '123',
    			x: 'abc',
    			age: 18
    		},
    		conn: queryConn
    	};

    	soar.execute(option, function(err, result) {
    		//console.log( JSON.stringify(result, null, 4) );
            var  p = result.p,
                 sql = result.sql;

            assert.equal(p[0], '123', 'address is 123');
            assert.equal(p[1], 18, 'age is 18');
            assert.equal(sql, 'SELECT id, addr AS address FROM Person WHERE (addr = ? AND (passwd IS NOT NULL OR age > ?)) ORDER BY id LIMIT 1;', 'sql not correct');

            option.query = {addr: '123'};
            soar.execute(option, function(err, result) {
                var  sql = result.sql;
                //console.log( JSON.stringify(result, null, 4) );
                assert.equal(sql, 'SELECT id, addr AS address FROM Person WHERE addr = ? ORDER BY id LIMIT 1;', 'sql not correct');
            });
    	});
    });

    it('List generation', function() {
        var  option = {
            op: 'list',
            expr: {
                table: {name: 'Person'},
                columns: ['id', 'addr AS address'],
                filters: {
                    op: 'AND',
                    filters: [
                        {name: 'addr', op: '='},
                        {op: 'OR',
                         filters: [
                            {name: 'x', field: 'passwd', op: 'IS NOT NULL', noArg: true},
                            {name: 'age', op: '>'}
                         ]}
                    ]
                },
                extra: 'ORDER BY id'
            },
            query: {
                addr: '123',
                x: 'abc',
                age: 18
            },
            conn: mockConn
        };

        soar.execute(option, function(err, result) {
            //console.log( JSON.stringify(result, null, 4) );
 
            var  p = result.p,
                 sql = result.sql;

            assert.equal(p[0], '123', 'address is 123');
            assert.equal(p[1], 18, 'age is 18');
            assert.equal(sql, 'SELECT id, addr AS address FROM Person WHERE (addr = ? AND (passwd IS NOT NULL OR age > ?)) ORDER BY id;', 'sql not correct');
        });
    });

    it('Join generation', function() {
        var  option = {
            op: 'list',
            expr: {
                table: {
                    name: 'Person AS psn',
                    join: [
                        {table: 'GeoLoc', use: 'geID'},
                        {table: 'Org', type: 'LEFT', onWhat: 'psn.orgID=Org.orgID'}
                    ]
                },
                columns: ['id', 'addr AS address'],
                filters: {
                    op: 'AND',
                    filters: [
                        {name: 'addr', op: '='},
                        {op: 'OR',
                         filters: [
                            {name: 'x', field: 'passwd', op: 'IS NOT NULL', noArg: true},
                            {name: 'age', op: '>'}
                         ]}
                    ]
                },
                extra: 'ORDER BY id'
            },
            query: {
                addr: '123',
                x: 'abc',
                age: 18
            },
            conn: mockConn
        };

        soar.execute(option, function(err, result) {
            //console.log( JSON.stringify(result, null, 4) );
            var  p = result.p,
                 sql = result.sql;

            assert.equal(p[0], '123', 'address is 123');
            assert.equal(p[1], 18, 'age is 18');
            assert.equal(sql, 'SELECT id, addr AS address FROM Person AS psn JOIN GeoLoc USING(`geID`)  LEFT JOIN Org ON psn.orgID=Org.orgID WHERE (addr = ? AND (passwd IS NOT NULL OR age > ?)) ORDER BY id;', 'sql not correct');
        });
    });

    it('Insert generation', function() {
        var  option = {
            op: 'insert',
            expr: {
                table: {name: 'Person'},
                columns: ['id', 'addr', 'age']
            },
            data: {
                id: 234,
                age: 28
            },
            conn: insertConn
        };

        soar.execute(option, function(err, result) {
            //console.log( JSON.stringify(result, null, 4) );
            var  p = result.p,
                 sql = result.sql;

            assert.equal(p.length, 2, '2 input');
            assert.equal(p[0], 234, 'id is 234');
            assert.equal(p[1], 28, 'age set to 28');
            assert.equal(sql, 'INSERT INTO Person (id, age) VALUES (?, ?);', 'sql not correct');
        });
    });

    it('Update generation', function() {
        var  option = {
            op: 'update',
            expr: {
                table: {name: 'Person'},
                columns: ['id', 'addr', 'age'],
                filters: {
                    op: 'AND',
                    filters: [
                        {name: 'addr', op: '='},
                        {op: 'OR',
                         filters: [
                            {name: 'x', field: 'passwd', op: 'IS NOT NULL', noArg: true},
                            {name: 'age', op: '>'}
                         ]}
                    ]
                }
            },
            data: {
                id: 234,
                age: 28
            },
            query: {
                addr: '123',
                x: 'abc',
                age: 18
            },
            conn: mockConn
        };

        soar.execute(option, function(err, result) {
            //console.log( JSON.stringify(result, null, 4) );
            var  p = result.p,
                 sql = result.sql;

            assert.equal(p.length, 4, '4 input');
            assert.equal(p[0], 234, 'id is 234');
            assert.equal(p[1], 28, 'age set to 28');
            assert.equal(sql, 'UPDATE Person SET id=?, age=? WHERE (addr = ? AND (passwd IS NOT NULL OR age > ?));', 'sql not correct');
        });
    });

    it('Delete generation', function() {
        var  option = {
            op: 'delete',
            expr: {
                table: {name: 'Person'},
                filters: {
                    op: 'AND',
                    filters: [
                        {name: 'addr', op: '='},
                        {op: 'OR',
                         filters: [
                            {name: 'x', field: 'passwd', op: 'IS NOT NULL', noArg: true},
                            {name: 'age', op: '>'}
                         ]}
                    ]
                }
            },
            query: {
                addr: '123',
                age: 18
            },
            conn: mockConn
        };

        soar.execute(option, function(err, result) {
            //console.log( JSON.stringify(result, null, 4) );
            var  p = result.p,
                 sql = result.sql;

            assert.equal(p.length, 2, '2 input');
            assert.equal(p[0], '123', 'address is 123');
            assert.equal(p[1], 18, 'age is 18');
            assert.equal(sql, 'DELETE FROM Person WHERE (addr = ? AND age > ?);', 'sql not correct');
        });
    });
});

var  queryConn = {
    query: function(sql, p, cb)  {
        cb( null, [{p: p, sql:sql}] );
    }
};

var  insertConn = {
    query: function(sql, p, cb)  {
        cb( null, {insertId: {p: p, sql:sql}} );
    }
};

var  mockConn = {
    query: function(sql, p, cb)  {
        //console.log( JSON.stringify(p, null, 4) );
        //console.log('sql is: %s', sql);
        cb( null, {p: p, sql:sql} );
    }
};