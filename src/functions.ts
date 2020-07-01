import { SqlFactory } from './mssql';

export interface SQLFunctions {
    insertObject: (tableName: string, data: { [key: string]: any } | Array<{ [key: string]: any }>) => any;
    bulkInsert: (
        tableName: string,
        data: Array<{ [key: string]: any }>
    ) => Promise<{ executionTime: number; rowsAffected: number }>;
}

export function sqlFunctions(sql: SqlFactory): SQLFunctions {
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
        async bulkInsert(tableName, data) {
            const recordSet = await sql.q(`SELECT TOP(0) * FROM ${tableName}`);
            const table = recordSet.toTable(tableName);
            const tblCols = {};
            table.columns.forEach((c) => (tblCols[c.name] = undefined));
            // data = data.map((d) => ({ ...tblCols, ...d }));
            console.log(data[0], data[1]);

            // for (const col of table.columns) {
            //     console.log(col.name);
            //     console.log(Object.keys(data));
            //     // if (Object.keys(data).indexOf(col.name) === -1) {
            //     //     table.columns.splice(table.columns.indexOf(col));
            //     // }
            // }
            // table.columns = table.columns.filter((col) => Object.keys(data).indexOf(col.name) !== -1);
            // console.log(table);

            for (const record of data) {
                table.rows.add(...Object.keys(record).map((key) => record[key]));
            }

            const request = new sql.request(sql.pool);
            const t1 = Date.now();
            return new Promise((resolve, reject) => {
                request.bulk(table, (error, result) => {
                    if (error) return reject(error);
                    const executionTime = Math.round(Date.now() - t1);
                    return resolve({ ...result, executionTime });
                });
            });
        },
    };
}
