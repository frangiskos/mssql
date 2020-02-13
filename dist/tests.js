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
const assert = require("assert");
const _1 = require(".");
const sqlConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    options: {
        enableArithAbort: true
    }
};
_1.sql.init(sqlConfig);
function runTests() {
    return __awaiter(this, void 0, void 0, function* () {
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
        /** Test that the table exists */
        const tablePeople = yield _1.sql.q1(`SELECT OBJECT_ID('people', 'U')`);
        assert.notDeepStrictEqual(tablePeople, { '': null }, 'Table people is missing');
        const johnnyData = {
            name: 'Johnny',
            birthdate: new Date('2000-01-01'),
            childrenCount: 2,
            salary: 2345.67,
            isMarried: true
        };
        /** Insert data into DB */
        yield _1.sql.q(`INSERT INTO people (name, birthdate, childrenCount, salary, isMarried) 
        VALUES (@P1, @P2, @P3, @P4, @P5)`, johnnyData.name, johnnyData.birthdate, johnnyData.childrenCount, johnnyData.salary, johnnyData.isMarried);
        /** Retrieve first match from DB */
        const jonnyFromDB = yield _1.sql.q1(`SELECT * FROM people WHERE name = @P1`, 'Johnny');
        /** Test that the data retrieved are the same with the data inserted + id */
        assert.deepStrictEqual(jonnyFromDB, Object.assign({ id: 1 }, johnnyData));
        assert(typeof jonnyFromDB.id === 'number');
        assert(typeof jonnyFromDB.name === 'string');
        assert(typeof jonnyFromDB.birthdate === 'object');
        assert(jonnyFromDB.birthdate.toISOString() === '2000-01-01T00:00:00.000Z');
        assert(typeof jonnyFromDB.salary === 'number');
        assert(jonnyFromDB.salary === 2345.67);
        assert(typeof jonnyFromDB.isMarried === 'boolean');
        /** Add record and return identity */
        const id = yield _1.sql.ii(`INSERT INTO people (name) VALUES (@P1)`, 'Not Johnny');
        /** Test that identity is equal to 2 */
        assert.strictEqual(id, 2);
        /** Get all records */
        const bothPersons = yield _1.sql.q('SELECT * FROM people');
        assert(Array.isArray(bothPersons));
        assert(bothPersons[1].birthdate === null);
        yield _1.sql.q('DROP TABLE IF EXISTS people');
    });
}
runTests()
    .then(() => console.log('Tests completed'))
    .then(_1.sql.close)
    .catch(console.error);
//# sourceMappingURL=tests.js.map