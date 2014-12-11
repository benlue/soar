var  dbConn = require('./dbConn.js'),
	 fs = require('fs'),
	 path = require('path'),
	 xml2js = require('xml2js'),
	 mysql = require('./sqlGenMySql.js');

var  basePath,
	 defCache = {},
	 DEF_PAGE_SIZE = 20,
	 dbe_debug = false,
	 useDB;

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
	options = options || {};
	var  defPath = '../def/',
		 dbConfig = options.dbConfig;

	// first, set up db connection
	if (!dbConfig)  {
		try  {
			var  dftOption = JSON.parse( fs.readFileSync(path.join(__dirname, '../config.json')) );
			dbConfig = dftOption.dbConfig;

			if (dftOption.defPath)
				defPath = dftOption.defPath;
		}
		catch (e)  {}
	}
	useDB = new dbConn(dbConfig);

	// then set up the entity definition directory
	basePath = options.defPath || path.join(__dirname, defPath);

	// clean up definition file cache
	defCache = {};
};

exports.getConnection = function(handler)  {
	useDB.getConnection(handler);
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


function readDVML(vfile, q, range, handler, op, conn, fldArray)  {
	//var  fpath = basePath + vfile;
	var  fpath;
	if (path.sep === '/')
		fpath = vfile.charAt(0) === '/'  ?  vfile : path.join(basePath, vfile);
	else
		fpath = vfile.indexOf(':') > 0  ?  vfile : path.join(basePath, vfile);

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
							querying( eDef, q, handler, conn, fldArray );
						else  if (op === 'l')
							listing( eDef, q, range, handler, conn, fldArray );
						else  if (op == 'u')
							updating( eDef, q, range, handler, conn );
						else  if (op == 'i')
							inserting( eDef, q, handler, conn );
						else  if (op == 'd')
							deleting( eDef, q, handler, conn );
					}
					else  handler( err );
				}
			});
		}
	});
};


/**
 * There are two possible signatures. One with four parameters: view file, query parameters, callback handler
 * and a possible DB connection. The other one requires two parameters: a callback handler and an options parameter
 * containing view file, query parameters and a possible DB connection.
 */
exports.query = function query(vfile, q, handler, conn)  {
	var  fldArray;

	// handling input parameters...
	if (typeof vfile === 'string')  {
		if (!handler)  {
			handler = q;
			q = {};
		}
	}
	else  {
		var  options = vfile;
		handler = q;
		vfile = options.vfile;
		q = options.params;
		fldArray = options.fields;
		conn = options.conn;
	}

	if (dbe_debug)
		console.log('Query [%s]...', vfile);

	var  eDef = defCache[vfile];
	if (eDef === undefined)
		readDVML( vfile, q, null, handler, 'q', conn, fldArray );
	else
		querying( eDef, q, handler, conn, fldArray );
};


exports.list = function list(vfile, q, range, handler, conn)  {
	var  fldArray;

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
	}
	else  {
		var  options = vfile;
		handler = q;
		vfile = options.vfile;
		q = options.params || {};
		range = options.range;
		fldArray = options.fields;
		conn = options.conn;
	}

	if (dbe_debug)
		console.log('List [%s]...', vfile);

	var  eDef = defCache[vfile];
	if (eDef === undefined)
		readDVML( vfile, q, range, handler, 'l', conn, fldArray );
	else
		listing( eDef, q, range, handler, conn, fldArray );
};


exports.insert = function insert(entName, data, handler, conn)  {
	if (typeof entName !== 'string')  {
		var  options = entName;
		handler = data;
		entName = options.entity;
		data = options.data;
		conn = options.conn;
	}

	var  vfile = entName + '/general.dvml',
		 eDef = defCache[vfile];

	if (dbe_debug)
		console.log('Insert [%s]...', vfile);

	if (eDef === undefined)
		readDVML( vfile, data, null, handler, 'i', conn );
	else
		inserting( eDef, data, handler, conn );
};


exports.update = function update(entName, data, terms, handler, conn)  {
	if (typeof entName !== 'string')  {
		var  options = entName;
		handler = data;
		entName = options.entity;
		data = options.data;
		terms = options.terms;
		conn = options.conn;
	}

	var  vfile = entName + '/general.dvml',
		 eDef = defCache[vfile];

	if (dbe_debug)
		console.log('Update [%s]...', vfile);

	if (eDef === undefined)
		readDVML( vfile, data, terms, handler, 'u', conn );
	else
		updating( eDef, data, terms, handler, conn );
};


exports.del = function del(entName, terms, handler, conn)  {
	if (typeof entName !== 'string')  {
		var  options = entName;
		handler = terms;
		entName = options.entity;
		terms = options.terms;
		conn = options.conn;
	}

	var  vfile = entName + '/general.dvml',
		 eDef = defCache[vfile];

	if (dbe_debug)
		console.log('Delete [%s]...', vfile);

	if (eDef === undefined)
		readDVML( vfile, terms, null, handler, 'd', conn );
	else
		deleting( eDef, terms, handler, conn );
};


function  querying(eDef, q, handler, conn, fldArray)  {
	// 1. compose sql from eDef
	var  p = [],
		 sql = mysql.composeQuery( eDef, q, p, fldArray );

	// 2. query db
	if (sql.length > 0)  {
		if (conn)
			conn.query(sql, p, function(qErr, rows) {
				if (qErr == null)
					handler( null, rows[0] );
				else
					conn.rollback(function() {
						handler( qErr );
					});
			});
		else
			useDB.getConnection( function(err, conn) {
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


function  listing(eDef, q, range, handler, conn, fldArray)  {
	// 1. compose sql from eDef
	var  p = [],
		 sql = mysql.composeList( eDef, q, p, range, fldArray );

	// 2. query db
	if (sql.length > 0)  {
		if (conn)
			conn.query(sql, p, function(qErr, rows) {
				if (qErr == null)  {
					if (range === undefined)
						handler( null, rows );
					else  {
						var  ctSql = mysql.composeListCount( eDef, q, p );
						conn.query( ctSql, p, function(qErr2, rows2) {
							handler( null, rows, rows2[0].ct );
						});
					}
				}
				else
					conn.rollback(function() {
						handler( qErr );
					});
			});
		else
			useDB.getConnection( function(err, conn) {
				if (err === null)
					conn.query(sql, p, function(qErr, rows) {
						if (qErr == null)  {
							if (range === undefined)  {
								conn.release();
								handler( null, rows );
							}
							else  {
								var  ctSql = mysql.composeListCount( eDef, q, p );
								conn.query( ctSql, p, function(qErr2, rows2) {
									conn.release();
									handler( null, rows, rows2[0].ct );
								});
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


function  inserting(eDef, data, handler, conn)  {
	// 1. compose sql from eDef
	var  p = [],
		 sql = mysql.composeInsert( eDef, data, p );

	// 2. query db
	if (sql.length > 0)  {
		if (conn)
			conn.query(sql, p, function(qErr, result) {
				if (handler)  {
					if (qErr == null)
						// result.insertId
						handler( null, result.insertId );
					else
						conn.rollback(function() {
							handler( qErr );
						});
				}
			});
		else
			useDB.getConnection( function(err, conn) {
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


function  updating(eDef, data, terms, handler, conn)  {
	// 1. compose sql from eDef
	var  p = [],
		 sql = mysql.composeUpdate( eDef, data, terms, p );

	// 2. query db
	if (sql.length > 0)  {
		if (conn)
			conn.query(sql, p, function(qErr, result) {
				if (qErr == null)
					handler( null, result );
				else
					conn.rollback(function() {
						handler( qErr );
					});
			});
		else
			useDB.getConnection( function(err, conn) {
				if (err === null)
					conn.query(sql, p, function(qErr, result) {
						conn.release();

						if (qErr == null)
							handler( null, result );
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


function  deleting(eDef, terms, handler, conn)  {
	// 1. compose sql from eDef
	var  p = [],
		 sql = mysql.composeDelete( eDef, terms, p );

	// 2. query db
	if (sql.length > 0)  {
		if (conn)
			conn.query(sql, p, function(qErr, result) {
				if (qErr == null)
					handler( null, result );
				else
					conn.rollback(function() {
						handler( qErr );
					});
			});
		else
			useDB.getConnection( function(err, conn) {
				if (err === null)
					conn.query(sql, p, function(qErr, result) {
						conn.release();

						if (qErr == null)
							handler( null, result );
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
