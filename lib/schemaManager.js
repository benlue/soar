/*!
* soar
* authors: Ben Lue
* license: MIT License
* Copyright(c) 2015 Gocharm Inc.
*/
var  mysql = require('./sqlGenMySql.js');

exports.describeTable = function(conn, tableName, cb)  {
    var  schema = {title: tableName},
         sql = 'SHOW COLUMNS FROM ' + tableName;

    conn.query(sql, function(err, rows) {
        if (err)
            cb( err );
        else  {
            schema.columns = readColumns(rows);

            sql = 'SHOW INDEX FROM ' + tableName + " WHERE Key_name='PRIMARY'";
            conn.query(sql, function(err, rows) {
                if (err)
                    cb( err );
                else  {
                    schema.primary = readPrimaryKeys(rows);

                    sql = "SHOW TABLE STATUS WHERE name='" + tableName + "';";
                    conn.query(sql, function(err, rows) {
                        conn.release();

                        if (err)
                            cb( err );
                        else  {
                            schema.options = readTableStatus(rows[0]);
                            cb( null, schema );
                        }
                    });
                }
            });
        }
    });
};


/* sample schema:
{
    title: 'Person',
    columns: {
        Person_id: {type: 'integer', format: 'int64'},
        fname: {
            type: 'string',
            maxLength: 32,
            options: {
                notNull:
                default:
                autoInc:
                comment
            }
        }
    },
    primary:  ['Person_id'],
    options: {
        engine: 'InnoDB'
    }
}
*/
exports.createTable = function(conn, schema, cb)  {
    var  tableCol = schema.columns,
         tableDef = {title: schema.title, columns: [],
                     primary: schema.primary, options: schema.options};

    for (var key in tableCol)  {
        var  prop = tableCol[key],
             c = {title: key, type: toSQLType(prop)};

        c.options = prop.options || {};


        if (!c.options.engine)
            c.options.engine = 'InnoDB';

        tableDef.columns.push(c);
    }

    // sanity check...
    if (!tableDef.title)
        throw  new Error('Missing table name');
    if (Object.keys(tableDef.columns).length === 0)
        throw  new Error('No table columns');
    if (!tableDef.primary || tableDef.primary.length === 0)
        throw  new Error('Primary key not specified.');

    try  {
        var  sql = mysql.createTable(tableDef);
        //console.log( sql );

        conn.query(sql, function(qErr, result) {
            cb( qErr, result );
        });
    }
    catch (e)  {
        console.log( e.stack );
        cb(e);
    }
};


/* sample:
{
    title: 'Person',
    add: {
        column: {
            age: {type:'integer', format: 'int8'},
        },
        index: {
            IDX_BK_ISBN: {
                columns: ['ISBN', 'title'],
                unique: true
            }
        },
        foreignKey: {
            FK_bpdRbk: {
                key: 'bkID',
                reference: 'Books.bkID',
                integrity: {
                    delete: 'cascade'
                    update: 'cascade'
                }
            }
        }
    },
    drop: {
        column: ['addr'],
        index: ['index_name'],
        foreignKey: ['FK_bpdRbk']
    }
}
 */
exports.alterTable = function(conn, schema, cb)  {
    var  updSchema = {},
         props = Object.getOwnPropertyNames(schema);
    for (var i in props)  {
        var  key = props[i];
        updSchema[key] = schema[key];
    }

    if (updSchema.add)  {
        var addCols = updSchema.add.column,
            columns = [];
        for (var key in addCols)  {
            var  prop = addCols[key],
                 c = {title: key, type: toSQLType(prop)};
            if (prop.options)
                c.options = prop.options;

            columns.push( c );
        }
        updSchema.add.columns = columns;
    }
    
    try  {
        var  sql = mysql.alterTable(updSchema);
        //console.log( sql );
        conn.query(sql, function(qErr, result) {
            cb( qErr, result );
        });
    }
    catch (e)  {
        console.log( e.stack );
        cb(e);
    }
};


exports.deleteTable = function(conn, tbName, cb)  {
    var  sql = 'DROP TABLE ' + tbName;
    try  {
        conn.query(sql, function(err) {
            cb(err);
        });
    }
    catch (e)  {
        cb(e);
    }
};


/*
columns: {
        Person_id: {type: 'integer', format: 'int64'},
        fname: {
            type: 'string',
            maxLength: 32,
            options: {
                notNull:
                default:
                autoInc:
                comment
            }
        }
    }
*/
function  readColumns(columns)  {
    var  tableCol = {};

    for (var i in columns)  {
        var  c = columns[i],
             prop = toSchemaType(c.Type);

        if (c.Null)
            prop.options.notNull = c.Null === 'NO';
        if (c.Default)
            prop.options.default = c.Default;
        if (c.Extra === 'auto_increment')
            prop.options.autoInc = c.Extra;

        if (Object.keys(prop.options).length === 0)
            delete  prop.options;

        tableCol[c.Field] = prop;
    }

    return  tableCol;
};


function  readPrimaryKeys(rows)  {
    var  pk = [];
    for (var i in rows)
        pk.push( rows[i].Column_name );

    return  pk;
};


function  readTableStatus(status)  {
    var  options = {engine: status.Engine};
    return  options;
};


function  toSQLType(prop)  {
    var  dtype;
    switch (prop.type)  {
        case 'boolean':
            dtype = 'bool';
            break;

        case 'integer':
            switch (prop.format)  {
                case 'int8':
                    dtype = 'tinyint';
                    break;
                case 'int16':
                    dtype = 'smallint';
                    break;
                case 'int64':
                    dtype = 'bigint';
                    break;
                default:
                    dtype = 'int';
            }
            break;

        case 'number':
            if (prop.format)  {
                if (prop.format.indexOf('decimal') === 0)
                    dtype = 'decimal(' + prop.format.substring(7) + ')';
                else
                    dtype = prop.format === 'double' ? 'double' : 'float';
            }
            else
                dtype = 'float';
            break;

        case 'string':
            if (prop.format === 'text')
                dtype = 'text';
            else  {
                var  maxLen = prop.maxLength || 8;
                dtype = 'varchar(' + maxLen + ')';
            }
            break;

        case 'serial':
            dtype = 'bigint unsigned not null auto_increment unique';
            break;

        default:
            dtype = prop.type;
    }

    return  dtype;
};


function  toSchemaType(dtype)  {
    var  prop = {options: {}},
         isSolved = true;

    switch (dtype)  {
        case 'tinyint(1)':
            prop.type = 'boolean';
            break;

        case 'tinyint':
            prop.type = 'integer';
            prop.format = 'int8';
            break;

        case 'smallint':
            prop.type = 'integer';
            prop.format = 'int16';
            break;

        case 'int':
            prop.type = 'integer';
            break;

        case 'bigint':
            prop.type = 'integer';
            prop.format = 'int64';
            break;

        case 'float':
            prop.type = 'number';
            prop.format = 'float';
            break;

        case 'double':
            prop.type = 'number';
            prop.format = 'double';
            break;

        default:
            isSolved = false;
    }

    if (!isSolved)  {
        if (dtype.indexOf('decimal') === 0)  {
            prop.type = 'number';

            var  idx0 = dtype.indexOf('('),
                 idx1 = dtype.indexOf(')');
            if (idx0 > 0)
                prop.format = dtype.substring(idx0+1, idx1);
        }
        else  if (dtype.indexOf('varchar(') === 0)  {
            var  idx0 = dtype.indexOf('('),
                 idx1 = dtype.indexOf(')');
            prop.type = 'string';
            prop.maxLength = parseInt(dtype.substring(idx0 + 1, idx1));
        }
        else  if (dtype.indexOf('bigint') === 0)  {
            var  idx0 = dtype.indexOf('('),
                 idx1 = dtype.indexOf(')');
            prop.type = 'integer';
            prop.format = 'int64';
            prop.maxLength = parseInt(dtype.substring(idx0 + 1, idx1));

            if (dtype.indexOf('unsigned', idx1) > 0)
                prop.options.unsigned = true;
        }
        else  if (dtype.indexOf('int') === 0)  {
            var  idx0 = dtype.indexOf('('),
                 idx1 = dtype.indexOf(')');
            prop.type = 'integer';
            prop.maxLength = parseInt(dtype.substring(idx0 + 1, idx1));

            if (dtype.indexOf('unsigned', idx1) > 0)
                prop.options.unsigned = true;
        }
        else  if (dtype.indexOf('smallint') === 0)  {
            var  idx0 = dtype.indexOf('('),
                 idx1 = dtype.indexOf(')');
            prop.type = 'integer';
            prop.format = 'int16';
            prop.maxLength = parseInt(dtype.substring(idx0 + 1, idx1));

            if (dtype.indexOf('unsigned', idx1) > 0)
                prop.options.unsigned = true;
        }
        else  if (dtype.indexOf('tinyint') === 0)  {
            var  idx0 = dtype.indexOf('('),
                 idx1 = dtype.indexOf(')');
            prop.type = 'integer';
            prop.format = 'int8';
            prop.maxLength = parseInt(dtype.substring(idx0 + 1, idx1));

            if (dtype.indexOf('unsigned', idx1) > 0)
                prop.options.unsigned = true;
        }
        else
            prop.type = dtype;
    }

    return  prop;
};