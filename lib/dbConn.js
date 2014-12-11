var  fs = require('fs'),
	 mysql = require('mysql');

var  dbConn = (function() {
	var  dbConn = function(options)  {
		this.pool = mysql.createPool( options );

		this.getConnection = function  getConn(handler)  {
			try  {
				this.pool.getConnection( handler );
			}
			catch (e)  {
				handler( e );
			}
		};

		this.closeDown = function(callback) {
			this.pool.end( callback );
		};
	};

	return  dbConn;
})();

module.exports = dbConn;
