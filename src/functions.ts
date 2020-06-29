export interface SQLFunctions {
    insertObject: (tableName: string, data: { [key: string]: any } | Array<{ [key: string]: any }>) => any;
}

export function sqlFunctions(sql: any): SQLFunctions {
    return {
        async insertObject(tableName, data) {
            if (!Array.isArray(data)) data = [data];
            for (const record of data as {
                [key: string]: any;
            }[]) {
                await sql.q(
                    `
            INSERT INTO ${tableName}
                (${Object.keys(record).join(',')})
            VALUES
            (${Object.keys(record).map((_, i) => `@P${i + 1}`)})
        `,
                    ...Object.keys(record).map((k) => record[k])
                );
            }
        },
    };
}
