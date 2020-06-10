<?php
namespace osql;

class DatabaseConfig{
	public $path;				//must end in a slash '/'
	public $fileext = "db";		//database file extension
	public $name;
	public $prefix;
}

class Database{
	private $dbconfig;
	private $autoSanitize = TRUE;
	private $busyTimeout = 30000;		//SQLite busy timeout of 30 seconds
	
	private $intransaction = FALSE;
	private $insofttransaction = FALSE;
	private $softTransactionLog = NULL;
	
	private $isReadOnly = TRUE;
	private $linkObj;
	
	public function __construct(DatabaseConfig $dbconfig){
		$this->dbconfig = $dbconfig;
	}
	
	# Desc: closes existing connection, opens connection to new database
	public function Connect($databaseName=NULL){
		$this->Close();
		
		$db = $this->dbconfig->name;
		if($databaseName !== NULL){
			$db = $databaseName;
		}
		$db = $this->dbconfig->path.$databaseName.".".$this->dbconfig->fileext;
		
		$this->linkObj = new \SQLite3($db);
		$this->linkObj->busyTimeout($this->busyTimeout);
	}
	
	# Desc: close the connection
	public function Close(){
		if(!$this->linkObj){
			return;
		}
		if(!@$this->linkObj->close()){
			throw new \Exception("Close: failed to close db connection");
		}
		$this->linkObj = NULL;
	}
	
	############################################################
	
	# Desc: escapes characters to be sqlite3 ready
	# Param: string
	# Returns: string
	private function escapeStr($string){
		return SQLite3::escapeString($string);
	}#-#Escape
	
	############################################################
	
	public function BeginTransaction($soft=TRUE){
		if($this->intransaction || $this->insofttransaction){
			return;
		}
		
		if($soft){
			$this->softTransactionLog = array();
			$this->insofttransaction = TRUE;
		}
		else{
			$res = $this->Query("BEGIN IMMEDIATE;");
			if(!$res){
				throw new \Exception("Transaction: failed to start");
			}
			$this->intransaction = TRUE;
		}
	}
	
	public function CommitTransaction(){
		if($this->intransaction){
			$res = $this->Query("COMMIT;");
			if(!$res){
				return FALSE;
			}
			$this->intransaction = FALSE;
		}
		else if($this->insofttransaction){
			$this->softTransactionLog = NULL;
			$this->insofttransaction = FALSE;
		}
		return TRUE;
	}
	
	public function RollbackTransaction(){
		if($this->intransaction){
			$res = $this->Query("ROLLBACK;");
			if(!$res){
				return FALSE;
			}
			$this->intransaction = FALSE;
		}
		else if($this->insofttransaction){
			//disable soft transaction immediately so that restoration does not cause more logs to be created
			$this->insofttransaction = FALSE;
			foreach($this->softTransactionLog as $arr){
				//if the change was an update
				if(isset($arr['update'])){
					//restore values to those before the update
					$query = new Query($arr['table'],QueryTypes::$Update);
					$query->addValues($arr['update']);
					$query->addClause("id",$arr['id'],NULL,OperatorTypes::$Equals);
					$this->OQuery($query);
				}
				//if the change was a delete
				else if(isset($arr['delete'])){
					//restore deleted values
					$query = new Query($arr['table'],QueryTypes::$Insert);
					$query->addValues($arr['delete']);
					$this->OQuery($query);
				}
				//the change was an insert
				else{
					//delete inserted row
					$query = new Query($arr['table'],QueryTypes::$Delete);
					$query->addClause("id",$arr['id'],NULL,OperatorTypes::$Equals);
					$this->OQuery($query);
				}
			}
			$this->softTransactionLog = NULL;
		}
		return TRUE;
	}
	
	public function setAutoSanitize($sanitize){
		$this->autoSanitize = $sanitize;
	}
	
	public function OQuery($obj){
		if(!$this->linkObj){
			throw new \Exception("OQuery: not connected to a database");
		}
		if(!is_object($obj)){
			throw new \Exception("OQuery: passed value is not an object");
		}
		if(!class_exists('\osql\Parser') || !class_exists('\osql\QueryTypes')){
			throw new \Exception("OQuery: missing osql Parser and/or QueryTypes classes");
		}
		
		$parser = new Parser($this->autoSanitize);
		$sql = $parser->GetSQL($obj,$parameters);
		
		switch($obj->type){
			case QueryTypes::$RawSQL:
				$this->Query($sql,$parameters);
				break;
			case QueryTypes::$Select:
				$limit = $obj->result_limit;
				return $this->Select($sql,$parameters,$limit);
			case QueryTypes::$Update:
				$this->Update($sql,$obj,$parameters);
				break;
			case QueryTypes::$Insert:
				return $this->Insert($sql,$obj->table,$parameters);
			case QueryTypes::$Delete:
				$this->Delete($sql,$obj,$parameters);
				break;
			default:
				throw new \Exception("OQuery: unknown query type");
				break;
		}
		
		return NULL;
	}
	
	############################################################
	
	private function Query($sql,$prepared,$getResults=FALSE){
		$stmt = $this->linkObj->prepare($sql);
		
		if($prepared){
			foreach($prepared as $key => $value){
				$stmt->bindValue(":p$key", $value);	//$this->escapeStr($value));
			}
		}
		
		$resObj = $stmt->execute();
		
		if(!$getResults){
			return;
		}
		
		$resArr = [];
		while($row = $resObj->fetchArray(SQLITE3_ASSOC)){
			$resArr[] = $row;
		}
		$resObj->finalize();
		return $resArr;
	}
	
	private function Select($sql,$prepared,$limit){
		$resVal = $this->Query($sql,$prepared,TRUE);
		
		//if only one result was requested
		if($limit == 1){
			$resVal = $resVal[0];
			//if only one column was requested
			if(sizeof($resVal) == 1){
				foreach($resVal as $val){
					$resVal = $val;
					break;
				}
			}
		}
		
		return $resVal;
	}
	
	private function Insert($sql,$table,$prepared){
		$this->Query($sql,$prepared);
		
		$id = $this->linkObj->lastInsertRowID();
		if($this->insofttransaction){
			$this->softTransactionLog[] = ["table" => $table, "id" => $id];
		}
		return $id;
	}
	
	private function Update($sql,&$obj,$prepared){
		$updateRecord = [];
		if($this->insofttransaction){
			$updateRecord = $this->fetchUpdateRecords($obj);
		}
		
		$this->Query($sql,$prepared);
		
		if($this->insofttransaction){
			foreach($updateRecord as $record){
				$this->softTransactionLog[] = $record;
			}
		}
	}
	
	private function Delete($sql,&$obj,$prepared){
		$deleteRecord = [];
		if($this->insofttransaction){
			$deleteRecord = $this->fetchDeleteRecords($obj);
		}
		
		$this->Query($sql,$prepared);
		
		if($this->insofttransaction){
			foreach($deleteRecord as $record){
				$this->softTransactionLog[] = $record;
			}
		}
	}
	
	############################################################
	
	# desc: 
	private function fetchDeleteRecords(&$obj){
		if(!class_exists('\osql\Query')){
			throw new \Exception("Update: osql query class required for soft transaction update queries");
		}
		$query = new Query($obj->table,QueryTypes::$Select);
		$query->addField("*");
		foreach($obj->clauses as $cObj){
			$query->clauses[] = $cObj;
		}
		
		$results = $this->OQuery($query);
		$records = [];
		if($results){
			foreach($results as $data){
				$records[] = ["table"=>$query->table, "delete"=>$data];
			}
		}
		return $records;
	}#-#fetchDeleteRecords()
	
	# desc: 
	private function fetchUpdateRecords(&$obj){
		if(!class_exists('\osql\Query')){
			throw new \Exception("Update: osql query class required for soft transaction update queries");
		}
		//build a select query from the update object
		$query = new Query($obj->table,QueryTypes::$Select);
		$query->addField("id");
		foreach($obj->values as $vObj){
			if($vObj->column == "id"){
				continue;
			}
			$query->addField($vObj->column);
		}
		foreach($obj->clauses as $cObj){
			$query->clauses[] = $cObj;
		}
		
		$results = $this->OQuery($query);
		$records = [];
		if($results){
			foreach($results as $data){
				$id = $data['id'];
				unset($data['id']);
				$records[] = ["table"=>$query->table, "id"=>$id, "update"=>$data];
			}
		}
		return $records;
	}#-#fetchUpdateRecords()
}
?>