# OSQL
An object-oriented approach to SQL

OSQL is a set of classes and types which are combined to form a code object representing an equivalent SQL query. Joins, fields, values, clauses, etc, are all objects which are loaded into the parent query object. The query object may then be converted to a real SQL string, or may be encoded for transport over a socket or other communication channel; one can even build the query in a web browser using Javascript, and send the query via an http(s) connection.

SQL example
```
SELECT A.name,A.age AS myage,B.status,B.name AS level
FROM table1 A
LEFT JOIN levels B ON B.id=A.level AND B.status='active'
WHERE A.id=5 AND (A.status=1 OR A.name='my name')
```

OSQL equivalent (in Javascript)
```
let query = new OSQL.Query("table1");
  query.addField("name")
    .addField("age","myage")
    .addClause("id",5)
    .addMultiClause(
      OSQL.ClauseTypes.And,
      [
        new OSQL.Clause("status",1),
        new OSQL.Clause("name","my name",OSQL.ClauseTypes.Or)
      ]
    )
    .addJoin(
      "levels",
      OSQL.JoinTypes.Left,
      [
        new OSQL.Clause("id",new OSQL.Field("level")),
        new OSQL.Clause("status","active")
      ],
      [
        new OSQL.Field("status"),
        new OSQL.Field("name","level")
      ]
    );
```

The object-oriented design of OSQL makes it compiler-safe, and quick and easy to write. Analysis may be more easily performed on queries prior to database execution, as no complex parsing of the query is required. Use OSQL to greatly simplify your API code. Forget REST or GraphQL and just use OSQL. All you need on the API is a permissions handler for security, and the client does the rest.

OSQL parameterizes values by default, so SQL injection is a thing of the past. No complex database mapping or database drivers are needed; as far as the database engine knows, it's just getting SQL like it always does.

Optimize your database engine by having it accept OSQL directly! No complex query parsing as the query arrives in efficient object form, ready to go!

Read more details about the benefit of OSQL over straight SQL here: https://www.offthebricks.com/why-are-we-still-using-sql-try-osql

The goal of the OSQL project is to become a standard on which libraries are based and developed. A few example libraries will be developed and maintained to promote adoption of the project.
