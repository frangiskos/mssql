import * as mssql from 'mssql';
import { SQLFunctions } from './functions';
declare type ParamType = string | number | boolean | Date;
export declare class SqlFactory {
    private static instance;
    private readonly connectionTimeout;
    private pool;
    private timerReset;
    private idleTimer;
    private constructor();
    private checkConnection;
    functions: SQLFunctions;
    static getInstance(): SqlFactory;
    init(config: mssql.config): Promise<unknown>;
    close: () => Promise<void>;
    /** Executes query and returns the result as an array of objects */
    query<T extends any = any>(sqlStr: string, ...params: Array<ParamType>): Promise<mssql.IRecordSet<T>>;
    /** Executes the query and returns the first record (object) or null if no records found */
    queryOne<T extends {} = any>(sqlStr: string, ...params: Array<ParamType>): Promise<T | null>;
    /**
     * Executes the query and returns the first value of the first record
     * An error is thrown if no records found
     * Can be useful in cases like "SELECT COUNT (*) FROM Users" or "SELECT Name From Users WHERE id = @P1"
     */
    queryValue<T extends ParamType | null = any>(sqlStr: string, ...params: Array<ParamType>): Promise<T>;
    /** Executes an Insert query and returns the identity of the record inserted */
    insertReturnIdentity(sqlStr: string, ...params: Array<ParamType>): Promise<number | null>;
    /** Alias to query */
    q: <T extends any = any>(sqlStr: string, ...params: ParamType[]) => Promise<mssql.IRecordSet<T>>;
    /** Alias to queryOne */
    q1: <T extends {} = any>(sqlStr: string, ...params: ParamType[]) => Promise<T | null>;
    /** Alias to queryValue */
    qv: <T extends string | number | boolean | Date | null = any>(sqlStr: string, ...params: ParamType[]) => Promise<T>;
    /** Alias to insertReturnIdentity */
    ii: (sqlStr: string, ...params: ParamType[]) => Promise<number | null>;
}
export interface SqlConfig extends mssql.config {
}
export declare const sql: SqlFactory;
export {};
