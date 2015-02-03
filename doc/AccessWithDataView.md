Using Data View To Access Database
==================================

A data view is a XML file used to formulate a SQL query. SOAR uses data views to compose SQL statements. SOAR can also smartly generate the proper query conditions based on the given query values.

## Contents

+ [Programming Guide](#guide)
  + [Query](#query)
  + [List](#list)
  + [Insert](#insert)
  + [Update](#update)
  + [Delete](#delete)
+ [Data View Definition](#dvml)
  + [Query conditions](#dvQuery)
  + [Examples](#samples)
  + [Managing Data View Definition](#manage)
+ [How To Do Transactions](#transaction)

<a name="guide"></a>
##Programming Guide
How to do query, list, insert, update and delete using SOAR is shown below.

<a name="query"></a>
### Query for A Single Entity
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

**Access Multiple Databases**

If SOAR is configured to access multiple databases in an application, the database name should be prefixed to the vfile (so that SOAR could know which database it should talke to) as shown below:

    var  options = {
                vfile: 'dbName.Person/general.dvml',
                params: {psnID: 1}
         };

<a name="list"></a>
### Query for A List
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

**Access Multiple Databases**

If SOAR is configured to access multiple databases in an application, the database name should be prefixed to the vfile (so that SOAR could know which database it should talke to) as shown below:

    var  options = {
                vfile: 'dbName.Person/general.dvml',
                params: {name: 'David %'}
         };

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

<a name="insert"></a>
### Insert
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

**Access Multiple Databases**

If SOAR is configured to access multiple databases in an application, the database name should be prefixed to the vfile (so that SOAR could know which database it should talke to) as shown below:

    var  options = {
                entity: 'dbName.Person',
                data: {name: 'Scott Cooper'}
         };

<a name="update"></a>
### Update
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

**Access Multiple Databases**

If SOAR is configured to access multiple databases in an application, the database name should be prefixed to the vfile (so that SOAR could know which database it should talke to) as shown below:

    var  options = {
                entity: 'dbName.Person',
                data: {name: 'John Cooper'},
                terms: {psnID: 1}
         };

<a name="delete"></a>
### Delete
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

**Access Multiple Databases**

If SOAR is configured to access multiple databases in an application, the database name should be prefixed to the vfile (so that SOAR could know which database it should talke to) as shown below:

    var  options = {
                entity: 'dbName.Person',
                terms: {psnID: 1}
         };

<a name="dvml"></a>
## Data View Definition
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

<a name="dvQuery"></a>
### Query Conditions
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

<a name="samples"></a>
### Data View Definiton Examples
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

<a name="manage"></a>
### Managing Data View Definition
You can think of data view definition (DV) as table views expressed in XML. With DV, you will not mess up your code with SQL generation. What's better, DV is invoked by name and the same DV can be reused in anywhere of a program as long as you see it fit.

#### Where Are They
It's recommended to group all DV of a database under the same file directory. The default location is the "def" directory under the SOAR directory. For each database table, there is a corresponding directory of the same name to store the various DV files of a table. Each table should have at least a DV file named as "general.dvml". The "general.dvml" file is used for insert, delete and update for a table.

Most of the time, you may not want to put the DV directory in the default location. More likely you'll put it in your project worksapce. To do so, you can specify the **defPath** property in the config.json file with the **defPath** property points to your preferred DV directory. You can also specify the DV directory programmatically. Simpley add the **defPath** to the **options** variable and call _soar.config(options)_ to configure SOAR properly.

#### Generate DV Files
You can manually write DVs, especially when you want to customize your SQL. However, when you use SOAR in an application for the first time, you may hope to generate the default DV (general.dvml) of every table in a database all at once. SOAR does come with a CLI to do just that:

    node cli/genAll -f configFile

Using **-f** to designate you DB configuration file. By doing so, you'll have all the default DV for your application generated and you're ready to roll.

<a name="transaction"></a>
### How To Do Transactions
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

If your application is connected to multiple database at the same time, remember to specify the database name as the second parameter to the _getConnetion()_ function as below:

    soar.getConnection('db_name', function(err, conn) {
    	// do your stuff here
    });
