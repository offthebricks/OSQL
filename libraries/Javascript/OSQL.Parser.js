var OSQL_Parser = new function(){
	
	var _parameters;
	
	function buildRawSQL(obj){
		//in a raw sql query, the query table value contains the full sql
		return obj.table;
	}
	
	function buildDelete(obj){
		let str = "";
		//build where clause
		if(obj.clauses){
			str += " WHERE " + getSelectClauses(obj.clauses, null, []);
		}
		//finish
		return "DELETE FROM " + obj.table + str;
	}
	
	function buildInsert(obj){
		let i, vobj, part1 = "", part2 = "";
		for(i=0; i<obj.values.length; i++){
			vobj = obj.values[i];
			checkColumnIsSafe(vobj.column);
			if(part1.length){
				part1 += ",";
				part2 += ",";
			}
			part1 += "\"" + vobj.column + "\"";
			if(vobj.value === null){
				part2 += "NULL";
			}
			else if(isNumeric(vobj.value)){
				part2 += vobj.value;
			}
			else{
				part2 += ":p" + _parameters.length;
				_parameters.push(vobj.value);
			}
		}
		return "INSERT INTO " + obj.table + " (" + part1 + ") VALUES (" + part2 + ")";
	}
	
	function buildUpdate(obj){
		let i, vobj, str = "";
		for(i=0; i<obj.values.length; i++){
			vobj = obj.values[i];
			checkColumnIsSafe(vobj.column);
			if(str.length){
				str += ", ";
			}
			if(vobj.value === null){
				str += "\"" + vobj.column + "\"=NULL";
			}
			else if(isNumeric(vobj.value)){
				str += "\"" + vobj.column + "\"=" + vobj.value;
			}
			else{
				str += "\"" + vobj.column + "\"=:p" + _parameters.length;
				_parameters.push(vobj.value);
			}
		}
		//build where clause
		if(obj.clauses){
			str += " WHERE " + getSelectClauses(obj.clauses,null,[]);
		}
		//finish
		return "UPDATE " + obj.table + " SET " + str;
	}
	
	function buildSelect(obj){
		let i, join, str = "SELECT";
		if(obj.distinct){
			str += " DISTINCT";
		}
		let fieldsql = getSelectFields(obj.fields, obj.joins);
		for(i=0; i<obj.joins.length; i++){
			join = obj.joins[i];
			if(!join.fields.length){
				continue;
			}
			if(fieldsql){
				fieldsql += ",";
			}
			fieldsql += getSelectFields(join.fields, 1 + i);
		}
		if(!fieldsql){
			throw new Error("no select fields provided");
		}
		str += " " + fieldsql + " FROM " + obj.table + " A";
		str += getSelectJoins(obj.joins);
		if(obj.clauses && obj.clauses.length){
			str += " WHERE " + getSelectClauses(obj.clauses, "A", obj.joins);
		}
		
		if(obj.orderby && obj.orderby.length){
			str += getOrderByStatement(obj);
		}
		
		//add limit
		if(obj.result_limit){
			str += " LIMIT " + obj.result_limit;
		}
		
		return str;
	}
	
	function getOrderByStatement(obj){
		let i, obObj, str = "";
		for(i=0; i<obj.orderby.length; i++){
			obObj = obj.orderby[i];
			checkColumnIsSafe(obObj.column);
			if(str){
				str += ",";
			}
			str += getJoinPrefix(obj.joins, obObj.join) + ".\"" + obObj.column + "\"";
			if(obObj.desc){
				str += " DESC";
			}
		}
		
		return " ORDER BY " + str;
	}
	
	function getJoinPrefix(joins, id){
		if(id){
			let i, j;
			for(i=0; i<joins.length; i++){
				j = joins[i];
				if(j.id == id){
					return String.fromCharCode(i + 1 + 65);
				}
			}
		}
		return "A";
	}
	
	/************************************/
	
	function getSelectFields(list, joins){
		let i, field, str = "", prefix = "";
		for(i=0; i<list.length; i++){
			field = list[i];
			checkColumnIsSafe(field.column);
			if(field.join && Array.isArray(joins)){
				prefix = getJoinPrefix(joins, field.join);
			}
			else if(isNumeric(joins)){
				prefix = String.fromCharCode(joins + 65);
			}
			else{
				prefix = "A";
			}
			if(str){
				str += ",";
			}
			if(field.column == "*"){
				str += prefix + "." + field.column;
			}
			else{
				str += prefix + ".\"" + field.column + "\"";
			}
			if(field.as){
				str += " AS " + field.as;
			}
		}
		return str;
	}
	
	function getSelectClauses(list, prefix, joins){
		let i, clause, str = "";
		for(i=0; i<list.length; i++){
			clause = list[i];
			if(str){
				str += Types.ClauseTypes.GetString(clause.type);
			}
			if(clause.join){
				prefix = getJoinPrefix(joins, clause.join);
			}
			//check if this is a multi clause in brackets
			if(Array.isArray(clause.column)){
				str += "(" + getSelectClauses(clause.column, prefix, joins) + ")";
			}
			else{
				checkColumnIsSafe(clause.column);
				if(prefix){
					str += prefix + ".";
				}
				//need to handle nulls differently
				if(clause.compare === null){
					//check for an invalid compare case
					if(clause.operator != Types.OperatorTypes.Equals){
						throw new Error("null clause compare with non-equals operator");
					}
					str += "\"" + clause.column + "\" IS NULL";
					continue;
				}
				else{
					str += "\"" + clause.column + "\"" + Types.OperatorTypes.GetString(clause.operator);
				}
				if(isNumeric(clause.compare)){
					str += clause.compare;
				}
				else if(typeof(clause.compare) === 'string'){
					//parameterize the value for safety
					str += ":p" + _parameters.length;
					_parameters.push(clause.compare);
				}
				else{
					//must be field class
					field = clause.compare;
					checkColumnIsSafe(field.column);
					if(field.join){
						str += getJoinPrefix(joins, field.join) + ".\"" + field.column + "\"";
					}
					else{
						str += "A.\"" + field.column + "\"";
					}
				}
			}
		}
		return str;
	}
	
	function getSelectJoins(list){
		let i, join, str = "";
		for(i=0; i<list.length; i++){
			join = list[i];
			str += Types.JoinTypes.GetString(join.type) + "JOIN " + join.table + " " + String.fromCharCode(i + 1 + 65) + " ON ";
			str += getSelectClauses(join.clauses, String.fromCharCode(i + 1 + 65), list);
		}
		return str;
	}
	
	function checkColumnIsSafe(columnName){
		//check for space in column name
		if(!columnName.length || columnName.indexOf(" ") >= 0){
			throw new Error("invalid field column name detected: '" + columnName + "'");
		}
	}
	
	function isNumeric(value){
		return !isNaN(parseFloat(value)) && isFinite(value);
	}
	
	/************************************/
	
	var Types = {
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
			Outer: 4,
			
			GetString: function(type){
				switch(type){
					default:break;
					case 1:return " LEFT ";
					case 2:return " INNER ";
					case 3:return " RIGHT ";
					case 4:return " OUTER ";
				}
				return "";
			}
		},
		
		ClauseTypes: {
			And: 1,
			Or: 2,
			
			GetString: function(type){
				switch(type){
					default:break;
					case 1:return " AND ";
					case 2:return " OR ";
				}
				return "";
			}
		},
		
		OperatorTypes: {
			Equals: 1,
			NotEquals: 2,
			GreaterThan: 3,
			GreaterThanEquals: 4,
			LessThan: 5,
			LessThanEquals: 6,
			
			GetString: function(type){
				switch(type){
					default:break;
					case 1:return "=";
					case 2:return "!=";
					case 3:return ">";
					case 4:return ">=";
					case 5:return "<";
					case 6:return "<=";
				}
				return "";
			}
		}
	};
	
	/************************************/
	
	return {
		GetSQL: function(osqlObj, params){
			//requires Types models
			if(!Types || !Types.QueryTypes){
				throw new Error("missing Types model for QueryTypes");
			}
			
			_parameters = [];
			
			let i, str = "";
			switch(osqlObj.type){
				case Types.QueryTypes.RawSQL:str = buildRawSQL(osqlObj);break;
				case Types.QueryTypes.Select:str = buildSelect(osqlObj);break;
				case Types.QueryTypes.Update:str = buildUpdate(osqlObj);break;
				case Types.QueryTypes.Insert:str = buildInsert(osqlObj);break;
				case Types.QueryTypes.Delete:str = buildDelete(osqlObj);break;
				default:throw new Error("GetSQL: unknown query type");
			}
			//need to add params one at a time to ensure reference isn't broken
			for(i=0; i<_parameters.length; i++){
				params.push(_parameters[i]);
			}
			
			return str;
		}
	};
}

//if this is running as a node module
if(typeof(module) === 'object' && typeof(require) === 'function'){
	module.exports = OSQL_Parser;
}
