#SOAR
## What Is SOAR
SOAR (Simple Object Adapter for Relational data) is a relational database access tool. It allows developers to access database with/as Javascript objects. It also allows developers to have precise control of how database is accessed. SOAR offers some benefits of ORM and tries to avoid its overhead and problems.

## Why SOAR
Most developers would agree it's not a good idea to compose SQL inside programs. It's tedious and error-prone. So there comes ORM which was intended to provide a cleaner programming model. Unfortunately, ORM could turn into a monster if the DB schema is full of references.

Maybe what developers need is just a light-weight solution to harness SQL. Consider a DB access tool with the following feaures:

+ Query a DB and return the value as a plain Javascript object or array of objects. If you want to insert or update a record, you can simply put the data in a Javascript object and write it out to DB.

+ Unlike most ORM solutions, you have complete control of how SQL is generated and applied.

+ You can name a SQL command or even formulate it into a file. You can later use that SQL by just referring its name.

+ Composing the SQL WHERE clause inside programs is so tedious and error-prone. Is there a tool to dynamically generate a SQL command based on query conditions?

So, here comes SOAR.

## Installation

    npm install soarjs

## Usage
Below are short cuts to important sections of this guide:

+ [DB Settings](#dbSetup)
+ [Query](#query)
+ [List](#list)
+ [Insert](#insert)
+ [Update](#update)
+ [Delete](#delete)
+ [Data View Definition](#dvml)
+ [Samples of Data View Definition](#samples)
+ [How to do transactions](#transaction)
+ [Debug messages](#debug)

### DB Settings<a name="dbSetup"></a>
There are two ways to setup the database configuration in SOAR: using a config file or doing it programmatically.

#### The config.json File
Right beneath the SOAR installation directory, there is a **config.json** file which would look like:

    {
    	"dbConfig": {
    		"host"     : "127.0.0.1",
    		"database" : "soar",
    		"user"     : "myDB_acc_name",
    		"password" : "xxxx",
    		"supportBigNumbers" : true,
    		"connectionLimit"   : 64
    	}
    }
    
where **host** is the database host and **database** is the database name. **user** and **password** are the database user name and password respectively. SOAR refer to the _mysql_ node module as its mySQL driver and SOAR turns on the connection pool feature by default.

#### Config Programmatically
You can configure the database connection settings right inside your node program. Here is how:

    var  soar = require('soarjs');
    var  options = {
                dbConfig: {
                    "host"     : "127.0.0.1",
                    "database" : "soar",
                    "user"     : "myDB_acc_name",
                    "password" : "xxxx",
                    "supportBigNumbers" : true,
                    "connectionLimit"   : 64
                }
         };
         
    soar.config( options );
    
### Access Database
Below I'll explain how to do query, insert, update and delete using SOAR:

#### Query for A Single Entity<a name="query"></a>
If you expect your query would return exactly one entity, you can use:

    soar.query(options, callback);
    
The **options** parameter could have the following properties:

+ **vfile**: a data view definition. SOAR will translate a data view definition into the actual SQL command. This property is required.

+ **params**: the query condition. For exmaple, if you want to query users whose first name is "John", then **params** shoud be like {firsName: 'John'}. If **params** is missing, there would be no query conditions.

+ **fields**: the data fields returned by a query is defined in the data view definition. If you do not need all the fields returned, you can use the **fields** property to define the return fields. **fields** is an string array with each item indicating a return field. For example, fields = ['name', 'addr'].

+ **conn**: a database connection. Most of the time you need not specify this property as SOAR will automatically get one for you. However, if you want to execute several SOAR commands within a transaction, you'll have to pass in the connection property.

**callback(err, data)** is the callback function when a query operation is returned. It has two parameters:

+ **err**: an error object if anything goes wrong.

+ **data**: if the query is successful, **data** will be the query result. **data** is a plain Javascript object.

Below is an example:

    var  options = {
                vfile: 'Person/general.dvml',
                params: {psnID: 1}
         };

    soar.query(options, function(err, data) {
        console.log('Detailed info about pserson #1:\n%s',
        			 JSON.stringify(data) );
    });
    
#### Query for A List<a name="list"></a>
If your query would return multiple entities, you can use:

    soar.list(options, callback);
    
The **options** parameter could have the following properties:

+ **vfile**: a data view definition. SOAR will translate a data view definition into the actual SQL command. This property is required.

+ **params**: the query condition. For exmaple, if you want to query users whose first name is "John", then **params** shoud be like {firsName: 'John'}. If **params** is missing, there would be no query conditions.

+ **fields**: the data fields returned by a query is defined in the data view definition. If you do not need all the fields returned, you can use the **fields** property to define the return fields. **fields** is an string array with each item indicating a return field. For example, fields = ['name', 'addr'].

+ **range**: specify this property to return part of the results. The idea is like pagination with the **range** parameter specifying the page index and how many entities in a page.

+ **conn**: a database connection. Most of the time you need not specify this property as SOAR will automatically get one for you. However, if you want to execute several SOAR commands within a transaction, you'll have to pass in the connection property.

**callback(err, list)** is the callback function when a query operation is returned. It has two parameters:

+ **err**: an error object if anything goes wrong.

+ **list**: if the query is successful, **list** will be the query result. **list** is a Javascript array.

Below is an example:

    var  options = {
                vfile: 'Person/general.dvml',
                params: {name: 'David %'}
         };

    soar.list(options, function(err, list) {
        console.log('How many people whose first name is David? %d',
                    list.length );
    });
    
**Applying Pagination**

If a query result contains too many records, you can apply pagination to receive a portion of the whole result. The following sample code shows how to get the 21th to 30th data records in a query:

    var  range = soar.newRange(3, 10),
         options = {
                vfile: 'Person/general.dvml',
                params: {name: 'David %'},
                range: range
         };

    soar.list(options, function(err, list, counts) {
        console.log('How many people whose first name is David? %d',
                    list.length );
    });
    
The function _soar.newRange(pageIdx, pageSize)_ can be used to generate a page range which in turn can be fed to the **options** parameter to the _soar.list()_ call. When the _soar.list()_ function is presented with a page range, the return callback will be invoked with an additional parameter, **count**, as shown in the above sample code. The **count** parameter indicates the total number of query results.

#### Insert<a name="insert"></a>
Below is how you can do an insert to a table:

    soar.insert(options, callback);
    
The **options** parameter could have the following properties:

+ **entity**: name of the database table. This property is required.

+ **data**: the data to be inserted into a table. **data** is a Javascript object. If **data** contains any property which is not defined in the target table, such property will be ignored. This property is required.

+ **conn**: a database connection. Most of the time you need not specify this property as SOAR will automatically get one for you. However, if you want to execute several SOAR commands within a transaction, you'll have to pass in the connection property.

**callback(err, id)** is the callback function when the insert operation is returned. It has two parameters:

+ **err**: an error object if anything goes wrong.

+ **id**: if data are successfully inserted, **id** will be the primary key value of the newly inserted entry. Of couse, the **id** value is available only when the target table uses an auto-increment primary key.

Below is an example:

    var  options = {
                entity: 'Person',
                data: {name: 'Scott Cooper'},
         };

    soar.insert(options, function(err, psnID) {
        console.log('The numeric ID of Scott Cooper is %d', psnID);
    });
    
#### Update<a name="update"></a>
Below is how you can update a table:

    soar.update(options, callback);
    
The **options** parameter could have the following properties:

+ **entity**: name of the database table. This property is required.

+ **data**: the data to be inserted into a table. **data** is a Javascript object. If **data** contains any property which is not defined in the target table, such property will be ignored. This property is required.

+ **terms**: **terms** qualifies the update conditions. This property should be carefully specified. If this property is not specified, the WHOLE table will be updated.

+ **conn**: a database connection. Most of the time you need not specify this property as SOAR will automatically get one for you. However, if you want to execute several SOAR commands within a transaction, you'll have to pass in the connection property.

**callback(err)** is the callback function when the update operation is returned. It has one parameter:

+ **err**: an error object if anything goes wrong.

Below is an example:

    var  options = {
                entity: 'Person',
                data: {name: 'John Cooper'},
                terms: {psnID: 1}
         };

    soar.update(options, function(err) {
    	if (!err)
            console.log('The #1 person whose name has been changed.');
    });
    
#### Delete<a name="delete"></a>
Below is how to delete entries in a table:

    soar.del(options, callback);
    
The **options** parameter could have the following properties:

+ **entity**: name of the database table. This property is required.

+ **terms**: **terms** qualifies the delete conditions. This property should be carefully specified. If this property is not specified, the WHOLE table will be deleted.

+ **conn**: a database connection. Most of the time you need not specify this property as SOAR will automatically get one for you. However, if you want to execute several SOAR commands within a transaction, you'll have to pass in the connection property.

**callback(err)** is the callback function when the delete operation is returned. It has one parameter:

+ **err**: an error object if anything goes wrong.

Below is an example:

    var  options = {
                entity: 'Person',
                terms: {psnID: 1}
         };

    soar.del(options, function(err) {
    	if (!err)
            console.log('The #1 person has been deleted.');
    });
    
### Data View Definition<a name="dvml"></a>
A data view definition (DV) reorgranizes a SQL command into a more readable XML format. The result file has the .dvml postfix which stands for Data View Markup Language. Below is what a DV file would look like:

    <db_view>
        <table name="tableName AS abbrName1">
            <join table="tableName AS abbrName2">abbrName1.col1=abbrName2.col2</join>
        </table>
        
        <fields>
        	<field name="fieldName1" tag="name_alias2" />
        	<field name="fieldName2" tag="name_alias2" />
        </fields>
        
        <filter>
        	<filter name="psnID"	/>
        	<filter name="name"	/>
        </filter>
        
        <extra>ORDER BY name DESC</extra>
     </db_view>
     
In a DV file, there are four major tags beneath the root tag. &lt;table&gt; indicates the table name. It emulates the FROM clause of a SQL command. The &lt;fields&gt; tag specifies which table fields should be returned (or updated) in a query. It emulates the SELECT clause of a SQL command. Developers can use the "tag" attribute in the &lt;field&gt; tag to specify a field name alias.

&lt;filter&gt; can be used to setup query conditions. It's similar to the WHERE clause of a SQL command. Filters can be cascaded to formulate logical AND and logical OR.

The &lt;extra&gt; tag is used to enclose extra query conditions such as "ORDER BY" or "GROUP BY".

#### Query Conditions
One of SOAR's nice features is that it can dynamically generate a SQL command based on the query condition set in a program. We'll use an example to explain this.

Assuming you have a database table about personal info:

    <db_view>
        <table name="Person" />
        <fields>
            <field name="psnID" />
            <field name="psnName" />
        </fields>
        <filter>
            <filter name="psnID" />
            <filter name="psnName" />
        </filter>
    </db_view>
    
and you want to query the person whose id is 1. Below is a sample code:

    var  options = {
                vfile: 'Person/general.dvml',
                params: {psnID: 1}
         };

    soar.query(options, function(err, data) {
        // result...
    });
    
Even though the "Person/general.dvml" data view contains two filter conditions: "psnID" and "psnName", in our sample program only the "psnID" query condition is applied. SOAR is smart enough not to print out the other query condition ("psnName") in the SQL command. The generated SQL would look like:

    SELECT psnID, psnName FROM Person WHERE psnID=1;
    
So unlike the straight forward SQL programming, you don't have to define various data view definitions just because there could be various combinations of query terms.

### Data View Definiton Samples<a name="samples"></a>
Below we'll show a few examples to demonstrate how SQL is converted to DV.

#### A Simple Query
This is a SQL command:

    SELECT employeeID, empName FROM Employee;
    
and this is the data view definition which can be used to generate the corresponding SQL:

    <db_view>
        <table name="Employee" />
        <fields>
            <field name="employeeID" />
            <field name="empName" />
        </fields>
        <filter>
            <filter name="employeeID" />
            <filter name="empName" />
        </filter>
    </db_view>
    
#### JOIN
The folowing SQL join employees with their company:

    SELECT employeeID, empName, comp.name as corpName
    FROM Employee AS emp
    JOIN Compay AS comp ON emp.coID=comp.coID
    WHERE comp.coID=?;
    
and the corresponding DV:

    <db_view>
        <table name="Employee AS emp">
            <join table="Company AS comp">emp.coID=comp.coID</join>
        </table>
        
        <fields>
            <field name="employeeID" />
            <field name="empName"    />
            <field name="comp.name"  tag="corpName"/>
        </fields>
        
        <filter>
            <filter name="employeeID" />
            <filter name="empName"    />
            <filter name="corpName"  field="comp.name" />
        </filter>
    </db_view>
    
Note that the third filter has an additional **field** attribute. The **field** attribute is the actual table field while the **name** attribute is used to match the query terms sent from programs. If the values of the **name** attribute and **field** attribute are the same, the **field** attribute can be omitted.

#### Query with 'OR'
When there are multiple filters in a data view definition, they are "ANDed" by default. So how to do logical OR in a query?

Assuming you want to look for people with age below 20 or over 60, this can be done with the following SQL:

    SELECT psnID, psnName FROM Person WHERE age < 20 OR age > 60;
    
Below is how you do with DV:

    <db_view>
        <table name="Person" />
        
        <fields>
            <field name="psnID" />
            <field name="psnName" />
        </fields>
        
        <filter op="OR">
            <filter name="youngAge" field="age" />
            <filter name="oldAge"   field="age" />
        </filter>
    </db_view>
    
#### More examples
Look for test files under the "test" directory. You can find more examples about settings and queries.

### Managing Data View Definition
You can think of data view definition (DV) as table views expressed in XML. With DV, you will not mess up your code with SQL generation. What's better, DV is invoked by name and the same DV can be reused in anywhere of a program as long as you see it fit.

#### Where Are They
It's recommended to group all DV of a database under the same file directory. The default location is the "def" directory under the SOAR directory. For each database table, there is a corresponding directory of the same name to store the various DV files of a table. Each table should have at least a DV file named as "general.dvml". The "general.dvml" file is used for insert, delete and update for a table.

Most of the time, you may not want to put the DV directory in the default location. More likely you'll put it in your project worksapce. To do so, you can specify the **defPath** property in the config.json file with the **defPath** property points to your preferred DV directory. You can also specify the DV directory programmatically. Simpley add the **defPath** to the **options** variable and call _soar.config(options)_ to configure SOAR properly.

#### Generate DV Files
You can manually write DVs, especially when you want to customize your SQL. However, when you use SOAR in an application for the first time, you may hope to generate the default DV (general.dvml) of every table in a database all at once. SOAR does come with a CLI to do just that:

    node cli/genAll -f configFile
    
Using **-f** to designate you DB configuration file. By doing so, you'll have all the default DV for your application generated and you're ready to roll.

### How To Do Transactions<a name="transaction"></a>
Below is the sample code:

    var  soar = require('soarjs');
    
    soar.getConnection( function(err, conn) {
        if (err)
            console.log('Failed to get DB connection.');
        else  {
            conn.beginTransaction(function(err) {
                if (err)
                    console.log('Failed to start a transaction.');
                else  {
                    // do transaction related operations here
                    var  options = {
                        entity: 'Person',
                        data: {name: 'John Cooper'},
                        terms: {psnID: 1},
                        conn: conn
                    };
                    
                    soar.update(options, function(err) {
                    	if (err)
                    		conn.rollback();
                    	else
                    		conn.commit();
                    });
                }
            });
        }
    });
    
Remember to pass the database connection obtained from the _soar.getConnection()_ call to the DB access function calls by setting the connection into the **options.conn** attribute.

### Debug Messages<a name="debug"></a>
If you want to know what SQLs are actually generated by SOAR, you can turn on debug messages as shown below:

    soar.setDebug( true );
    
That will display generated SQL along with other debug information in console.

## Regarding Tests
The SOAR package comes with some test files. To run those tests, sample data have to be built first. Inside the SOAR istallation, there is a "def" directory which includes schema.sql and sampleData.sql. Those two files can be used to build the sample data. In addition, you have to modify your config.json file and the related database settings in the test prorams.

## Database Supported
In the current release, SOAR only supports mySQL. If you want to use SOAR for other databases such as Postgre, MS SQL server or Oracle DB, etc, you'll have to write your own SQL generator. Right now SQL generation is done by the ./lib/sqlGenMySql.js program. It's very welcome if anyone likes to contribute SQL generators for other DBs.
