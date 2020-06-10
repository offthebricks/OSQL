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