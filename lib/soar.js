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
	 mysql = require('./sqlGenMySql.js'),
	 sqlGen2 = require('./sqlGenMySql2.js'),
	 schMgr = require('./schemaManager.js'),
	 sqlComp = require('./sqlComp.js');

var  basePath = {},
	 defCache = {},
	 schemaCache = {},	// cache the table schemas
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

/*
* This function has been deprecated.
* Please use sqlTemplate() instead.
*/
exports.sqlBuildInfo = function(tableName)  {
	return  new sqlComp(tableName);
};

exports.sqlTemplate = function(tableName)  {
	return  new sqlComp(tableName);
};

exports.getSchemaManager = function() {
	return  schMgr;
};

exports.config = function(options)  {
	if (!options || typeof options === 'string')  {
		var  configFile = options || path.join(__dirname, '../config.json');
		options = JSON.parse( fs.readFileSync(configFile) );
	}

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

exports.getConnection = function(dbName, handler)  {
	if (!handler)  {
		handler = dbName;
		dbName = dftDB;
	}
	//dbName = dbName || dftDB;
	useDB[dbName].getConnection(handler);
};


/**
 * Create a new table.
 */
exports.createTable = function(conn, schema, cb)  {
	if (arguments.length === 2)  {
		cb = schema,
		schema = conn;
		conn = null;
	}

	if (conn)
		exports.getSchemaManager().createTable(conn, schema, cb);
	else  {
		exports.getConnection(function(err, conn)  {
			if (err)
				cb(err);
			else
				exports.getSchemaManager().createTable(conn, schema, cb);
		});
	}
};


exports.alterTable = function(conn, schema, cb)  {
	if (arguments.length === 2)  {
		cb = schema,
		schema = conn;
		conn = null;
	}

	if (conn)
		exports.getSchemaManager().alterTable(conn, schema, cb);
	else  {
		exports.getConnection(function(err, conn)  {
			if (err)
				cb(err);
			else
				exports.getSchemaManager().alterTable(conn, schema, cb);
		});
	}
};


exports.deleteTable = function(conn, tbName, cb)  {
	if (arguments.length === 2)  {
		cb = tbName,
		tbName = conn;
		conn = null;
	}

	if (conn)
		exports.getSchemaManager().deleteTable(conn, tbName, cb);
	else  {
		exports.getConnection(function(err, conn)  {
			if (err)
				cb(err);
			else
				exports.getSchemaManager().deleteTable(conn, tbName, cb);
		});
	}
};


exports.describeTable = function(conn, tbName, cb)  {
	if (arguments.length === 2)  {
		cb = tbName,
		tbName = conn;
		conn = null;
	}

	if (conn)
		exports.getSchemaManager().describeTable(conn, tbName, cb);
	else  {
		exports.getConnection(function(err, conn)  {
			if (err)
				cb(err);
			else
				exports.getSchemaManager().describeTable(conn, tbName, cb);
		});
	}
};


/**
 * Execute a SQL statement which is defined in the 'expr' JSON object
 */
exports.execute = function(options, data, query, handler)  {
	switch (arguments.length)  {
		case  2:
			handler = data;
			data =options.data;
			query = options.query;
			break;

		case  3:
			handler = query;
			query = data;
			data = null;
			break;
	}

	if (!options.expr || !options.op)
		handler( new Error('options is missing the command expression or operator.') );

	var  tableName = options.expr.table.name;
		 idx = tableName.indexOf('.'),
		 dbName = idx > 0  ?  tableName.substring(0, idx) : dftDB,
		 tableLoc = {dbName: dbName, tbName: idx > 0  ?  tableName.substring(idx+1) : tableName};

	// check & auto-gen the missing parts of a SQL expression
	if (!options.expr.columns || !options.expr.filters)  {
		// we shall find out the columns of a table
		getTableSchema(dbName, tableLoc.tbName, function(err, schema) {
			var  stemp = exports.sqlTemplate(tableLoc.tbName),
				 columns = Object.keys(schema.columns),
				 op = options.op;

			if (data || op === 'query' || op === 'list')
				stemp.column( options.expr.columns  ?  options.expr.columns : columns );

			if (query)  {
				if (options.expr.filters)
					stemp.filter( options.expr.filters );
				else  {
					var  filters = [];
					for (var key in query)  {
						if (columns.indexOf(key) >= 0)
							filters.push( {name: key, op: '='} );
					}

					if (filters.length > 0)  {
						var  filter = filters.length == 1  ?  filters[0] : stemp.chainFilters('AND', filters);
						stemp.filter( filter );
					}	
				}
			}

			stemp.extra( options.expr.extra );

			var  cmd = {op: op, expr: stemp.value(), range: options.range, conn: options.conn};
			runTemplate(tableLoc, cmd, data, query, handler);
		});
	}
	else
		runTemplate(tableLoc, options, data, query, handler);
};


function  configDB(options)  {
	var  dbConfig = options.dbConfig;
	if (!dbConfig)
		throw  new Error('Cannot find database configuration');

	// first, set up db connection
	var  dbName = dbConfig.database;
	useDB[dbName] = new dbConn(dbConfig);

	// then set up the entity definition directory
	basePath[dbName] = options.defPath || path.join(__dirname, '../def/');

	return  dbName;
};


function  runTemplate(tableLoc, options, data, query, handler)  {
	var  p = [],
		 sql = getJsonSqlGenerator().toSQL(options, data, query, p);

	if (sql)  {
		var  tableName = options.expr.table.name;

		if (options.conn)
			options.conn.query(sql, p, function(err, value) {
				if (err)
					options.conn.rollback(function() {
						handler( err );
					});
				else  {
					if (options.op === 'insert')
						returnInsert(tableLoc, data, value, handler);
					else  {
						if (options.op === 'query')
							value = value[0];
						handler(null, value);
					}
				}
			});
		else  {
			useDB[tableLoc.dbName].getConnection( function(err, conn) {
				if (err)
					handler( err );
				else
					conn.query(sql, p, function(err, value) {
						conn.release();

						if (err)
							handler( err );
						else  {
							if (options.op === 'insert')
								returnInsert(tableLoc, data, value, handler);
							else  {
								if (options.op === 'query')
									value = value[0];
								handler(null, value);
							}
						}
					});
			});
		}
	}
	else
		handler( new Error('Fail to compose the sql statement.') );
};


function  returnInsert(tableLoc, data, value, cb)  {
	getTableSchema(tableLoc.dbName, tableLoc.tbName, function(err, schema) {
		if (err)
			cb(err);
		else  {
			var  pkArray = schema.primary,
				 rtnObj = {};

			for (var i in pkArray)  {
				var  key = pkArray[i];
				rtnObj[key] = data.hasOwnProperty(key)  ?  data[key] : value.insertId;
			}

			cb(null, rtnObj);
		}
	});
};


function  getTableSchema(dbName, tbName, cb)  {
	var  tbSchema = schemaCache[dbName];
	if (!tbSchema)  {
		tbSchema = {};
		schemaCache[dbName] = tbSchema;
	}

	var  schema = tbSchema[tbName];
	if (schema)
		cb( null, schema );
	else
		exports.getConnection(dbName, function(err, conn) {
			if (err)
				cb(err);
			else
				schMgr.describeTable(conn, tbName, function(err, schema) {
					if (err)
						cb(err);
					else  {
						tbSchema[tbName] = schema;
						cb(null, schema);
					}
				});
		});
};


function  getJsonSqlGenerator()  {
	return  sqlGen2;
}


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
	getJsonSqlGenerator().setDebug( b );
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
