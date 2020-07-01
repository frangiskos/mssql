import * as mssql from 'mssql';
import { sqlFunctions, SQLFunctions } from './functions';

export type ParamType = string | number | boolean | Date;

export class SqlFactory {
    private static instance: SqlFactory = new SqlFactory();
    private readonly connectionTimeout = 30000;
    private _pool: mssql.ConnectionPool | undefined;

    private timerReset = () => {
        clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(this.close, this.connectionTimeout);
    };
    private idleTimer: any;

    public get pool() {
        if (!this._pool) throw new Error('SQL not initialized. Use sql.init(config) first');
        return this._pool;
    }

    public get request() {
        return mssql.Request;
    }

    private constructor() {
        if (SqlFactory.instance) throw new Error('Instantiation failed. Use .getInstance() instead of new.');
        SqlFactory.instance = this;
        this.functions = sqlFunctions(this);
    }

    private async checkConnection() {
        // // Already connected
        if (this.pool.connected) {
            this.timerReset();

            // // Wait for connection
        } else if (this.pool.connecting) {
            // wait up to 10 sec to connect or reject
            await new Promise((resolve, reject) => {
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
        } else {
            this.idleTimer = setTimeout(this.close, this.connectionTimeout);
            await this.pool.connect().catch((error) => {
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
    }

    public functions: SQLFunctions;

    public static getInstance(): SqlFactory {
        return SqlFactory.instance;
    }

    public init(config: mssql.config) {
        return new Promise((resolve, reject) => {
            this._pool = new mssql.ConnectionPool(config, (error) => {
                return error ? reject(error) : resolve();
            });
        });
    }

    public close = async () => {
        this.idleTimer && clearTimeout(this.idleTimer);
        this._pool && (await this._pool.close());
    };

    /** Executes query and returns the result as an array of objects */
    public async query<T extends any = any>(sqlStr: string, ...params: Array<ParamType>): Promise<mssql.IRecordSet<T>> {
        // : Promise<T> {
        // : Promise<mssql.IRecordSet<T>> {
        try {
            await this.checkConnection();

            const request = new mssql.Request(this.pool);

            let paramType:
                | mssql.ISqlTypeFactoryWithNoParams
                | mssql.ISqlTypeFactoryWithLength
                | mssql.ISqlTypeFactoryWithPrecisionScale;

            params.forEach((p, ix) => {
                switch (typeof p) {
                    case 'string':
                        paramType = mssql.NVarChar;
                        break;
                    case 'boolean':
                        paramType = mssql.Bit;
                        break;
                    case 'number':
                        if (Number.isInteger(p as number)) {
                            paramType = mssql.Int;
                        } else {
                            paramType = mssql.Money;
                        }
                        break;
                    case 'object': {
                        if (p && Object.prototype.toString.call(p) === '[object Date]' && !isNaN(+p)) {
                            paramType = mssql.DateTime;
                            break;
                        } else {
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
                const resultSet = await request.query(sqlStr);
                return resultSet.recordset;
            } catch (error) {
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
        } catch (error) {
            console.error('SQL Execution Error: ', error);
            throw error;
        }
    }

    /** Executes the query and returns the first record (object) or null if no records found */
    public async queryOne<T extends {} = any>(sqlStr: string, ...params: Array<ParamType>): Promise<T | null> {
        const recordset = await this.query<T>(sqlStr, ...params);
        if (recordset.length) {
            return recordset[0];
        } else {
            return Promise.resolve(null);
        }
    }

    /**
     * Executes the query and returns the first value of the first record
     * An error is thrown if no records found
     * Can be useful in cases like "SELECT COUNT (*) FROM Users" or "SELECT Name From Users WHERE id = @P1"
     */
    public async queryValue<T extends ParamType | null = any>(sqlStr: string, ...params: Array<ParamType>): Promise<T> {
        const recordset = await this.query(sqlStr, ...params);

        if (recordset.length && Object.keys(recordset[0]).length) {
            return recordset[0][Object.keys(recordset[0])[0]];
        } else {
            throw new Error(
                `Could not find the value in DB to return for query: "${sqlStr}" with params: "${params.join()}"`
            );
        }
    }

    /** Executes an Insert query and returns the identity of the record inserted */
    public async insertReturnIdentity(sqlStr: string, ...params: Array<ParamType>): Promise<number | null> {
        sqlStr = `${sqlStr}; SELECT SCOPE_IDENTITY()`;
        const recordset = await this.query(sqlStr, ...params);
        if (recordset.length === 1 && recordset[0].hasOwnProperty('')) {
            return recordset[0][''];
        } else {
            return null;
        }
    }

    /** Alias to query */
    public q = this.query;

    /** Alias to queryOne */
    public q1 = this.queryOne;

    /** Alias to queryValue */
    public qv = this.queryValue;

    /** Alias to insertReturnIdentity */
    public ii = this.insertReturnIdentity;
}

export interface SqlConfig extends mssql.config {}

// export function sqlInit(config: SqlConfig) {
//     SqlFactory.getInstance().init(config);
// }

// export function sql(sqlStr: string, params: Array<string | number | boolean> = []): Promise<mssql.IRecordSet<any>> {
//     return SqlFactory.getInstance().runSql(sqlStr, ...params);
// }

// export function sqlClose(): void {
//     SqlFactory.getInstance().closeConnection();
// }

export const sql = SqlFactory.getInstance();
