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

describe('Test errors', function()  {

    it('Wrong command', function(done) {
        var  cmd = {
                op: "query"
             };
             
        soar.execute(cmd, {col: 123}, function(err)  {
           assert(err.stack, 'an error should be thrown.');
           done(); 
        });
	});
	
    it('sql template', function(done) {
       var  sqls = soar.sqlTemplate('myTable');
       
       try  {
           sqls.join({});
       } 
       catch (err)  {
           assert(err.stack, 'should throw an error.');
           done();
       }
    });
});