"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mssql = require("mssql");
class SqlFactory {
    constructor() {
        this.connectionTimeout = 30000;
        this.timerReset = () => {
            clearTimeout(this.idleTimer);
            this.idleTimer = setTimeout(this.close, this.connectionTimeout);
        };
        this.close = () => {
            if (this.pool)
                this.pool.close();
        };
        /** Alias to query */
        this.q = this.query;
        /** Alias to queryOne */
        this.q1 = this.queryOne;
        /** Alias to insertReturnIdentity */
        this.ii = this.insertReturnIdentity;
        if (SqlFactory.instance)
            throw new Error('Instantiation failed. Use .getInstance() instead of new.');
        SqlFactory.instance = this;
    }
    static getInstance() {
        return SqlFactory.instance;
    }
    init(config) {
        this.pool = new mssql.ConnectionPool(config);
    }
    /** Executes query and returns the result */
    query(sqlStr, ...params) {
        try {
            return Promise.resolve()
                .then(_ => {
                if (!this.pool) {
                    throw 'SQL not initialized. Use sql.init(config) first';
                }
                else if (this.pool.connected) {
                    this.timerReset();
                    return this.pool;
                }
                else if (this.pool.connecting) {
                    // wait up to 10 sec to connect
                    return new Promise((resolve, reject) => {
                        const handler = () => {
                            if (this.pool && this.pool.connected) {
                                clearInterval(waiting);
                                this.timerReset();
                                return resolve(this.pool);
                            }
                        };
                        const waiting = setInterval(handler, 100);
                        setTimeout(() => {
                            reject('Is taking too long to connect to database');
                        }, 10000);
                    });
                }
                else {
                    this.idleTimer = setTimeout(this.close, this.connectionTimeout);
                    return this.pool.connect().catch(error => {
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
            })
                .then(_ => new mssql.Request(this.pool))
                .then(request => {
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
                        default:
                            paramType = mssql.NVarChar;
                            break;
                    }
                    request.input(`P${ix + 1}`, paramType, p);
                });
                const resultSet = request.query(sqlStr);
                return resultSet;
            })
                .then(resultSet => resultSet.recordset)
                .catch(error => {
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
            });
        }
        catch (error) {
            console.error('SQL Execution Error: ', error);
            throw error;
        }
    }
    // Executes the query and returns the first record
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
    // Executes an Insert query and returns the identity of the record inserted
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
SqlFactory.instance = new SqlFactory();
exports.SqlFactory = SqlFactory;
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