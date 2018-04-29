import * as mssql from 'mssql';
export declare class SqlFactory {
    private static instance;
    readonly connectionTimeout: number;
    private pool;
    private timerReset;
    private idleTimer;
    private constructor();
    static getInstance(): SqlFactory;
    init(config: mssql.config): void;
    close: () => void;
    /** Executes query and returns the result */
    query(sqlStr: string, ...params: Array<string | number | boolean>): Promise<mssql.IRecordSet<any>>;
    queryOne(sqlStr: string, ...params: Array<string | number | boolean>): Promise<any>;
    insertReturnIdentity(sqlStr: string, ...params: Array<string | number | boolean>): Promise<number | null>;
    /** Alias to query */
    q: (sqlStr: string, ...params: (string | number | boolean)[]) => Promise<mssql.IRecordSet<any>>;
    /** Alias to queryOne */
    q1: (sqlStr: string, ...params: (string | number | boolean)[]) => Promise<any>;
    /** Alias to insertReturnIdentity */
    ii: (sqlStr: string, ...params: (string | number | boolean)[]) => Promise<number | null>;
}
export interface SqlConfig extends mssql.config {
}
export declare const sql: SqlFactory;
