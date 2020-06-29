export interface SQLFunctions {
    insertObject: (tableName: string, data: {
        [key: string]: any;
    } | Array<{
        [key: string]: any;
    }>) => any;
}
export declare function sqlFunctions(sql: any): SQLFunctions;
