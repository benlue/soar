/*!
* soar
* authors: Ben Lue
* license: MIT License
* Copyright(c) 2015 Gocharm Inc.
*/
var  sqlComp = (function()  {

	var  sqlComp = function(tableName) {
		this.schema = {};
		this.schema.table = {name: tableName};
	};

	sqlComp.prototype.join = function(joinExpr) {
		// do some checking
		if (!joinExpr.table)
			throw  new Error('Joined table name is missing');
		if (!joinExpr.use && !joinExpr.onWhat)
			throw  new Error('Missing join clause');

		if (!this.schema.table.join)
			this.schema.table.join = [];
		this.schema.table.join.push( joinExpr );

		return  this;
	};

	sqlComp.prototype.column = function(columns)  {
		var  arrayClaz = Object.prototype.toString.call(columns).slice(8, -1);
		if (arrayClaz === 'Array')  {
			for (var i in columns)  {
				if (typeof columns[i] !== 'string')
					throw  new Error('table column should be a string or an array of strings');
			}
			this.schema.columns = columns;
		}
		else  {
			if (typeof columns !== 'string')
				throw  new Error('table column should be a string or an array of strings');

			if (!this.schema.columns)
				this.schema.columns = [];
			this.schema.columns.push( columns );
		}

		return  this;
	};

	sqlComp.prototype.filter = function(filter)  {
		this.schema.filters = filter;
		return  this;
	};

	sqlComp.prototype.extra = function(extra)  {
		this.schema.extra = extra;
		return  this;
	};

	sqlComp.prototype.chainFilters = function(op, filters)  {
		return  {op: op, filters: filters};
	};

	sqlComp.prototype.value = function()  {
		return  this.schema;
	};

	return  sqlComp;
})();

module.exports = sqlComp;
