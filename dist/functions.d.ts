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
    /** Merges data from one SQL table in another SQL table */
    mergeTables: (sourceTable: string, targetTable: string, mergeFields: {
        matchFields: string[];
        /** fields to insert when not match. Skip to insert all fields in source table */
        insertFields?: string[];
        /** fields to update when match. Skip to update all fields in source table */
        updateFields?: string[];
        /** if sets to TRUE it deletes any records in the destination table that are not matched with source */
        deleteNotMatching?: boolean;
    }) => Promise<{
        INSERT: number;
        UPDATE: number;
        DELETE: number;
        executionTime: number;
    }>;
    /** !WARNING! Use this function only with data from trusted data sources. This function does not guarantee safety from SQL injection attacks. Merge data from a js object in an SQL table */
    mergeValues: (data: Array<{
        [key: string]: string | number | boolean | object | Date | null | undefined;
    }>, targetTable: string, mergeFields: {
        matchFields: string[];
        /** fields to insert when not match. Skip to insert all fields */
        insertFields?: string[];
        /** fields to update when match. Skip to update all fields */
        updateFields?: string[];
        /** if sets to TRUE it deletes any records in the destination table that are not matched with source */
        deleteNotMatching?: boolean;
    }) => Promise<{
        INSERT: number;
        UPDATE: number;
        DELETE: number;
        executionTime: number;
    }>;
}
export declare function sqlFunctions(sql: SqlFactory): SQLFunctions;
