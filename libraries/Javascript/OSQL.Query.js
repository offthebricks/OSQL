var OSQL = {
	Query: function(table,type){
		var _obj = {
			type: type,					//default to none
			result_limit: null,			//default to no limit (NULL)
			distinct: false,			//do not add distinct to the select
			
			table: table,
			fields: [],					//can be a string or 'field' _object; string values are not permitted whitespaces
			joins: [],
			clauses: [],
			values: [],
			orderby: [],
			
			setLimit: function(limit){
				_obj.result_limit = limit;
				return _obj;
			},
			setDistinct: function(dis){
				_obj.distinct = dis;
				return _obj;
			},
			
			addField: function(column,as,join){
				let tmp = new OSQL.Field(column,as,join);
				_obj.fields.push(tmp);
				return _obj;
			},
			
			addJoin: function(table,type,clauses,fields,id){
				if(typeof(type) === 'undefined'){
					type = null;
				}
				if(typeof(clauses) === 'undefined'){
					clauses = null;
				}
				if(typeof(fields) === 'undefined'){
					fields = null;
				}
				if(typeof(id) === 'undefined'){
					id = null;
				}
				
				if(clauses){
					for(let i=0; i<clauses.length; i++){
						clauses[i] = clauses[i];
					}
				}
				let tmp = new OSQL.Join(table,type,clauses,fields,id);
				_obj.joins.push(tmp);
				return _obj;
			},
			
			addClause: function(column,compare,type,operator,join){
				if(typeof(column) === 'undefined'){
					column = null;
				}
				if(typeof(compare) === 'undefined'){
					compare = null;
				}
				if(typeof(type) === 'undefined'){
					type = null;
				}
				if(typeof(operator) === 'undefined'){
					operator = null;
				}
				if(typeof(join) === 'undefined'){
					join = null;
				}
				
				let tmp = new OSQL.Clause(column,compare,type,operator,join);
				_obj.clauses.push(tmp);
				return _obj;
			},
			
			addMultiClause: function(type,clauses,join){
				if(typeof(type) === 'undefined'){
					type = null;
				}
				if(typeof(clauses) === 'undefined'){
					clauses = null;
				}
				if(typeof(join) === 'undefined'){
					join = null;
				}
				
				let clauseObj = new OSQL.Clause(clauses,null,type,null,join);
				clauseObj = clauseObj;
				if(join){
					let j, idx;
					for(idx=0; idx<_obj.joins.length; idx++){
						j = _obj.joins[idx];
						if(j.id == join){
							j.clauses.push(clauseObj);
							break;
						}
					}
				}
				else{
					_obj.clauses.push(clauseObj);
				}
				return _obj;
			},
			
			addValues: function(values){
				if(!values || typeof(values) !== 'object'){
					throw "invalid values object";
				}
				let i, v_obj, list = Object.getOwnPropertyNames(values);
				for(i=0; i<list.length; i++){
					if(typeof(values[list[i]]) === 'function'){
						continue;
					}
					v_obj = new OSQL.Value();
					v_obj.column = list[i];
					v_obj.value = values[list[i]];
					_obj.values.push(v_obj);
				}
				return _obj;
			},
			
			addValue: function(column,value){
				let v_obj = new OSQL.Value();
				v_obj.column = column;
				v_obj.value = value;
				_obj.values.push(v_obj);
				return _obj;
			},
			
			addOrderBy: function(column,desc,join){
				let obObj = new OSQL.OrderBy(column,desc,join);
				_obj.orderby.push(obObj);
				return _obj;
			}
		};
		
		//validate query type
		if(!_obj.type){
			_obj.type = OSQL.QueryTypes.Select;
		}
		
		return _obj;
	},
	
	QueryTypes: {
		RawSQL: 1,
		Select: 2,
		Update: 3,
		Insert: 4,
		Delete: 5
	},
	
	JoinTypes: {
		Left: 1,
		Inner: 2,
		Right: 3,
		Outer: 4
	},
	
	ClauseTypes: {
		And: 1,
		Or: 2
	},
	
	OperatorTypes: {
		Equals: 1,
		NotEquals: 2,
		GreaterThan: 3,
		GreaterThanEquals: 4
	},
	
	Field: function(column,as,join){
		let tmp = {
			column: column,
			as: null,			//select 'as' value if desired
			join: null			//for clause compare values
		};
		
		if(typeof(as) === 'string'){
			tmp.as = as;
		}
		if(typeof(join) === 'string'){
			tmp.join = join;
		}
		
		return tmp;
	},
	
	Join: function(table,type,clauses,fields,id){
		let tmp = {
			table: table,
			type: OSQL.JoinTypes.Left,
			clauses: [],
			fields: [],				//fields to fetch from this join
			id: null
		};
		
		if(type){
			tmp.type = type;
		}
		if(clauses){
			tmp.clauses = clauses;
		}
		if(fields){
			tmp.fields = fields;
		}
		if(id){
			tmp.id = id;
		}
		
		return tmp;
	},
	
	Clause: function(column,compare,type,operator,join){
		let tmp = {
			column: column,
			compare: compare,						//can be a 'Field' _object
			type: OSQL.ClauseTypes.And,				//defaults to 'And'
			operator: OSQL.OperatorTypes.Equals,	//defaults to 'Equals'
			join: null
		};
		
		if(type){
			tmp.type = type;
		}
		if(operator){
			tmp.operator = operator;
		}
		if(join){
			tmp.join = join;
		}
		
		return tmp;
	},
	
	Value: function(){
		return {
			column: null,
			value: null
		};
	},
	
	OrderBy: function(column,desc,join){
		let tmp = {
			column: column,
			desc: false,
			join: null
		};
		
		if(desc){
			tmp.desc = true;
		}
		if(join){
			tmp.join = join;
		}
		
		return tmp;
	}
};