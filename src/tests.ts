import { sql, SqlConfig } from '.';
import * as assert from 'assert';

const sqlConfig: SqlConfig = {
    user: 'sa',
    password: 'IoT123456!',
    server: 'mssql.vm.iot.com.cy',
    database: 'aa_test',
    options: {
        enableArithAbort: true
    }
};
sql.init(sqlConfig);

interface Person {
    id?: number;
    name: string;
    birthdate: Date | string;
    childrenCount: number;
    salary: number;
    isMarried: boolean;
}

async function runTests() {
    await sql.q('DROP TABLE IF EXISTS people');

    await sql.q(`CREATE TABLE people (
        id int IDENTITY(1,1),
        name nvarchar(100),
        birthdate datetime,
        childrenCount int,
        salary money,
        isMarried bit
    )
    `);

    /** Test that the table exists */
    const tablePeople = await sql.q1(`SELECT OBJECT_ID('people', 'U')`);
    assert.notDeepStrictEqual(tablePeople, { '': null }, 'Table people is missing');

    const johnnyData: Person = {
        name: 'Johnny',
        birthdate: new Date('2000-01-01'),
        childrenCount: 2,
        salary: 2345.67,
        isMarried: true
    };

    /** Insert data into DB */
    await sql.q(
        `INSERT INTO people (name, birthdate, childrenCount, salary, isMarried) 
        VALUES (@P1, @P2, @P3, @P4, @P5)`,
        johnnyData.name,
        johnnyData.birthdate,
        johnnyData.childrenCount,
        johnnyData.salary,
        johnnyData.isMarried
    );

    /** Retrieve first match from DB */
    const jonnyFromDB = await sql.q1(`SELECT * FROM people WHERE name = @P1`, 'Johnny');
    /** Test that the data retrieved are the same with the data inserted + id */
    assert.deepStrictEqual(jonnyFromDB, { id: 1, ...johnnyData });
    assert(typeof jonnyFromDB.id === 'number');
    assert(typeof jonnyFromDB.name === 'string');
    assert(typeof jonnyFromDB.birthdate === 'object');
    assert((jonnyFromDB.birthdate as Date).toISOString() === '2000-01-01T00:00:00.000Z');
    assert(typeof jonnyFromDB.salary === 'number');
    assert(jonnyFromDB.salary === 2345.67);
    assert(typeof jonnyFromDB.isMarried === 'boolean');

    /** Add record and return identity */
    const id = await sql.ii(`INSERT INTO people (name) VALUES (@P1)`, 'Not Johnny');
    /** Test that identity is equal to 2 */
    assert.strictEqual(id, 2);

    /** Get all records */
    const bothPersons = await sql.q('SELECT * FROM people');

    assert(Array.isArray(bothPersons));
    assert(bothPersons[1].birthdate === null);
}

runTests()
    .then(() => console.log('Tests completed'))
    .then(sql.close)
    .catch(console.error);
