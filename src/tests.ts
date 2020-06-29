require('dotenv').config();
import { sql, SqlConfig } from '.';
import * as assert from 'assert';
const AssertionError = assert.AssertionError;

const sqlConfig: SqlConfig = {
    server: process.env.DB_SERVER!,
    database: process.env.DB_DATABASE!,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    options: {
        enableArithAbort: true,
    },
};

interface Person {
    id?: number;
    name: string;
    birthdate: Date | string;
    childrenCount: number;
    salary: number;
    isMarried: boolean;
}

const log = {
    start(msg: string) {
        console.log(`\nAsserting ${msg}...`);
    },
    end(msg: string) {
        console.log(`Asserting ${msg} OK`);
    },
};

async function runTests() {
    log.start('sql.q create Table');
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

    const tableId = await sql.queryValue(`SELECT OBJECT_ID (N'people', N'U')`);
    assert(tableId !== null);
    log.end('sql.q create Table');

    /** Test that the table exists */
    const tablePeople = await sql.q1(`SELECT OBJECT_ID('people', 'U')`);
    assert.notDeepStrictEqual(tablePeople, { '': null }, 'Table people is missing');

    const johnnyData: Person = {
        name: 'Johnny',
        birthdate: new Date('2000-01-01'),
        childrenCount: 2,
        salary: 2345.67,
        isMarried: true,
    };

    log.start('sql.q Insert data into DB');
    await sql.q(
        `INSERT INTO people (name, birthdate, childrenCount, salary, isMarried) 
        VALUES (@P1, @P2, @P3, @P4, @P5)`,
        johnnyData.name,
        johnnyData.birthdate,
        johnnyData.childrenCount,
        johnnyData.salary,
        johnnyData.isMarried
    );
    assert(true);
    log.end('sql.q Insert data into DB');

    log.start('sql.q1 Retrieve first match from DB');
    const jonnyFromDB = await sql.q1(`SELECT * FROM people WHERE name = @P1`, 'Johnny');
    /** Test that the data retrieved are the same with the data inserted + id */
    assert.deepStrictEqual(jonnyFromDB, { id: 1, ...johnnyData });
    assert(typeof jonnyFromDB.id === 'number');
    assert(jonnyFromDB.name === 'Johnny');
    assert(typeof jonnyFromDB.birthdate === 'object');
    assert((jonnyFromDB.birthdate as Date).toISOString() === '2000-01-01T00:00:00.000Z');
    assert(typeof jonnyFromDB.salary === 'number');
    assert(jonnyFromDB.salary === 2345.67);
    assert(typeof jonnyFromDB.isMarried === 'boolean');
    log.end('sql.q1 Retrieve first match from DB');

    log.start('sql.qv single value');
    /** Return value of the first key of the first record returned */
    const jonnyName = await sql.qv(`SELECT name FROM people WHERE name = @P1`, 'Johnny');
    assert(jonnyName === 'Johnny');
    log.end('sql.qv single value');

    log.start('sql.qv count');
    let totalPersons = await sql.qv(`SELECT count(*) FROM people`);
    assert(totalPersons === 1);
    log.end('sql.qv count');

    log.start('sql.qv Error');
    //@ts-ignore
    await assert.rejects(sql.qv(`SELECT name FROM people WHERE name = @P1`, 'Nobody'));
    log.end('sql.qv Error');

    log.start('sql.ii Insert and return identity');
    const id = await sql.ii(`INSERT INTO people (name) VALUES (@P1)`, 'Not Johnny');
    /** Test that identity is equal to 2 */
    assert.strictEqual(id, 2);
    log.end('sql.ii Insert and return identity');

    log.start('sql.q return recordset');
    const bothPersons = await sql.q('SELECT * FROM people');
    assert(Array.isArray(bothPersons));
    assert(bothPersons[1].birthdate === null);
    log.end('sql.q return recordset');

    log.start('sql.function.insertObject');
    const personsBefore = await sql.qv(`SELECT count(*) FROM people`);
    await sql.functions.insertObject('people', johnnyData);
    await sql.functions.insertObject('people', [johnnyData, johnnyData, johnnyData, johnnyData]);
    const personsAfter = await sql.qv(`SELECT count(*) FROM people`);
    assert(personsAfter - personsBefore === 5);
    log.end('sql.function.insertObject');
}

sql.init(sqlConfig)
    .then(() => runTests())
    .then(() => console.log('Tests completed'))
    .then(sql.close)
    .catch((e) => {
        if (e instanceof AssertionError) {
            // Output expected AssertionErrors.
            console.error(`Assertion failed.\n- Expected: ${e.expected}\n- Got: ${e.actual}\n-Error: ${e}`);
        } else {
            // Output unexpected Errors.
            console.error('Unexpected error in tests\n', e);
        }
    });
