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


exports.createTable = function(schema)  {
	var  sql = util.format('CREATE TABLE %s\n(\n', schema.title);
	for (var i in schema.columns)  {
		var  c = schema.columns[i],
			 s = util.format('  %s\t\t%s', c.title, c.type);

		if (c.options)  {
			var  opt = c.options;
			if (opt.notNull)
				s += ' NOT NULL';
			if (opt.hasOwnProperty('default'))
				s += ' DEFAULT ' + opt.default;
			if (opt.autoInc)
				s += ' AUTO_INCREMENT';
			if (opt.comment)
				s += " COMMENT '" + opt.comment + "'";
		}
		sql += s + ',\n'
	}

	sql += '  primary key (';
	var  pk = '';
	for (var i in schema.primary)  {
		if (i > 0)
			pk += ', ';
		pk += schema.primary[i];
	}
	sql += pk + ')\n)';

	// adding table options
	var  opts = '';
	if (schema.options)  {
		var  opt = schema.options;
		for (var k in opt)  {
			if (opts)
				opts += ' ';
			if (k === 'comment')
				opts += "COMMENT = '" + opt.comment + "'";
			else
				opts += k + ' = ' + opt[k];
		}
	}

	if (opt)
		sql += '\n' + opts + ';';
	else
		sql += ';';

	if (_debug)  {
		console.log('SQL[Create table]-----');
		console.log(sql);
	}
	return  sql;
};


exports.alterTable = function(schema)  {
	var  sql = util.format('ALTER TABLE %s\n', schema.title),
		 alterSpec;

	if (schema.add)  {
		if (schema.add.column)  {
			var  columns = schema.add.column;
			for (var i in columns)  {
				var  c = columns[i],
					 s = util.format('ADD COLUMN %s\t%s', c.title, c.type);

				if (c.options)  {
					var  opt = c.options;
					if (opt.notNull)
						s += ' NOT NULL';
					if (opt.hasOwnProperty('default'))
						s += ' DEFAULT ' + opt.default;
					if (opt.autoInc)
						s += ' AUTO_INCREMENT';
					if (opt.comment)
						s += " COMMENT '" + opt.comment + "'";
				}
				if (alterSpec)
					alterSpec += ',\n' + s;
				else
					alterSpec = s;
			}
		}

		if (schema.add.index)  {
			var  indexes = schema.add.index;
			for (var key in indexes)  {
				var  idx = indexes[key],
					 isUnique = idx.unique  ?  ' UNIQUE' : '';

				var  idxSQL = '';
				for (var i in idx.columns)  {
					if (idxSQL)
						idxSQL += ', ' + idx.columns[i];
					else
						idxSQL = idx.columns[i];
				}

				var  s = util.format('ADD%s INDEX %s (%s)', isUnique, key, idxSQL);
				if (alterSpec)
					alterSpec += ',\n' + s;
				else
					alterSpec = s;
			}
		}

		if (schema.add.foreignKey)  {
			var  fkeys = schema.add.foreignKey;
			for (var key in fkeys)  {
				var  fk = fkeys[key],
					 delInt = 'restrict',
					 updInt = 'restrict',
					 reference = fk.reference;

				if (fk.integrity)  {
					delInt = fk.integrity.delete || delInt;
					updInt = fk.integrity.update || updInt;
				}

				var  idx = reference.indexOf('.'),
					 refTable = reference.substring(0, idx),
					 refCol = reference.substring(idx+1),
					 s = util.format('ADD CONSTRAINT %s FOREIGN KEY (%s) references %s (%s) ON DELETE %s ON UPDATE %s', key, fk.key, refTable, refCol, delInt, updInt);
				if (alterSpec)
					alterSpec += ',\n' + s;
				else
					alterSpec = s;
			}
		}
	}

	if (schema.drop)  {
		if (schema.drop.column)  {
			var  columns = schema.drop.column;
			for (var i in columns)  {
				var  s = 'DROP COLUMN ' + columns[i];
				if (alterSpec)
					alterSpec += ',\n' + s;
				else
					alterSpec = s;
			}
		}

		if (schema.drop.index)  {
			var  indexes = schema.drop.index;
			for (var i in indexes)  {
				var  s = 'DROP INDEX ' + indexes[i];
				if (alterSpec)
					alterSpec += ',\n' + s;
				else
					alterSpec = s;
			}
		}

		if (schema.drop.foreignKey)  {
			var  keys = schema.drop.foreignKey;
			for (var i in keys)  {
				var  s = 'DROP FOREIGN KEY ' + keys[i];
				if (alterSpec)
					alterSpec += ',\n' + s;
				else
					alterSpec = s;
			}
		}
	}

	sql += alterSpec + ';';

	if (_debug)  {
		console.log('SQL[Alter table]-----');
		console.log(sql);
	}
	return  sql;
};


exports.composeQuery = function composeQuery(eDef, q, p, fields)  {
	var  sql = composeQ( eDef, q, p, fields );
	if (sql.length > 0)
		sql += _NL + 'LIMIT 1;';
	else
		sql += ';';

	return  sql;
};


exports.composeList = function composeList(eDef, q, p, range, fields)  {
	var  sql = composeQ( eDef, q, p, fields );
	if (sql.length > 0 && range)
		sql += _NL + 'LIMIT ' + range.getIndex() + ', ' + range.getPageSize() + ';';
	else
		sql += ';';

	return  sql;
};


exports.composeInsert = function composeInsert(eDef, data, p)  {
	var  table = eDef.getTable(),
		 fields = eDef.getFields();

	var  sql = 'INSERT INTO ' + table.name + '(',
		 notFirst = false;
	fields.forEach( function(f) {
		if (data.hasOwnProperty(f.name))  {
			if (notFirst)
				sql += ', ';
			sql += f.name;
			notFirst = true;

			p.push( data[f.name] );
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


exports.composeUpdate = function composeUpdate(eDef, data, terms, p)  {
	var  table = eDef.getTable(),
		 fields = eDef.getFields();

	var  sql = 'UPDATE ' + table.name + _NL + 'SET ',
		 notFirst = false;
	fields.forEach( function(f) {
		if (data.hasOwnProperty(f.name))  {
			if (notFirst)
				sql += ', ';
			sql += f.name + '=?';
			notFirst = true;

			p.push( data[f.name] );
		}
	});

	// where...
	var  filter = eDef.getFilters();
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


exports.composeDelete = function composeDelete(eDef, terms, p)  {
	var  table = eDef.getTable();

	var  sql = 'DELETE FROM ' + table.name;

	// where...
	var  filter = eDef.getFilters();
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


function composeQ(eDef, q, p, fld)  {
	var  table = eDef.getTable(),
		 fields = eDef.getFields();

	var  sql = 'SELECT ',
		 notFirst = false;

	if (fld)
		// pick up only selected fields
		fields.forEach( function(f)  {
			if (fld.indexOf(f.name) >= 0)  {
				if (notFirst)
					sql += ', ';
				else
					notFirst = true;

				sql += f.name;
				if (f.hasOwnProperty('tag'))
					sql += ' AS ' + f.tag;
			}
		});
	else
		fields.forEach( function(f) {
			if (notFirst)
				sql += ', ';
			else
				notFirst = true;

			sql += f.name;
			if (f.hasOwnProperty('tag'))
				sql += ' AS ' + f.tag;
		});

	// from ...
	sql += _NL + 'FROM ' + table.name;
	if (table.hasOwnProperty('join'))  {
		table['join'].forEach( function(jt) {
			sql += _NL;
			if (jt.hasOwnProperty('type'))
				sql += ' ' + jt.type;
			sql += ' JOIN ' + jt.table;

			if (jt.hasOwnProperty('use'))
				sql += ' USING(`' + jt.use + '`)';
			else
				sql += ' ON ' + fillVar(jt.onWhat, q);
		});
	}

	// where...
	var  filter = eDef.getFilters();
	if (filter !== null)  {
		var  s = matchFilter(filter, q, p);
		if (s.length > 0)
			sql += _NL + 'WHERE ' + s;
	}

	// extra
	var  extra = eDef.getExtra();
	if (extra != null)
		sql += _NL + fillVar(extra, q);

	if (_debug)  {
		console.log('SQL-----');
		console.log(sql);
		console.log('Arguments------');
		console.log(p);
	}

	return  sql;
};


exports.composeListCount = function composeCount(eDef, q, p)  {
	var  table = eDef.getTable(),
		 fields = eDef.getFields(),
		 sql;

	if (fields.length > 0 && fields[0].name.indexOf('distinct') === 0)
		sql = 'SELECT COUNT(' + fields[0].name + ') AS ct FROM ';
	else
		sql = 'SELECT COUNT(*) AS ct FROM ';

	// from ...
	sql += table.name;
	if (table.hasOwnProperty('join'))  {
		table['join'].forEach( function(jt) {
			sql += _NL;
			if (jt.hasOwnProperty('type'))
				sql += ' ' + jt.type;
			sql += ' JOIN ' + jt.table;

			if (jt.hasOwnProperty('use'))
				sql += ' USING(`' + jt.use + '`)';
			else
				sql += ' ON ' + fillVar(jt.onWhat, q);
		});
	}

	// where...
	var  filter = eDef.getFilters();
	if (filter !== null)  {
		var  s = matchFilter(filter, q, p);
		if (s.length > 0)
			sql += ' WHERE ' + s;
	}

	return  sql + ';';
};


function  matchFilter(filter, q, p)  {
	var  sql = '';

	if (filter.hasOwnProperty('list'))  {
		var  slist = new Array();
		filter.list.forEach( function(f) {
			var  s = matchFilter(f, q, p);
			if (s.length > 0)
				slist.push( s );
		});

		if (slist.length == 1)
			sql = slist[0];
		else  if (slist.length > 1)  {
			var  op = filter.op || 'AND';
			slist.forEach( function(s) {
				if (sql.length == 0)
					sql = '(' + s;
				else
					sql += ' ' + op + ' ' + s;
			});
			sql += ')';
		}
	}
	else  {
		var  fname = filter.name;
			 idx = fname.indexOf('.');

		if (idx > 0)
			fname = fname.substring(idx+1);

		if (q.hasOwnProperty(fname))  {
			//p.push( q[fname] );

			sql = filter.hasOwnProperty('field')  ?  filter.field : filter.name;
			if (filter.hasOwnProperty('op'))  {
				sql += ' ' + filter.op;

				if (!filter.hasOwnProperty('noArg'))  {
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


function  fillVar(onWhat, q)  {
	var  sec = onWhat.split('[');

	if (sec.length > 0)  {
		onWhat = sec[0];
		for (var i = 1, len = sec.length; i < len; i++)  {
			var  item = sec[i],
				 idx = item.indexOf(']'),
				 key = '@' + item.substring(0, idx),
				 check = item.substring(0, 1);

			if (check === '?') {
				key = '@' + item.substring(1, idx);
				if (!q.hasOwnProperty(key))
					q[key] = "";
			}

			onWhat += q[key] + item.substring(idx+1);
		}
	}

	return  onWhat;
};
