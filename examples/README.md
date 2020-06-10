# OSQL Examples
A variety of SQL queries and the OSQL to match.

All examples are written in PHP but could easily be adapted for another language; the principles are the same.

Simple select with no 'where' clauses
```
SQL
SELECT A.* FROM table1 A ORDER BY A.name,A.email DESC LIMIT 10

OSQL
$query = new \osql\Query("table1");
$query->setLimit(10)
	->addField("*")
	->addOrderBy("name")
	->addOrderBy("email",TRUE);
```

Select all values in one record
```
SQL
SELECT A.* FROM table1 A WHERE A.id=5

OSQL
$query = new \osql\Query("table1");
$query->addField("*")
	->addClause("id",5);
```

Select two values only from one record
```
SQL
SELECT A.name,A.age AS myage FROM table1 A WHERE A.id=5

OSQL
$query = new \osql\Query("table1");
$query->addField("name")
	->addField("age","myage")
	->addClause("id",5);
```

Select two values, and multiple 'where' clauses
```
SQL
SELECT A.name,A.age AS myage FROM table1 A WHERE A.id=5 AND (A.status=1 OR A.name='my name')

OSQL
$query = new \osql\Query("table1");
$query->addField("name")
	->addField("age","myage")
	->addClause("id",5)
	->addMultiClause(
		\osql\ClauseTypes::$And,
		[
			new \osql\Clause("status",1),
			new \osql\Clause("name","my name",\osql\ClauseTypes::$Or)
		]
	);
```

Select with a 'join'
```
SQL
SELECT A.name,A.age AS myage,B.status,B.name AS level
FROM table1 A
LEFT JOIN levels B ON B.id=A.level AND B.status='active'
WHERE A.id=5 AND (A.status=1 OR A.name='my name')

OSQL
$query = new \osql\Query("table1");
$query->addField("name")
	->addField("age","myage")
	->addClause("id",5)
	->addMultiClause(
		\osql\ClauseTypes::$And,
		[
			new \osql\Clause("status",1),
			new \osql\Clause("name","my name",\osql\ClauseTypes::$Or)
		]
	)
	->addJoin(
		"levels",
		\osql\JoinTypes::$Left,
		[
			new \osql\Clause("id",new \osql\Field("level")),
			new \osql\Clause("status","active")
		],
		[
			new \osql\Field("status"),
			new \osql\Field("name","level")
		]
	);
```

Select with multiple 'joins' involved in the 'where' clauses
```
SQL
SELECT A.name,A.age AS myage,B.status,B.name AS level,C.name FROM table1 A
LEFT JOIN levels B ON B.id=A.level AND B.status=1
INNER JOIN levels C ON C.id=B.alt
WHERE A.id=5 AND (A.status=1 OR B.score>C.score)

OSQL
$query = new \osql\Query("table1");
$query->addField("name")
	->addField("age","myage")
	->addClause("id",5)
	->addMultiClause(
		\osql\ClauseTypes::$And,
		[
			new \osql\Clause("status",1),
			new \osql\Clause(
				"score",
				new \osql\Field("score",NULL,"C-levels"),
				\osql\ClauseTypes::$Or,
				\osql\OperatorTypes::$GreaterThan,
				"B-levels"
			)
		]
	)
	->addJoin(
		"levels",
		\osql\JoinTypes::$Left,
		[
			new \osql\Clause("id",new \osql\Field("level")),
			new \osql\Clause("status",1)
		],
		[
			new \osql\Field("status"),
			new \osql\Field("name","level")
		],
		"B-levels"
	)
	->addJoin(
		"levels",
		\osql\JoinTypes::$Inner,
		[
			new \osql\Clause("id",new \osql\Field("alt",NULL,"B-levels"))
		],
		[
			new \osql\Field("name")
		],
		"C-levels"
	);
```

Update Query
```
SQL
UPDATE table1 SET `col1`=1, `col2`='abc123', `col3`=123 WHERE id=321 AND status='good'

OSQL
$query = new \osql\Query("table1",\osql\QueryTypes::$Update);
$query->addValue("col1",1)
	->addValue("col2","abc123")
	->addValue("col3",123)
	->addClause("id",321)
	->addClause("status","good");
```

Insert Query
```
SQL
INSERT INTO table1 (`col1`,`col2`,`col3`) VALUES (1,'abc123',123)

OSQL
$query = new \osql\Query("table1",\osql\QueryTypes::$Insert);
$query->addValue("col1",1)
	->addValue("col2","abc123")
	->addValue("col3",123);
```

Delete Query
```
SQL
DELETE FROM table1 WHERE id=321 AND status='good'

OSQL
$query = new \osql\Query("table1",\osql\QueryTypes::$Delete);
$query->addClause("id",321)
	->addClause("status","good");
```
