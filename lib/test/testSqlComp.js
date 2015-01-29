/*!
* soar
* authors: Ben Lue
* license: MIT License
* Copyright(c) 2015 Gocharm Inc.
*/
var  assert = require('assert'),
     path = require('path'),
     soar = require('../soar.js'),
     sqlComp = require('../sqlComp.js');

//soar.setDebug( true );

before(function() {
    soar.config();
});


describe('SQL composition', function()  {

    it('Query generation', function() {
    	var  scomp = new sqlComp('Person'),
    		 orFilter = scomp.chainFilters('OR', [
    		 	{name: 'x', field: 'passwd', op: 'IS NOT NULL', noArg: true},
    			{name: 'age', op: '>'}
    		 ]),
    		 andFilter = scomp.chainFilters('AND', [
    		 	{name: 'addr', op: '='},
    		 	orFilter
    		 ]);

    	var  expr = scomp.column(['id', 'addr AS address']).
    	filter( andFilter ).
    	extra( 'ORDER BY id' ).value();

    	var  option = {
    		op: 'query',
    		expr: expr,
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

	it('Join generation', function() {
    	var  scomp = new sqlComp('Person AS psn'),
    		 orFilter = scomp.chainFilters('OR', [
    		 	{name: 'x', field: 'passwd', op: 'IS NOT NULL', noArg: true},
    			{name: 'age', op: '>'}
    		 ]),
    		 andFilter = scomp.chainFilters('AND', [
    		 	{name: 'addr', op: '='},
    		 	orFilter
    		 ]);

    	var  expr = scomp.column(['id', 'addr AS address']).
    	filter( andFilter ).
    	extra( 'ORDER BY id' ).
    	join({table: 'GeoLoc', use: 'geID'}).
    	join({table: 'Org', type: 'LEFT', onWhat: 'psn.orgID=Org.orgID'}).
    	value();

    	var  option = {
    		op: 'list',
    		expr: expr,
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
});


var  queryConn = {
    query: function(sql, p, cb)  {
        cb( null, [{p: p, sql:sql}] );
    }
};

var  mockConn = {
    query: function(sql, p, cb)  {
        cb( null, {p: p, sql:sql} );
    }
};