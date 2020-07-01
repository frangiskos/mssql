"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const _1 = require(".");
const faker = require("faker");
const assert = require("assert");
const AssertionError = assert.AssertionError;
const sqlConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    options: {
        enableArithAbort: true,
    },
};
const log = {
    start(msg) {
        console.log(`\nAsserting ${msg}...`);
    },
    end(msg) {
        console.log(`Asserting ${msg} OK`);
    },
};
function runTests() {
    return __awaiter(this, void 0, void 0, function* () {
        log.start('sql.q create Table');
        yield _1.sql.q('DROP TABLE IF EXISTS people');
        yield _1.sql.q(`CREATE TABLE people (
        id int IDENTITY(1,1),
        name nvarchar(100),
        birthdate datetime,
        childrenCount int,
        salary money,
        isMarried bit
        )
        `);
        yield _1.sql.q(`ALTER TABLE people ADD CONSTRAINT [DF_people_childrenCount] DEFAULT ((0)) FOR [childrenCount]`);
        const tableId = yield _1.sql.queryValue(`SELECT OBJECT_ID (N'people', N'U')`);
        assert(tableId !== null);
        log.end('sql.q create Table');
        /** Test that the table exists */
        const tablePeople = yield _1.sql.q1(`SELECT OBJECT_ID('people', 'U')`);
        assert.notDeepStrictEqual(tablePeople, { '': null }, 'Table people is missing');
        const personList = [];
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
        yield _1.sql.q(`INSERT INTO people (name, birthdate, childrenCount, salary, isMarried) 
        VALUES (@P1, @P2, @P3, @P4, @P5)`, personList[0].name, personList[0].birthdate, personList[0].childrenCount, personList[0].salary, personList[0].isMarried);
        assert(true);
        log.end('sql.q Insert data into DB');
        log.start('sql.q1 Retrieve first match from DB');
        const personFromDB = yield _1.sql.q1(`SELECT * FROM people WHERE name = @P1 AND birthdate = @P2`, personList[0].name, personList[0].birthdate);
        /** Test that the data retrieved are the same with the data inserted + id */
        // assert.deepStrictEqual(personFromDB, { id: 1, ...personList[0] });
        assert(typeof personFromDB.id === 'number');
        assert(personFromDB.name === personList[0].name);
        assert(typeof personFromDB.birthdate === 'object');
        assert(personFromDB.birthdate.toISOString().split('.')[0] ===
            personList[0].birthdate.toISOString().split('.')[0]);
        assert(typeof personFromDB.salary === 'number');
        assert(personFromDB.salary === personList[0].salary);
        assert(typeof personFromDB.isMarried === 'boolean');
        log.end('sql.q1 Retrieve first match from DB');
        log.start('sql.qv single value');
        /** Returns the value of the first key of the first record returned (instead of an array of objects) */
        const person1Name = yield _1.sql.qv(`SELECT name FROM people WHERE name = @P1`, personList[0].name);
        assert(person1Name === personList[0].name);
        log.end('sql.qv single value');
        log.start('sql.qv count');
        let totalPersons = yield _1.sql.qv(`SELECT count(*) FROM people`);
        assert(totalPersons === 1);
        log.end('sql.qv count');
        log.start('sql.qv Error');
        //@ts-ignore
        yield assert.rejects(_1.sql.qv(`SELECT name FROM people WHERE name = @P1`, 'Nobody'));
        log.end('sql.qv Error');
        log.start('sql.ii Insert and return identity');
        const id = yield _1.sql.ii(`INSERT INTO people (name) VALUES (@P1)`, 'Not Johnny');
        /** Test that identity is equal to 2 */
        assert.strictEqual(id, 2);
        log.end('sql.ii Insert and return identity');
        log.start('sql.q return recordset');
        const bothPersons = yield _1.sql.q('SELECT * FROM people');
        assert(Array.isArray(bothPersons));
        assert(bothPersons[1].birthdate === null);
        log.end('sql.q return recordset');
        log.start('sql.function.insertObject');
        let personsBefore = yield _1.sql.qv(`SELECT count(*) FROM people`);
        // Insert as object
        yield _1.sql.functions.insertObject('people', personList[1]);
        // Insert as object array
        yield _1.sql.functions.insertObject('people', personList.slice(2, 6));
        let personsAfter = yield _1.sql.qv(`SELECT count(*) FROM people`);
        assert(personsAfter - personsBefore === 5);
        log.end('sql.function.insertObject');
        log.start('sql.function.bulkInsert');
        personsBefore = yield _1.sql.qv(`SELECT count(*) FROM people`);
        const res = yield _1.sql.functions.bulkInsert('people', personList);
        console.log(`inserted ${res.rowsAffected} records in ${res.executionTime / 1000} secs.`);
        personsAfter = yield _1.sql.qv(`SELECT count(*) FROM people`);
        assert(personsAfter - personsBefore === 10000);
        log.end('sql.function.bulkInsert');
    });
}
_1.sql.init(sqlConfig)
    .then(() => runTests())
    .then(() => console.log('Tests completed'))
    .then(_1.sql.close)
    .catch((e) => {
    if (e instanceof AssertionError) {
        // Output expected AssertionErrors.
        console.error(`Assertion failed.\n- Expected: ${e.expected}\n- Got: ${e.actual}\n-Error: ${e}`);
    }
    else {
        // Output unexpected Errors.
        console.error('Unexpected error in tests\n', e);
    }
});
//# sourceMappingURL=tests.js.map