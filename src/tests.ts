require('dotenv').config();
import { sql, SqlConfig } from '.';
import * as faker from 'faker';
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
    birthdate: Date;
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

    await sql.q(`ALTER TABLE people ADD CONSTRAINT [DF_people_childrenCount] DEFAULT ((0)) FOR [childrenCount]`);

    const tableId = await sql.queryValue(`SELECT OBJECT_ID (N'people', N'U')`);
    assert(tableId !== null);
    log.end('sql.q create Table');

    /** Test that the table exists */
    const tablePeople = await sql.q1(`SELECT OBJECT_ID('people', 'U')`);
    assert.notDeepStrictEqual(tablePeople, { '': null }, 'Table people is missing');

    const personList: Person[] = [];
    for (let i = 0; i < 10000; i++) {
        personList.push({
            name: faker.name.findName(),
            birthdate: faker.date.past(50),
            childrenCount: faker.random.number(3),
            salary: faker.random.number({ min: 1000, max: 3000 }),
            isMarried: faker.random.boolean(),
        });
    }

    log.start('sql.q Insert data into DB');
    await sql.q(
        `INSERT INTO people (name, birthdate, childrenCount, salary, isMarried) 
        VALUES (@P1, @P2, @P3, @P4, @P5)`,
        personList[0].name,
        personList[0].birthdate,
        personList[0].childrenCount,
        personList[0].salary,
        personList[0].isMarried
    );
    assert(true);
    log.end('sql.q Insert data into DB');

    log.start('sql.q1 Retrieve first match from DB');
    const personFromDB = await sql.q1(
        `SELECT * FROM people WHERE name = @P1 AND birthdate = @P2`,
        personList[0].name,
        personList[0].birthdate
    );
    /** Test that the data retrieved are the same with the data inserted + id */
    // assert.deepStrictEqual(personFromDB, { id: 1, ...personList[0] });
    assert(typeof personFromDB.id === 'number');
    assert(personFromDB.name === personList[0].name);
    assert(typeof personFromDB.birthdate === 'object');
    assert(
        (personFromDB.birthdate as Date).toISOString().split('.')[0] ===
            personList[0].birthdate.toISOString().split('.')[0]
    );
    assert(typeof personFromDB.salary === 'number');
    assert(personFromDB.salary === personList[0].salary);
    assert(typeof personFromDB.isMarried === 'boolean');
    log.end('sql.q1 Retrieve first match from DB');

    log.start('sql.qv single value');
    /** Returns the value of the first key of the first record returned (instead of an array of objects) */
    const person1Name = await sql.qv(`SELECT name FROM people WHERE name = @P1`, personList[0].name);
    assert(person1Name === personList[0].name);
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
    let personsBefore = await sql.qv(`SELECT count(*) FROM people`);
    // Insert as object
    await sql.functions.insertObject('people', personList[1]);
    // Insert as object array
    await sql.functions.insertObject('people', personList.slice(2, 6));
    let personsAfter = await sql.qv(`SELECT count(*) FROM people`);
    assert(personsAfter - personsBefore === 5);
    log.end('sql.function.insertObject');

    log.start('sql.function.bulkInsert');
    personsBefore = await sql.qv(`SELECT count(*) FROM people`);
    const res = await sql.functions.bulkInsert('people', personList);
    console.log(`inserted ${res.rowsAffected} records in ${res.executionTime / 1000} secs.`);
    personsAfter = await sql.qv(`SELECT count(*) FROM people`);
    assert(personsAfter - personsBefore === 10000);
    log.end('sql.function.bulkInsert');
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
