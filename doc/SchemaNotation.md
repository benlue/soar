The Schema Notation
===================

A SQL DDL (Data Definition Language) statement itself is not suitable for analyzing or manipulation. If you want to manage table schemas, you'll need a better tool than DDL to do that.

To solve the problem, SOAR uses a schema notion which is a JSON object to describe a table schema. A schema notation object has the following format:

    {
        title: 'name_of_the_table',
        columns: {
            colName1: {type: 'data_type', format: 'data_format'},
            colName2: {type: 'data_type', format: 'data_format'},
            ...
        },
        primary: ['primary_key1', 'primary_key2', ...],
        options: {
        	engine | auto_increment | comment : 'option_value'
        }
    }
    
Table columns are specified in a format similar to [JSON Schema](http://json-schema.org). Each property is the name of a table column and the property value is a JSON object with the following properties:

+ **type**: specifies the primitive JSON Schema types. These are possible values: boolean, integer, number, string. Because these primitive types are not enough when defining the data type of a table column, developers can specify any valid SQL types (such as date, datetime, etc) here and those data types will be accepted by SOAR.

+ **format**: provide additional information about the data type of a column. If the data type is 'integer', format can be 'int8', 'int16', or 'int64' that will be mapped to 'tinyint', 'smallint' and 'bigint' respectively. If the data tye is 'number', format can be 'double', 'float' or 'decimal(n,s)'. For 'string' data type, format can be 'text'.

+ **maxLength**: if data type is 'string', this property can be used to specify the maximum length of a string column. For example, {type: 'string', maxLength: 32} means a varchar(32) column.

+ **options**: options is itself a JSON object. It could have the following properties:

  + notNull: true if the column should not be null.
  + default: specifies the default value of the column.
  + autoInc: set to true if the column is auto_increment.
  
## Altering Table
If you want to alter a table schema using the schema manager's alterTable() function, you'll have to specify the intended changes using a similar notation (as table creation) shown below:

    {
        title: 'name_of_the_table',
        add {
        	column: {
        	    colName1: {type: 'data_type', format: 'data_format'},
                colName2: {type: 'data_type', format: 'data_format'},
                ...
        	},
        	index: {
        	    IDX_NAME1: {
        	        columns: ['colName1', 'colName2', ...],
        	        unique: true/false
        	    },
        	    IDX_NAME2: {
        	        ....
        	    },
        	    ....
        	},
        	foreignKey: {
        	    FK_fkName1: {
        	        key: 'coleName',
        	        reference: 'anotherTable.anotherCol',
        	        integrity: {
        	            delete: 'restrect | cascade | null',
        	            update: 'restrect | cascade | null'
        	        }
        	    }
        	}
        },
        drop: {
            column: ['colName1', 'colName2', ...],
            index: ['IDX_NAME1', 'IDX_NAME2', ...],
            foreighKey: ['FK_fkName1', 'FK_fkName2', ...]
        }
    }
    
The _add_ property can be used to add table columns, indexes or foreign key constraints. For each _column_, _index_ and _foreignKey_ property you can specify multiple entries. The _add.column_ property format is the same as the table schema notation described in the above section.

The _drop_ property can be used to specify what table columns, indexes or foreign keys to be removed from a table schema. The value of the 'drop.xxx' property is an array, so you can drop multiple column/index/foreignKey with one operation.