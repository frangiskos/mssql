import { SqlFactory } from './mssql';
export interface SQLFunctions {
    insertObject: (tableName: string, data: {
        [key: string]: any;
    } | Array<{
        [key: string]: any;
    }>) => any;
    bulkInsert: (tableName: string, data: Array<{
        [key: string]: any;
    }>) => Promise<{
        executionTime: number;
        rowsAffected: number;
    }>;
}
export declare function sqlFunctions(sql: SqlFactory): SQLFunctions;
