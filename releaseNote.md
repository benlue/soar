1.1.8
=====

+ Bug fixes for using the "field" attribute in filters for SQL templates.

1.1.7
=====

+ When doing join, if the query condition is not specified, the previous releases failed to generate a correct statement. The bug is fixed in this release.

+ Also note that when doing table join both columns and query conditions cannot be omitted.

1.1.6
=====

+ Manipulating table schemas are even easier now. You can call schema maintenance functions such as _createTable()_, _alterTable()_, etc without having to get a database connection first.

1.1.5
=====

+ When invoking _execute()_ without specifying the query conditions, SOAR will automatically generate the corresponding query conditions based on the given query value.

1.1.4
=====

+ Changed the signature of the _execute()_ function so it's easier to reuse SQL templates. The old form still works, but is deprecated.

1.1.3
=====

+ Fixed a bug in altering table.

1.1.2
=====

+ SQL Build Info has been renamed to **sqlTemplate**. As a result, the _soar.sqlBuildInfo()_ function has been deprecated. Please use _soar.sqlTemplate()_ instead.

+ When you use _soar.execute()_ to do insert, the return value will be an object with primary key/value pairs. The older version only returns the auto-incremented primary key value. Take the 'Person' table (included in the test case) for example, if you use _soar.execute()_ to insert a new person, the return value will be {psnID: the_new_id} instead of just the_new_id.

+ The input SQL template to the _soar.execute()_ function can skip the table column specification. That is if you do not specify table columns in a SQL template, SOAR will automatically fill it for you.

1.1.1
=====

+ Added functions to create, alter and delete tables. Also a function to read a table schema into a JSON object.

1.1.0
=====

+ Added another database access programming style: dynamic SQL composition. This new style allows developers to build SQL query templates in node.js modules without having to create XML files as the older style would require. The programmatically created SQL query templates are parameterized and can be reused just like the other style can do. With the new programming style, it gives developers more flexbilities.

1.0.1
=====

+ Added support for multiple database access.
+ Command line tools such as 'genAll.js' and 'genView.js' can still work on a single database.

1.0.0
=====

+ Officially released
