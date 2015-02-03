/*!
* soar
* authors: Ben Lue
* license: MIT License
* Copyright(c) 2015 Gocharm Inc.
*/
var  util = require('util');

var  _debug = false,
	 _NL = ' ';

/* turn on/off debug */
exports.setDebug = function setDebug(b)  {
	_NL = (_debug = b)  ?  '\n' : ' ';
};

exports.toSQL = function(options, p)  {
	var  sql,
		 op = options.op,
		 expr = options.expr,
		 range = options.range,
		 fld = options.fields;

	switch (op)  {
		case 'query':
			sql = genQuery(expr, options.query, p, fld);
			break;

		case 'list':
			sql = genList(expr, options.query, p, fld);
			break;

		case 'insert':
			sql = genInsert(expr, options.data, p);
			break;

		case 'update':
			sql = genUpdate(expr, options.data, options.query, p);
			break;

		case 'delete':
			sql = genDelete(expr, options.query, p);
			break;
	}
	return  sql;
};


function  genQuery(expr, q, p, fld)  {
	var  sql = composeQ(expr, q, p, fld);
	if (sql.length > 0)
		sql += _NL + 'LIMIT 1;';
	else
		sql += ';';

	return  sql;
};


function genList(expr, q, p, range, fields)  {
	var  sql = composeQ( expr, q, p, fields );
	if (sql) {
		if (range)
			sql += _NL + 'LIMIT ' + range.getIndex() + ', ' + range.getPageSize() + ';';
		else
			sql += ';';
	}

	return  sql;
};


function genInsert(expr, data, p)  {
	if (!data)
		throw  new Error('Missing insert data');

	var  table = expr.table,
		 fields = expr.columns;

	var  sql = 'INSERT INTO ' + rectifyTable(table) + ' (',
		 notFirst = false;
	fields.forEach( function(f) {
		if (data.hasOwnProperty(f))  {
			if (notFirst)
				sql += ', ';
			sql += f;
			notFirst = true;

			p.push( data[f] );
		}
	});

	sql += ') VALUES (?';
	for (var i = 1, len = p.length; i < len; i++)
		sql += ', ?';
	sql += ');';

	if (_debug)  {
		console.log('SQL-----');
		console.log(sql);
		console.log('Arguments------');
		console.log(p);
	}

	return  sql;
};


function genUpdate(expr, data, terms, p)  {
	if (!data)
		throw  new Error('Missing update data');

	var  table = expr.table,
		 fields = expr.columns;

	var  sql = 'UPDATE ' + rectifyTable(table) + _NL + 'SET ',
		 notFirst = false;
	fields.forEach( function(f) {
		if (data.hasOwnProperty(f))  {
			if (notFirst)
				sql += ', ';
			sql += f + '=?';
			notFirst = true;

			p.push( data[f] );
		}
	});

	// where...
	var  filter = expr.filters;
	if (filter)  {
		var  s = matchFilter(filter, terms, p);
		if (s.length > 0)
			sql += _NL + 'WHERE ' + s;
	}
	sql += ';';

	if (_debug)  {
		console.log('SQL-----');
		console.log(sql);
		console.log('Arguments------');
		console.log(p);
	}

	return  sql;
};


function genDelete(expr, terms, p)  {
	var  table = expr.table,
		 sql = 'DELETE FROM ' + rectifyTable(table);

	// where...
	var  filter = expr.filters;
	if (filter !== null)  {
		var  s = matchFilter(filter, terms, p);
		if (s.length > 0)
			sql += _NL + 'WHERE ' + s;
	}
	sql += ';';

	if (_debug)  {
		console.log('SQL-----');
		console.log(sql);
		console.log('Arguments------');
		console.log(p);
	}

	return  sql;
};


function composeQ(expr, q, p, fld)  {
	var  table = expr.table,
		 fields = expr.columns;

	var  sql = 'SELECT ',
		 notFirst = false;

	if (fld)
		// pick up only selected fields
		fields.forEach( function(f)  {
			if (fld.indexOf(f) >= 0)  {
				if (notFirst)
					sql += ', ';
				else
					notFirst = true;

				sql += f;
			}
		});
	else
		fields.forEach( function(f) {
			if (notFirst)
				sql += ', ';
			else
				notFirst = true;

			sql += f;
		});

	// from ...
	sql += _NL + 'FROM ' + rectifyTable(table);
	if (table.join)  {
		table.join.forEach( function(jt) {
			sql += _NL;
			if (jt.type)
				sql += ' ' + jt.type + ' ';
			sql += 'JOIN ' + jt.table;

			if (jt.use)
				sql += ' USING(`' + jt.use + '`)';
			else
				sql += ' ON ' + jt.onWhat;
		});
	}

	// where...
	var  filter = expr.filters;
	if (filter)  {
		var  s = matchFilter(filter, q, p);
		if (s.length > 0)
			sql += _NL + 'WHERE ' + s;
	}

	// extra
	if (expr.extra)
		sql += _NL + expr.extra;

	if (_debug)  {
		console.log('SQL-----');
		console.log(sql);
		console.log('Arguments------');
		console.log(p);
	}

	return  sql;
};


function  matchFilter(filter, q, p)  {
	var  sql = '';

	if (filter.op === 'AND' || filter.op === 'and')  {
		var  count = 0;
		filter.filters.forEach(function(f)  {
			var  s = matchFilter(f, q, p);
			if (s)  {
				sql = sql ? (sql + ' AND ' + s) : s;
				++count;
			}
		});
		if (count > 1)
			sql = '(' + sql + ')';
	}
	else  if (filter.op === 'OR' || filter.op === 'or')  {
		var  count = 0;
		filter.filters.forEach(function(f)  {
			var  s = matchFilter(f, q, p);
			if (s)  {
				sql = sql ? (sql + ' OR ' + s) : s;
				++count;
			}
		});
		if (count > 1)
			sql = '(' + sql + ')';
	}
	else  {
		var  fname = filter.name;
			 idx = fname.indexOf('.');

		if (idx > 0)
			fname = fname.substring(idx+1);

		if (q.hasOwnProperty(fname))  {
			sql = filter.field || filter.name;
			if (filter.op)  {
				sql += ' ' + filter.op;

				if (!filter.noArg)  {
					p.push( q[fname] );
					sql += ' ?'
				}
			}
			else  {
				p.push( q[fname] );
				sql += '=?';
			}
		}
	}

	return  sql;
};

function  rectifyTable(table)  {
	var  name = table.name,
		 idx = name.indexOf('.');
	return  idx > 0  ?  name.substring(idx+1) : name;
}