# Connect to an MS-SQL server and run queries using a simple API

A simple way to run SQL queries using Async/Await and Promises. This is not an ORM.  
It uses node-mssql under the hood

## Installation

```bash
npm install @frangiskos/mssql
```

## Initialization

```typescript
import { sql, SqlConfig } from '@frangiskos/mssql';
const sqlConfig: SqlConfig = {
    user: 'my_db_user',
    password: 'my_super_secret_password',
    database: 'my_database_name',
    server: 'the_sql_server'
};

sql.init(sqlConfig);
```

## Usage

> The first parameter is the SQL query to execute. Use @P1, @P2 for parameter values.
> the rest parameters are the values for the parameters (The first one will replace @P1, the second will replace @P2 and so on)

```typescript
import { sql } from '@frangiskos/mssql';
sql.query('SELECT * FROM USERS WHERE name like @P1 AND isActive = @P2', 'John%', true)
    .then(data => console.log(data))
    .catch(error => console.error(error));
```

### Using Async / Await

```typescript
try {
    const data = await sql.query('SELECT * FROM USERS WHERE name like @P1 AND isActive = @P2', 'John%', true);
} catch (error) {
    console.log(error);
}
```

### Methods

-   sql.query (alias: sql.q): Executes query and returns an array with the results. Can be used for any query types
-   sql.queryOne (alias: sql.q1): Executes the query and returns the first record, or null if there are no records
-   sql.insertReturnIdentity (alias: sql.ii): Can be used for INSERT. It will return the identity of the inserted record (i.e. SCOPE_IDENTITY()) or null

### Examples

INSERT RECORD

```typescript
    await sql.q(
        `INSERT INTO people (name, birthdate, childrenCount, salary, isMarried)
        VALUES (@P1, @P2, @P3, @P4, @P5)`,
        'Johnny',
         new Date('2000-01-01'),
         2,
         2345.67,
         true
    };
```

INSERT AND GET ID

```typescript
const id = await sql.ii(`INSERT INTO people (name) VALUES (@P1)`, 'Not Johnny');
```

UPDATE USING ISO DATE STRING

```typescript
const id = await sql.q(`UPDATE people SET birthdate=@P1 WHERE id=@P2`, '2000-01-01', 2);
```

SELECT RECORDS FROM TABLE

```typescript
    const people = await sql.q(
        `SELECT * FROM people WHERE name like @P1`,
        '%Johnny')
    ); // returns an array with all matching records
```

SELECT SINGLE RECORD FROM TABLE

```typescript
    const Johnny = await sql.q(
        `SELECT * FROM people WHERE id = @P1`,
        1)
    ); // returns the first matching record or null
```

See ./src/tests.ts for more examples.
