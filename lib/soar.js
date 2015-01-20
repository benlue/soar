/*!
* soar
* authors: Ben Lue
* license: MIT License
* Copyright(c) 2015 Gocharm Inc.
*/
var  dbConn = require('./dbConn.js'),
	 fs = require('fs'),
	 path = require('path'),
	 xml2js = require('xml2js'),
	 mysql = require('./sqlGenMySql.js');

var  basePath = {},
	 defCache = {},
	 dftDB,			// name of the default database
	 DEF_PAGE_SIZE = 20,
	 dbe_debug = false,
	 useDB = {};

var  Range = (function() {

	function  Range(pageIdx, pSize)  {
		this.pageIdx = pageIdx;			// page index starts from 1
		this.pageSize = pSize || DEF_PAGE_SIZE;
	};

	Range.prototype.getIndex = function()  {
		return  (this.pageIdx - 1) * this.pageSize;
	};

	Range.prototype.getPageSize = function()  {
		return  this.pageSize;
	};

	return  Range;
})();

exports.range = function newRange(idx, size)  {
	return  new Range(idx, size);
};

exports.config = function(options)  {
	if (Array.isArray(options))  {
		dftDB = configDB(options[0]);

		for (var i = 1, len = options.length; i < len; i++)
			configDB(options[i]);
	}
	else
		dftDB = configDB(options);

	// clean up definition file cache
	defCache = {};
};

exports.getConnection = function(handler, dbName)  {
	dbName = dbName || dftDB;
	useDB[dbName].getConnection(handler);
};


function  configDB(options)  {
	options = options || {};
	var  defPath = '../def/',
	dbConfig = options.dbConfig;

	// first, set up db connection
	if (!dbConfig)  {
		try  {
			var  configFile = options.configFile || path.join(__dirname, '../config.json'),
			dftOption = JSON.parse( fs.readFileSync(configFile) );
			dbConfig = dftOption.dbConfig;

			if (dftOption.defPath)
				defPath = dftOption.defPath;
		}
		catch (e)  {}
	}

	var  dbName = dbConfig.database;
	useDB[dbName] = new dbConn(dbConfig);

	// then set up the entity definition directory
	basePath[dbName] = options.defPath || path.join(__dirname, defPath);

	return  dbName;
};


var  EntDef = (function() {

	function  EntDef(jsObj)  {
		//console.log( jsObj );
		if (jsObj.table.length == 0)
			return  new Error('The table tag is missing.');
		this.table = handleTable( jsObj.table[0] );

		// now deal with 'fields'
		if (jsObj.fields.length == 0 || jsObj.fields[0].field.length == 0)
			return  new Error('The field tags are missing.');
		this.fields = handleFields( jsObj.fields[0].field );

		// filters...
		this.filters = (jsObj.filter.length > 0)  ?  handleFilters( jsObj.filter[0]) : null;

		// extra
		this.extra = (jsObj.extra)  ?  jsObj.extra[0].trim() : null;
	};

	EntDef.prototype.getTable = function()  {
		return  this.table;
	};

	EntDef.prototype.getFields = function()  {
		return  this.fields;
	};

	EntDef.prototype.getFilters = function()  {
		return  this.filters;
	};

	EntDef.prototype.getExtra = function()  {
		return  this.extra;
	};

	return  EntDef;
})();

/*********************** This section is to analyze DVML ************************/
function  handleTable(mainTable)  {
	var  table = {};
	table.name = mainTable['$'].name;

	if (mainTable.hasOwnProperty('join'))  {
		var  jtList = new Array();
		mainTable.join.forEach( function(jt) {
			var  jtAttr = jt['$'];
			if (!jtAttr.hasOwnProperty('use'))
				jtAttr.onWhat = jt['_'];		// text of the 'join' tag
			jtList.push( jtAttr );
		});

		table.join = jtList;
	}

	return  table;
};

function  handleFields(fObj)  {
	var  fields = new Array();
	fObj.forEach( function(f)  {
		fields.push( f['$'] );
	});

	return  fields;
};

function  handleFilters(filters)  {
	var  filter = filters.hasOwnProperty('$')  ?  filters['$'] : {};
	if (filters.hasOwnProperty('filter'))  {
		var  list = new Array();
		filters.filter.forEach( function(f) {
			list.push( handleFilters(f) );
		});
		filter.list = list;
	}

	return  filter;
};
/*********************** End of DVML Analization Section ************************/

exports.setDebug = function  setDebug(b)  {
	mysql.setDebug(dbe_debug = b);
};


function readDVML(op, options, handler)  {
	var  vfile = options.vfile,
		 fpath = path.join(basePath[options.dbName], options.dbVFile);

	fs.readFile(fpath, function(err, xmlData) {
		if (err)
			handler( err );
		else  {
			var  parser = new xml2js.Parser();

			parser.parseString( xmlData, function(err, result) {
				if (err == null)  {
					var  eDef = new EntDef( result.db_view );

					if (!(eDef instanceof Error))  {
						// TODO: we have to make defCache a real cache, or its size may go out of control!
						defCache[vfile] = eDef;

						if (op === 'q')
							querying( eDef, options, handler );
						else  if (op === 'l')
							listing( eDef, options, handler );
						else  if (op == 'u')
							updating( eDef, options, handler );
						else  if (op == 'i')
							inserting( eDef, options, handler );
						else  if (op == 'd')
							deleting( eDef, options, handler );
					}
					else  handler( err );
				}
			});
		}
	});
};


function  disVfile(vfile)  {
	var  fparts = vfile.split('/'),
		 idx = fparts[0].indexOf('.'),
		 dbName = dftDB,
		 dbVFile = vfile;

	if (idx > 0)  {
		// a database name has been specified
		dbName = fparts[0].substring(0, idx);
		dbVFile = vfile.substring(dbName.length + 1);
	}
	return  {dbName: dbName, dbVFile: dbVFile};
};


/**
 * There are two possible signatures. One with four parameters: view file, query parameters, callback handler
 * and a possible DB connection. The other one requires two parameters: a callback handler and an options parameter
 * containing view file, query parameters and a possible DB connection.
 */
exports.query = function query(vfile, q, handler, conn)  {
	var  options;

	// handling input parameters...
	if (typeof vfile === 'string')  {
		if (!handler)  {
			handler = q;
			q = {};
		}
		options = {vfile: vfile, params: q, conn: conn};
	}
	else  {
		options = vfile;
		handler = q;
	}

	if (dbe_debug)
		console.log('Query [%s]...', options.vfile);

	var  eDef = defCache[options.vfile],
		 vfInfo = disVfile( options.vfile );
	options.dbName = vfInfo.dbName;
	options.dbVFile = vfInfo.dbVFile;

	if (eDef)
		querying(eDef, options, handler);
	else
		readDVML('q', options, handler);
};


exports.list = function list(vfile, q, range, handler, conn)  {
	var  options;

	// handling input parameters...
	if (typeof vfile === 'string')  {
		if (!handler)  {
			if (!range)  {
				handler = q;
				q = {};
			}
			else  {
				handler = range;
				if (q.constructor.name === 'Range')  {
					range = q;
					q = {};
				}
				else
					range = undefined;
			}
		}
		else if (!conn && range !== null && range.constructor.name !== 'Range') {
			conn = handler;
			handler = range;
			range = undefined;
		}
		options = {vfile: vfile, params: q, range: range, conn: conn};
	}
	else  {
		options = vfile;
		handler = q;
	}

	if (dbe_debug)
		console.log('List [%s]...', options.vfile);

	var  eDef = defCache[options.vfile],
		 vfInfo = disVfile( options.vfile );
	options.dbName = vfInfo.dbName;
	options.dbVFile = vfInfo.dbVFile;

	if (eDef)
		listing(eDef, options, handler);
	else
		readDVML('l', options, handler);
};


exports.insert = function insert(entName, data, handler, conn)  {
	var  options;
	if (typeof entName === 'string')
		options = {entity: entName, data: data, conn: conn};
	else  {
		options = entName;
		handler = data;
	}

	var  vfile = options.entity + '/general.dvml',
		 eDef = defCache[vfile],
		 vfInfo = disVfile( vfile );
	options.dbName = vfInfo.dbName;
	options.dbVFile = vfInfo.dbVFile;

	if (dbe_debug)
		console.log('Insert [%s]...', vfile);

	if (eDef)
		inserting( eDef, options, handler);
	else
		readDVML('i', options, handler);
};


exports.update = function update(entName, data, terms, handler, conn)  {
	var  options;
	if (typeof entName === 'string')
		options = {entity: entName, data: data, terms: terms, conn: conn};
	else  {
		options = entName;
		handler = data;
	}

	var  vfile = options.entity + '/general.dvml',
		 eDef = defCache[vfile],
		 vfInfo = disVfile( vfile );
	options.dbName = vfInfo.dbName;
	options.dbVFile = vfInfo.dbVFile;

	if (dbe_debug)
		console.log('Update [%s]...', vfile);

	if (eDef)
		updating(eDef, options, handler);
	else
		readDVML('u', options, handler);
};


exports.del = function del(entName, terms, handler, conn)  {
	var  options;
	if (typeof entName === 'string')
		options = {entity: entName, terms: terms, conn: conn};
	else  {
		options = entName;
		handler = terms;
	}

	var  vfile = options.entity + '/general.dvml',
		 eDef = defCache[vfile],
		 vfInfo = disVfile( vfile );
	options.dbName = vfInfo.dbName;
	options.dbVFile = vfInfo.dbVFile;

	if (dbe_debug)
		console.log('Delete [%s]...', vfile);

	if (eDef)
		deleting(eDef, options, handler);
	else
		readDVML('d', options, handler);
};


function  querying(eDef, options, handler)  {
	// 1. compose sql from eDef
	var  p = [],
		 sql = mysql.composeQuery( eDef, options.params || {}, p, options.fields );

	// 2. query db
	if (sql.length > 0)  {
		if (options.conn)
			options.conn.query(sql, p, function(qErr, rows) {
				if (qErr == null)
					handler( null, rows[0] );
				else
					options.conn.rollback(function() {
						handler( qErr );
					});
			});
		else
			useDB[options.dbName].getConnection( function(err, conn) {
				if (err === null)
					conn.query(sql, p, function(qErr, rows) {
						conn.release();

						if (qErr == null)
							handler( null, rows[0] );
						else
							handler( qErr );
					});
				else
					handler( err );
			});
	}
	else
		handler( new Error('Fail to compose the sql statement.') );
};


function  listing(eDef, options, handler)  {
	// 1. compose sql from eDef
	var  p = [],
		 sql = mysql.composeList( eDef, options.params || {}, p, options.range, options.fields );

	// 2. query db
	if (sql.length > 0)  {
		if (options.conn)
			options.conn.query(sql, p, function(qErr, rows) {
				if (qErr == null)  {
					if (options.range)  {
						var  ctSql = mysql.composeListCount( eDef, options.params, p );
						options.conn.query( ctSql, p, function(qErr2, rows2) {
							handler( null, rows, rows2[0].ct );
						});
					}
					else
						handler( null, rows );
				}
				else
					options.conn.rollback(function() {
						handler( qErr );
					});
			});
		else
			useDB[options.dbName].getConnection( function(err, conn) {
				if (err === null)
					conn.query(sql, p, function(qErr, rows) {
						if (qErr == null)  {
							if (options.range)  {
								var  ctSql = mysql.composeListCount( eDef, options.params || {}, p );
								conn.query( ctSql, p, function(qErr2, rows2) {
									conn.release();
									handler( null, rows, rows2[0].ct );
								});
							}
							else  {
								conn.release();
								handler( null, rows );
							}
						}
						else
							handler( qErr );
					});
				else
					handler( err );
			});
	}
	else
		handler( new Error('Fail to compose the sql statement.') );
};


function  inserting(eDef, options, handler)  {
	// 1. compose sql from eDef
	var  p = [],
		 sql = mysql.composeInsert( eDef, options.data, p );

	// 2. query db
	if (sql.length > 0)  {
		if (options.conn)
			options.conn.query(sql, p, function(qErr, result) {
				if (handler)  {
					if (qErr)
						options.conn.rollback(function() {
							handler( qErr );
						});
					else
						// result.insertId
						handler( null, result.insertId );
				}
			});
		else
			useDB[options.dbName].getConnection( function(err, conn) {
				if (err === null)
					conn.query(sql, p, function(qErr, result) {
						conn.release();

						if (handler)  {
							if (qErr == null)
								handler( null, result.insertId );
							else
								handler( qErr );
						}
					});
				else  if (handler)
					handler( err );
			});
	}
	else  if (handler)
		handler( new Error('Fail to compose the sql statement.') );
};


function  updating(eDef, options, handler)  {
	// 1. compose sql from eDef
	var  p = [],
		 sql = mysql.composeUpdate( eDef, options.data, options.terms || {}, p );

	// 2. query db
	if (sql.length > 0)  {
		if (options.conn)
			options.conn.query(sql, p, function(qErr, result) {
				if (qErr)
					options.conn.rollback(function() {
						handler( qErr );
					});
				else
					handler( null, result );
			});
		else
			useDB[options.dbName].getConnection( function(err, conn) {
				if (err)
					handler( err );
				else
					conn.query(sql, p, function(qErr, result) {
						conn.release();
						handler( qErr, result );
					});
			});
	}
	else
		handler( new Error('Fail to compose the sql statement.') );
};


function  deleting(eDef, options, handler)  {
	// 1. compose sql from eDef
	var  p = [],
		 sql = mysql.composeDelete( eDef, options.terms || {}, p );

	// 2. query db
	if (sql.length > 0)  {
		if (options.conn)
			options.conn.query(sql, p, function(qErr, result) {
				if (qErr)
					options.conn.rollback(function() {
						handler( qErr );
					});
				else
					handler( null, result );
			});
		else
			useDB[options.dbName].getConnection( function(err, conn) {
				if (err)
					handler( err );
				else
					conn.query(sql, p, function(qErr, result) {
						conn.release();
						handler( qErr, result );
					});
			});
	}
	else
		handler( new Error('Fail to compose the sql statement.') );
};
