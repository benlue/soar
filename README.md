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
Starting from release 1.1.0, SOAR provides two programming styles to access database. In addition to the original "data view" style, SOAR now allows developers to dynamically build SQL query templates in applications. The programmatically created SQL query templates are parameterized and can be reused just like the other style can do. With the new programming style, it gives developers more flexbilities and database access has become extremely easy.

With release 1.1.1, you can use SOAR to manipulate table schemas. You can check this [section](#schema) for details.

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
  + [Dynamic SQL composition](#dynamicSQL)
  + [API](#dynamicAPI)
    + [soar.execute()](#soarExecute)
    + [soar.sqlBuildInfo()](#soarSBI)
    + [sbi.join()](#sbiJoin)
    + [sbi.column()](#sbiColumn)
    + [sbi.filter()](#sbiFilter)
    + [sbi.chainFilter()](#sbiChainFilter)
    + [sbi.extra()](#sbiExtra)
    + [sbi.value()](#sbiValue)
+ [Schema management](#schema)
  + [createTable()](#createTable)
  + [alterTable()](#alterTable)
  + [deleteTable()](#deleteTable)
  + [describeTable()](#describeTable)
+ [Debug messages](#debug)

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
Data view is a XML file used to formulate SQL queries. By parameterizing and formulating SQL queries in XML format, SQL queries can be easily reused and managed. For details about how to use "data view" to access databases, please refer to this [article](https://github.com/benlue/soar/blob/master/doc/AccessWithDataView.md).

<a name="dynamicSQL"></a>
### Dynamic SQL Composition
This is the other programming style SOAR supported. Dynamic SQL composition allows you to compose and reuse SQL queries in a clean and managable way. Let's start with an example:

    var  soar = require('soarjs');
    
    var  sbi = soar.sqlBuildInfo('Person');
    sbi.column(['id', 'addr AS address', 'age']).
    filter( {name: 'age', op: '>='} ).
    extra( 'ORDER BY id' );
    
    var  option = {
    	op: list,
    	expr: sbi.value(),
    	query: {age: 18}
    }
    
    soar.execute(option, function(err, list) {
    	// 'list' is the query result
    });
  
_soar.sqlBuildInfo(tableName)_ takes a table name as its input and returns a **SQL Build Info** (SBI) object. With that SBI object, you can add columns, set query conditions and specify addtional options. Most SBI methods would return the SBI object itself, so you can chain funcion calls such that SQL queries can be composed succintly.

<a name="dynamicAPI"></a>
#### API
Belows are APIs related to dynamic SQL composition programming:

<a name="soarExecute"></a>
##### soar.execute(options, cb)

This function can be used to execute SQL queries (query, insert, update and delete). The _options_ parameter has the following properties:

+ op: should be one of the following: 'query', 'list', 'insert', 'update' and 'delete'.

+ sqlExpr: a SQL specification which can be built using SQL Build Info as shown in the above example.

+ data: a plain Javascript object which contains data to be inserted or updated to a table. This is required for **insert** or **update**.

+ query: a plain Javascript object which can be used to specify query values.

+ range: specifies the window of a result set. The _range_ object can be created using the _soar.range()_ function.

+ fields: an array of strings. If you do not need all the table columns specified in the _sqlExpr_ to be returned, you can use this property to specify what columns you would like to receive.

_cb_ is the callback function which takes an error and a result object.

<a name="soarSBI"></a>
##### soar.sqlBuildInfo(tableName)

This function returns a SBI (SQL Build Info) object which can be used to build SQL statements. _tableName_ is the name of a table. If you'll access multiple databases in an application, _tableName_ has to be in the form of _dbName.tableName_ so that SOAR knows which database to talk to.

<a name="sbiJoin"></a>
##### sbi.join(joinExpr)
This SBI function can be used to specify join conditions. Below is a sample code:

    var  sbi = soar.sqlBuildInfo('myTable AS myT');
    sbi.join( {table: 'Location AS loc', onWhat: 'myT.locID=loc.locID'} );
    
If you want to make multiple joins, just call _sbi.join()_ as many times as you need. The join information is also a plain object with the following properties:

+ table: name of the joined table.
+ type: if you want to make a left join, you can set this property to 'LEFT'.
+ use: the common column name to join two tables.
+ onWhat: the join clause. If the _use_ property is specified, this property will be ignored.

<a name="sbiColumn"></a>
##### sbi.column(column)
This function can be used to add table columns. If _column_ is a string, the specified column will be added to the existing column collection. You can also add all columns at once by specifying an array of column name strings.

<a name="sbiFilter"></a>
##### sbi.filter(filter)
This function is used to set query conditions (filter). Note that this function should be called just once or the new setting will replace the old one. The primitive format of a filter is a plain object with the following properties:

+ name: name of the filter. It's also used as the key to retrieve filter value from a query object.
+ field: the real column name in a table. If this property is missing, the _name_ property will be used instead.
+ op: what comparator to be used. It can be '>', '=' or 'IS NULL', etc.
+ noArg: when a query operation does not require argument (e.g. IS NULL), this property should be set to true.

<a name="sbiChainFilter"></a>
##### sbi.chainFilter(op, filters)
If you want to make a compound filter (ANDed or ORed filters), this is the function you need. _op_ should be 'AND' or 'OR', and _filters_ is an array of filters. Below is an example:

    var  orFilters = sbi.chainFilter('OR', [
        {name: 'region', op: '='},
        {name: 'age', op: '>'}
    ]);

The result filter is a compound filter ORing two filters (region and age).

<a name="sbiExtra"></a>
##### sbi.extra(extra)
This function can add extra options to a SQL statement. _extra_ is a string with possible values like 'GROUP BY xxx' or 'ORDER BY xxx'.

<a name="sbiValue"></a>
##### sbi.value()
When you're done with the SQL composition, you can call this function to get the build information which can then be fed to the _soar.execute()_ function.

<a name="schema"></a>
## Schema Management
Besides accessing data, you can also use SOAR to manage table schema. First of all, you have to get the schema manager from SOAR:

    var  schManager = SOAR.getSchemaManager();
    
With the schema manager, you can do:

<a name="createTable"></a>
### createTable(conn, schema, cb)
This function will create a database table. _conn_ is a database connection which can be obtained by _soar.getConnection()_. _schema_ is a **schema notation** object which defines a table schema. Please refer to [schema notation]() to know about what it is and how to create a schema notation. _cb_ is a callback function when table creation is successful or erred.

<a name="alterTable"></a>
### alterTable(conn, schema, cb)
This function can be used to alter table schema. _conn_ is a database connection which can be obtained by _soar.getConnection()_. _schema_ is a **schema notation** object which defines a table schema. Please refer to [schema notation]() to know about what it is and how to create a schema notation. _cb_ is a callback function when altering table is successfully done or erred.

<a name="deleteTable"></a>
### deleteTable(conn, tableName, cb)
This function can be used to delete (drop) a table. _conn_ is a database connection which can be obtained by _soar.getConnection()_. _tableName_ is the name of the table to be dropped. _cb_ is a callback function when deleting table is successfully done or erred.

<a name="describeTable"></a>
### describeTable(conn, tableName, cb)
This function can be used to derive schema from an existing table. _tableName_ is the name of the table to be derived. _cb(err, schema)_ is the callback function to return the derived schema. The returned schema object is the same as the **schema notation** as described in [this document]().

<a name="debug"></a>
### Debug Messages
If you want to know what SQLs are actually generated by SOAR, you can turn on debug messages as shown below:

    soar.setDebug( true );

That will display generated SQL along with other debug information in console.

## Regarding Tests
The SOAR package comes with some test files. To run those tests, sample data have to be built first. Inside the SOAR istallation, there is a "def" directory which includes schema.sql and sampleData.sql. Those two files can be used to build the sample data. In addition, you have to modify your config.json file and the related database settings in the test prorams.

## Database Supported
In the current release, SOAR only supports mySQL. If you want to use SOAR for other databases such as Postgre, MS SQL server or Oracle DB, etc, you'll have to write your own SQL generator. Right now SQL generation is implemented by ./lib/sqlGenMySql.js. If anyone is interested in contributing SQL generators of other DBs, it's certainly welcome.
