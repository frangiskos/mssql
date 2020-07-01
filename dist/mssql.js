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
const mssql = require("mssql");
const functions_1 = require("./functions");
class SqlFactory {
    constructor() {
        this.connectionTimeout = 30000;
        this.timerReset = () => {
            clearTimeout(this.idleTimer);
            this.idleTimer = setTimeout(this.close, this.connectionTimeout);
        };
        this.close = () => __awaiter(this, void 0, void 0, function* () {
            this.idleTimer && clearTimeout(this.idleTimer);
            this._pool && (yield this._pool.close());
        });
        /** Alias to query */
        this.q = this.query;
        /** Alias to queryOne */
        this.q1 = this.queryOne;
        /** Alias to queryValue */
        this.qv = this.queryValue;
        /** Alias to insertReturnIdentity */
        this.ii = this.insertReturnIdentity;
        if (SqlFactory.instance)
            throw new Error('Instantiation failed. Use .getInstance() instead of new.');
        SqlFactory.instance = this;
        this.functions = functions_1.sqlFunctions(this);
    }
    get pool() {
        if (!this._pool)
            throw new Error('SQL not initialized. Use sql.init(config) first');
        return this._pool;
    }
    get request() {
        return mssql.Request;
    }
    checkConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            // // Already connected
            if (this.pool.connected) {
                this.timerReset();
                // // Wait for connection
            }
            else if (this.pool.connecting) {
                // wait up to 10 sec to connect or reject
                yield new Promise((resolve, reject) => {
                    const handler = () => {
                        if (this._pool && this._pool.connected) {
                            clearInterval(waiting);
                            clearTimeout(expireTimeout);
                            this.timerReset();
                            return resolve();
                        }
                    };
                    const waiting = setInterval(handler, 100);
                    const expireTimeout = setTimeout(() => {
                        clearInterval(waiting);
                        reject('Is taking too long to connect to database');
                    }, 10000);
                });
                // // Connect
            }
            else {
                this.idleTimer = setTimeout(this.close, this.connectionTimeout);
                yield this.pool.connect().catch((error) => {
                    // // pool.connect() error:
                    // ELOGIN (ConnectionError) - Login failed.
                    // ETIMEOUT (ConnectionError) - Connection timeout.
                    // EALREADYCONNECTED (ConnectionError) - Database is already connected!
                    // EALREADYCONNECTING (ConnectionError) - Already connecting to database!
                    // EINSTLOOKUP (ConnectionError) - Instance lookup failed.
                    // ESOCKET (ConnectionError) - Socket error.
                    console.error('SQL Connection Error: ', error);
                    throw error;
                });
            }
        });
    }
    static getInstance() {
        return SqlFactory.instance;
    }
    init(config) {
        return new Promise((resolve, reject) => {
            this._pool = new mssql.ConnectionPool(config, (error) => {
                return error ? reject(error) : resolve();
            });
        });
    }
    /** Executes query and returns the result as an array of objects */
    query(sqlStr, ...params) {
        return __awaiter(this, void 0, void 0, function* () {
            // : Promise<T> {
            // : Promise<mssql.IRecordSet<T>> {
            try {
                yield this.checkConnection();
                const request = new mssql.Request(this.pool);
                let paramType;
                params.forEach((p, ix) => {
                    switch (typeof p) {
                        case 'string':
                            paramType = mssql.NVarChar;
                            break;
                        case 'boolean':
                            paramType = mssql.Bit;
                            break;
                        case 'number':
                            if (Number.isInteger(p)) {
                                paramType = mssql.Int;
                            }
                            else {
                                paramType = mssql.Money;
                            }
                            break;
                        case 'object': {
                            if (p && Object.prototype.toString.call(p) === '[object Date]' && !isNaN(+p)) {
                                paramType = mssql.DateTime;
                                break;
                            }
                            else {
                                paramType = mssql.NVarChar;
                                break;
                            }
                        }
                        default:
                            paramType = mssql.NVarChar;
                            break;
                    }
                    request.input(`P${ix + 1}`, paramType, p);
                });
                try {
                    const resultSet = yield request.query(sqlStr);
                    return resultSet.recordset;
                }
                catch (error) {
                    // ETIMEOUT (RequestError) - Request timeout.
                    // EREQUEST (RequestError) - Message from SQL Server
                    // ECANCEL (RequestError) - Cancelled.
                    // ENOCONN (RequestError) - No connection is specified for that request.
                    // ENOTOPEN (ConnectionError) - Connection not yet open.
                    // ECONNCLOSED (ConnectionError) - Connection is closed.
                    // ENOTBEGUN (TransactionError) - Transaction has not begun.
                    // EABORT (TransactionError) - Transaction was aborted (by user or because of an error).
                    console.error('SQL Query Error: ', error);
                    throw error;
                }
            }
            catch (error) {
                console.error('SQL Execution Error: ', error);
                throw error;
            }
        });
    }
    /** Executes the query and returns the first record (object) or null if no records found */
    queryOne(sqlStr, ...params) {
        return __awaiter(this, void 0, void 0, function* () {
            const recordset = yield this.query(sqlStr, ...params);
            if (recordset.length) {
                return recordset[0];
            }
            else {
                return Promise.resolve(null);
            }
        });
    }
    /**
     * Executes the query and returns the first value of the first record
     * An error is thrown if no records found
     * Can be useful in cases like "SELECT COUNT (*) FROM Users" or "SELECT Name From Users WHERE id = @P1"
     */
    queryValue(sqlStr, ...params) {
        return __awaiter(this, void 0, void 0, function* () {
            const recordset = yield this.query(sqlStr, ...params);
            if (recordset.length && Object.keys(recordset[0]).length) {
                return recordset[0][Object.keys(recordset[0])[0]];
            }
            else {
                throw new Error(`Could not find the value in DB to return for query: "${sqlStr}" with params: "${params.join()}"`);
            }
        });
    }
    /** Executes an Insert query and returns the identity of the record inserted */
    insertReturnIdentity(sqlStr, ...params) {
        return __awaiter(this, void 0, void 0, function* () {
            sqlStr = `${sqlStr}; SELECT SCOPE_IDENTITY()`;
            const recordset = yield this.query(sqlStr, ...params);
            if (recordset.length === 1 && recordset[0].hasOwnProperty('')) {
                return recordset[0][''];
            }
            else {
                return null;
            }
        });
    }
}
exports.SqlFactory = SqlFactory;
SqlFactory.instance = new SqlFactory();
// export function sqlInit(config: SqlConfig) {
//     SqlFactory.getInstance().init(config);
// }
// export function sql(sqlStr: string, params: Array<string | number | boolean> = []): Promise<mssql.IRecordSet<any>> {
//     return SqlFactory.getInstance().runSql(sqlStr, ...params);
// }
// export function sqlClose(): void {
//     SqlFactory.getInstance().closeConnection();
// }
exports.sql = SqlFactory.getInstance();
//# sourceMappingURL=mssql.js.map