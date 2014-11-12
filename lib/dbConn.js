var  fs = require('fs'),
	 mysql = require('mysql');

var  dbConn = (functio() {
	var  dbConn = function(options)  {
		this.pool = mysql.createPool( options );

		this.getConnection = function  getConn(handler)  {
			pool.getConnection( handler );
		};
	};

	return  dbConn;
})();

module.exports = dbConn;
