SOAR
====

## What Is SOAR
SOAR (Simple Object Adapter for Relational database) is a relational database access tool. It allows developers to access database with/as Javascript objects. Unlike most ORM solutions, SOAR gives back to developers the full control of how SQL statements are generated. SOAR offers some benefits of ORM and tries to avoid its overhead and problems. Also, if you need to access multiple databases in an application, SOAR would greatly simplify the task for you.

## Why SOAR
Most developers would agree it's not a good idea to compose SQL statements inside programs. It's tedious and error-prone. So there comes ORM which was intended to provide a cleaner programming model. Unfortunately, ORM could turn into a monster if the DB schema is full of references.

Maybe what developers need is just a light-weight solution to harness SQL. Consider a DB access tool with the following feaures:

+ Query a DB and return the value as a plain Javascript object or array of objects. If you want to insert or update a record, you can simply put data in a Javascript object and write it out to DB.

+ Unlike most ORM solutions, you have complete control of how SQL is generated and applied.

+ You can name a SQL statement or even formulate it into a file or a Javascript template. You can later invoke that SQL statement by just referring to its name (file name or template name).

+ A simple way to access multiple databases within an application.

+ Composing the SQL WHERE clause inside programs is very tedious and error-prone. Is there a tool to dynamically generate SQL query conditions based on query values?

So, here comes SOAR.

## What's New
Please refer to the [release notes](https://github.com/benlue/soar/blob/master/releaseNote.md) for details.

## Installation

    npm install soarjs

## Contents
Below are short cuts to major sections of this guide:

+ [DB settings](#dbSetup)
  + [config.json file](#config)
  + [configure programmatically](#configProg)
  + [Multiple database configuration](#multidb)
+ [Access database](#accessDB)
  + [Access via data view](#dataView)
  + [SQL template](#dynamicSQL)
  + [API](#dynamicAPI)
    + [soar.execute()](#soarExecute)
    + [soar.sqlTemplate()](#soarSBI)
    + [sqlTemplate.join()](#sbiJoin)
    + [sqlTemplate.column()](#sbiColumn)
    + [sqlTemplate.filter()](#sbiFilter)
    + [sqlTemplate.chainFilters()](#sbiChainFilter)
    + [sqlTemplate.extra()](#sbiExtra)
    + [sqlTemplate.value()](#sbiValue)
  + [Use cases](#dynamicCase)
    + [query](#dynamicQuery)
    + [list](#dynamicList)
    + [insert](#dynamicInsert)
    + [update](#dynamicUpdate)
    + [delete](#dynamicDelete)
    + [How to do transactions](#transaction)
+ [Schema management](#schema)
  + [createTable()](#createTable)
  + [alterTable()](#alterTable)
  + [deleteTable()](#deleteTable)
  + [describeTable()](#describeTable)
+ [Debugging messages](#debug)

<a name="dbSetup"></a>
## DB Settings
There are two ways to setup the database configuration in SOAR: using a config file or doing it programmatically.

<a name="config"></a>
### The config.json File
Right beneath the SOAR installation directory, there is a **config.json** file which would look like:

    {
    	"dbConfig": {
    		"host"     : "127.0.0.1",
    		"database" : "soar",
    		"user"     : "myDB_acc_name",
    		"password" : "xxxx",
    		"supportBigNumbers" : true,
    		"connectionLimit"   : 32
    	},
    	"defPath": "file_path_to_the_data_view_files"
    }

where **host** is the database host and **database** is the database name. **user** and **password** are the database user name and password respectively. SOAR ueses the _mysql_ node module as its mySQL driver and the connection pool feature is turned on by default.

**defPath** is the file directory where data view files of a database are saved. For details about what data view files are, please refer to [this article](https://github.com/benlue/soar/blob/master/doc/AccessWithDataView.md).

<a name="configProg"></a>
### Configure Programmatically
You can configure the database connection settings right inside your node program. Here is how:

    var  soar = require('soarjs');
    var  options = {
                dbConfig: {
                    "host"     : "127.0.0.1",
                    "database" : "soar",
                    "user"     : "myDB_acc_name",
                    "password" : "xxxx",
                    "supportBigNumbers" : true,
                    "connectionLimit"   : 32
                }
         };

    soar.config( options );

<a name="multidb"></a>
### Multiple Databases Configuration
Using SOAR to access multiple databases can be extremely easy, but first you have to configure SOAR to connect to multiple databases. It turns out that is quite simple, too.

In your **config.json** file, use an array of options instead of a single configuration option with each option specifying the settings of each database. Below is an example:

	[
    {
    	"dbConfig": {
    		"host"     : "127.0.0.1",
    		"database" : "db_1",
    		"user"     : "db1_acc_name",
    		"password" : "xxxx",
    		"supportBigNumbers" : true,
    		"connectionLimit"   : 32
    	},
    	"defPath": "file_path_to_the_data_view_files_of_db1"
    },
    {
    	"dbConfig": {
    		"host"     : "127.0.0.1",
    		"database" : "db_2",
    		"user"     : "db2_acc_name",
    		"password" : "xxxx",
    		"supportBigNumbers" : true,
    		"connectionLimit"   : 32
    	},
    	"defPath": "file_path_to_the_data_view_files_of_db2"
    }
    ]

If you need to connect to 10 databases in your application, then the configuration array should have 10 elements. Configuring multiple databases programmatically can be done in a similar way.

How to access each database in a multi-databases scenario will be explained in each database access method (query, list, create, update and delete) below.

<a name="accessDB"></a>
## Access Database
SOAR offers two types of programming styles to access databases. One is via "Data View" definitions, and the other is the newly introduced (since v1.1.0) "dynamic SQL composition" style. 

<a name="dataView"></a>
### Access Via Data View
Data view is a XML file used to formulate SQL queries. By parameterizing and formulating SQL queries in XML format, SQL queries can be easily reused and managed. For details about how to use "data view" to access databases, please refer to [Using Data View To Access Database](https://github.com/benlue/soar/blob/master/doc/AccessWithDataView.md).

<a name="dynamicSQL"></a>
### SQL Template
SQL template is the other (and newer) programming style SOAR supported. SQL templates allow you to compose and reuse SQL queries in a clean and managable way. Let's start with an example:

    var  soar = require('soarjs');
    
    var  stmp = soar.sqlTemplate('Person');
    stmp.column(['id', 'addr AS address', 'age'])
        .filter( {name: 'age', op: '>='} )
        .extra( 'ORDER BY id' );
    
    var  cmd = {
    	    op: list,
    	    expr: stmp.value()
         },
         query = {age: 18};
    
    soar.execute(cmd, query, function(err, list) {
    	// 'list' is the query result
    });
  
_soar.sqlTempalte(tableName)_ takes a table name as its input and returns a **SQL Template** object. With SQL templates, you can add columns, set query conditions and specify addtional options. Most SQL template functions will return the template object itself, so you can chain funcion calls such that SQL queries can be composed succintly.

<a name="dynamicAPI"></a>
#### API
Belows are APIs related to programming with SQL templates:

<a name="soarExecute"></a>
##### soar.execute(cmd, data, query, cb)

This function can be used to execute SQL queries (query, list, insert, update and delete). The **_data_** parameter is a JSON object which contains data to be inserted or updated to a table. The **_query_** parameter is a JSON object which specifies actual query values. The **_cmd_** parameter has the following properties:

+ op: should be one of the following: 'query', 'list', 'insert', 'update' and 'delete'.

+ expr: a SQL expression which can be built using SQL templates as shown in the above sample code.

+ range: specifies the window of a result set. The _range_ object can be created using the _soar.range()_ function.

Note that the **_data_** and **_query_** parameters were used to be included as the properties of the **_cmd_** parameter. However, including data and query in the **_cmd_** paramater would reduce the possibilities of reusing the **_cmd_** parameter which actually defines how to access DBMS. As a result, data and query are extracted fromm the **_cmd_** parameter sinece v1.1.4. The old signature still works, but it's deprecated.

_cb_ is the callback function which receives an error and sometimes a result object (when it's a query, list or insert operation).

<a name="soarSBI"></a>
##### soar.sqlTemplate(tableName)

This function returns a SQL template object which can be used to build parameterized SQL statements. _tableName_ is the name of a table. If you'll access multiple databases in an application, _tableName_ has to be in the form of _dbName.tableName_ so that SOAR knows which database to talk to.

##### soar.sqlBuildInfo(tableName)

This function has been deprecated in favor of the _soar.sqlTemplate()_ function.

<a name="sbiJoin"></a>
##### sqlTemplate.join(joinExpr)
This template function can be used to specify join conditions. Below is a sample code:

    var  stemp = soar.sqlTemplate('myTable AS myT');
    stemp.join( {table: 'Location AS loc', onWhat: 'myT.locID=loc.locID'} );
    
If you want to make multiple joins, just call _join()_ as many times as you need. The join information is also a plain object with the following properties:

+ table: name of the joined table.
+ type: if you want to make a left join, you can set this property to 'LEFT'.
+ use: the common column name to join two tables.
+ onWhat: the join clause. If the _use_ property is specified, this property will be ignored.

<a name="sbiColumn"></a>
##### sqlTemplate.column(column)
This function can be used to add table columns. If _column_ is a string, the specified column will be added to the existing column collection. You can also add all columns at once by specifying an array of column name strings.

<a name="sbiFilter"></a>
##### sqlTemplate.filter(filter)
This function is used to set query conditions (filter). The primitive format of a filter is a plain object with the following properties:

+ name: name of the filter. It's also used as the key to retrieve filter value from a query object.
+ field: the real column name in a table. If this property is missing, the _name_ property will be used instead.
+ op: what comparator to be used. It can be '>', '=' or 'IS NULL', etc.
+ noArg: when a query operation does not require argument (e.g. IS NULL), this property should be set to true.

Note that this function should be called just once for each SQL templat. Otherwise the new setting will replace the old one. 

<a name="sbiChainFilter"></a>
##### sqlTemplate.chainFilters(op, filters)
If you want to make a compound filter (ANDed or ORed filters), this is the function you need. _op_ should be 'AND' or 'OR', and _filters_ is an array of filters. Below is an example:

    var  orFilters = sbi.chainFilters('OR', [
        {name: 'region', op: '='},
        {name: 'age', op: '>'}
    ]);

The result filter is a compound filter ORing two filters (region and age).

<a name="sbiExtra"></a>
##### sqlTemplate.extra(extra)
This function can add extra options to a SQL statement. _extra_ is a string with possible values like 'GROUP BY col_name' or 'ORDER BY col_name'.

<a name="sbiValue"></a>
##### sqlTemplate.value()
When you've done with the SQL composition, you can call this function to get the SQL template which can be fed to the _soar.execute()_ function to access databases as you wish.

<a name="dynamicCase"></a>
#### Use Cases
Below we'll show how to use _soar.execute()_ to do query, list, insert, update and delete. We'll assume a 'Person' table and use it in the following sample codes.

<a name="dynamicQuery"></a>
##### Query
If you expect a table query should return only one entity (even though there maybe multiple matches to your query), you can ask SOAR to do **query**. Below is a sample code to query a person from the Person table:

    var  stemp = soar.sqlTemplate('Person');
    
    // 'expr' is a SQL expression equivalent to 
    // SELECT * FROM Person WHERE psnID=?
    var  expr = stemp.filter( {name: 'psnID'} ).value();
        
    // The 'option' specified below is like a command to SOAR
    // It will query the person whose psnID is 1
    var  option = {
            op: 'query',
            expr: expr,
            query: {psnID: 1}
        };
        
    // Invoke soar.execute() to get the result
    soar.execute(option, function(err, data) {
        // 'data' is the query result
    });
    
<a name="dynamicList"></a>    
##### List
If your query will return multiple entities, you should do a **list**. Below is a sample code to list persons whose age are over 25 from the Person table:

    var  stemp = soar.sqlTemplate('Person');
    
    // 'expr' is a SQL expression equivalent to 
    // SELECT * FROM Person WHERE age > ?
    var  expr = stemp.filter( {name: 'age', op: '>'} ).value();
        
    // The 'option' specified below is like a command to SOAR
    // It will list all persons whose age is greater than 25
    var  option = {
            op: 'list',
            expr: expr,
            query: {age: 25}
        };
        
    // Invoke soar.execute() to get the result
    soar.execute(option, function(err, list) {
        // 'list' is the query result
    });

<a name="dynamicInsert"></a>    
##### Insert
Below is a sample code to insert to a (Person) table:

    // 'expr' is a SQL expression equivalent to 
    // INSERT INTO Person VALUES (...)
    var  expr = soar.sqlTemplate('Person').value();
        
    // The 'option' specified below is like a command to SOAR
    // It will isnert a person whose name is 'Scott Copper'
    var  option = {
            op: 'insert',
            expr: expr,
            data: {name: 'Scott Cooper'}
        };
        
    // Invoke soar.execute() to do the insert
    soar.execute(option, function(err, value) {
        // 'value' contains the primary key value of the inserted
        // in this case, it will be something like:
        // {psnID: _the_psnID_of_the_newly_inserted_entity}
        // where 'psnID' is the primary key of the Person table
    });

<a name="dynamicUpdate"></a>    
##### Update
Below is a sample code to update a (Person) table:

    var  stemp = soar.sqlTemplate('Person');
    
    // 'expr' is a SQL expression equivalent to 
    // Update Person set ... WHERE psnID=?
    var  expr = stemp.filter( {name: 'psnID'} ).value();
        
    // The 'option' specified below is like a command to SOAR
    // It will update the person whose psnID is 1
    // The 'data' property specify the new value of the column 'name'
    var  option = {
            op: 'update',
            expr: expr,
            data: {name: 'John Mayer'}
            query: {psnID: 1}
        };
        
    // Invoke soar.execute() to do the update
    soar.execute(option, function(err) {
        // you should check 'err' to see if anything goes wrong.
    });

<a name="dynamicDelete"></a>    
##### Delete
Below is a sample code to do delete from a (Person) table:

    var  stemp = soar.sqlTemplate('Person');
    
    // 'expr' is a SQL expression equivalent to 
    // DELETE FROM Person WHERE psnID=?
    var  expr = stemp.filter( {name: 'psnID'} ).value();
        
    // The 'option' specified below is like a command to SOAR
    // It will delete the person whose psnID is 1
    var  option = {
            op: 'delete',
            expr: expr,
            query: {psnID: 1}
        };
        
    // Invoke soar.execute() to do the delete
    soar.execute(option, function(err) {
        // you should check 'err' to see if anything goes wrong.
    });
    
<a name="transaction"></a>    
##### Transaction
Doing transaction is faily simple. All you need to do is to obtain a database connection and pass it to _soar.execute()_. Below is the sample code:

    var  expr = soar.sqlTemplate('Perons').value();
    
    soar.getConnection( function(err, conn) {
        // remember to specify database connection in 'option'
        var  option = {
            op: 'insert',
            expr: expr,
            data: {name: 'Scott Cooper'},
            conn: conn
        };
            
        conn.beginTransaction(function(err) {
            soar.execute(option, function(err, data) {
                if (err)
                    conn.rollback();
                else
                    conn.commit();
            });
        };
    });

<a name="schema"></a>
## Schema Management
Besides accessing data, you can also use SOAR to manage table schema. First of all, you have to get the schema manager from SOAR:

    var  schManager = SOAR.getSchemaManager();
    
With the schema manager, you can do:

<a name="createTable"></a>
### createTable(conn, schema, cb)
This function will create a database table. _conn_ is a database connection which can be obtained by _soar.getConnection()_. _schema_ is a **schema notation** object which defines a table schema. Please refer to [schema notation](https://github.com/benlue/soar/blob/master/doc/SchemaNotation.md) to know about what it is and how to create a schema notation. _cb_ is a callback function when table creation is successful or erred.

<a name="alterTable"></a>
### alterTable(conn, schema, cb)
This function can be used to alter table schema. _conn_ is a database connection which can be obtained by _soar.getConnection()_. _schema_ is a **schema notation** object which defines a table schema. Please refer to [schema notation](https://github.com/benlue/soar/blob/master/doc/SchemaNotation.md) to know about what it is and how to create a schema notation. _cb_ is a callback function when altering table is successfully done or erred.

<a name="deleteTable"></a>
### deleteTable(conn, tableName, cb)
This function can be used to delete (drop) a table. _conn_ is a database connection which can be obtained by _soar.getConnection()_. _tableName_ is the name of the table to be dropped. _cb_ is a callback function when deleting table is successfully done or erred.

<a name="describeTable"></a>
### describeTable(conn, tableName, cb)
This function can be used to derive schema from an existing table. _tableName_ is the name of the table to be derived. _cb(err, schema)_ is the callback function to return the derived schema. The returned schema object is the same as the **schema notation** as described in [this document](https://github.com/benlue/soar/blob/master/doc/SchemaNotation.md).

<a name="debug"></a>
## Debug Messages
If you want to know what SQLs are actually generated by SOAR, you can turn on debug messages as shown below:

    soar.setDebug( true );

That will display generated SQL along with other debug information in console.

## Regarding Tests
The SOAR package comes with some test files. To run those tests, sample data have to be built first. Inside the SOAR istallation, there is a "def" directory which includes schema.sql and sampleData.sql. Those two files can be used to build the sample data. In addition, remember to change the user name and password in your config.json file and the related database settings in the test programs.

## Database Supported
In the current release, SOAR only supports mySQL. If you want to use SOAR for other databases such as Postgre, MS SQL server or Oracle DB, etc, you'll have to write your own SQL generator. Right now SQL generation is implemented by ./lib/sqlGenMySql.js. 
