import { SqlFactory } from './mssql';

export interface SQLFunctions {
    insertObject: (tableName: string, data: { [key: string]: any } | Array<{ [key: string]: any }>) => any;
    bulkInsert: (
        tableName: string,
        data: Array<{ [key: string]: any }>
    ) => Promise<{ executionTime: number; rowsAffected: number }>;
    /** Merges data from one SQL table in another SQL table */
    mergeTables: (
        sourceTable: string,
        targetTable: string,
        mergeFields: {
            matchFields: string[];
            /** fields to insert when not match. Skip to insert all fields in source table */
            insertFields?: string[];
            /** fields to update when match. Skip to update all fields in source table */
            updateFields?: string[];
            /** if sets to TRUE it deletes any records in the destination table that are not matched with source */
            deleteNotMatching?: boolean;
        }
    ) => Promise<{ INSERT: number; UPDATE: number; DELETE: number; executionTime: number }>;
    /** !WARNING! Use this function only with data from trusted data sources. This function does not guarantee safety from SQL injection attacks. Merge data from a js object in an SQL table */
    mergeValues: (
        data: Array<{ [key: string]: string | number | boolean | object | Date | null | undefined }>,
        targetTable: string,
        mergeFields: {
            matchFields: string[];
            /** fields to insert when not match. Skip to insert all fields */
            insertFields?: string[];
            /** fields to update when match. Skip to update all fields */
            updateFields?: string[];
            /** if sets to TRUE it deletes any records in the destination table that are not matched with source */
            deleteNotMatching?: boolean;
            /** if sets to TRUE it will keep the temp table `tmp_merge_${targetTable}` that is created on bulk data insert */
            keepTmpTable?: boolean;
        }
    ) => Promise<{ INSERT: number; UPDATE: number; DELETE: number; executionTime: number }>;
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
            try {
                const t1 = Date.now();

                // We need to check if there are any objects with missing keys, and if so, add them with null values
                const keys: string[] = data
                    .reduce((acc, cur) => [...new Set(acc.concat(Object.keys(cur)))], [] as string[])
                    .sort();
                const nullObject = {} as { [key: string]: null };
                keys.forEach((k) => (nullObject[k] = null));

                const recordSet = await sql.q(`SELECT TOP(0) ${keys.join(', ')} FROM ${tableName}`);
                const table = recordSet.toTable(tableName);
                for (const record of data) {
                    table.rows.add(
                        ...Object.keys({ ...nullObject, ...record })
                            .sort()
                            .map((key) => record[key])
                    );
                }
                const request = new sql.request(sql.pool);
                return new Promise((resolve, reject) => {
                    request.bulk(table, (error, result) => {
                        if (error) return reject(error);
                        const executionTime = Math.round(Date.now() - t1);
                        return resolve({ ...result, executionTime });
                    });
                });
            } catch (error) {
                throw new Error(`Bulk import to ${tableName} failed. \n${error}`);
            }
        },
        async mergeTables(sourceTable, targetTable, { matchFields, insertFields, updateFields, deleteNotMatching }) {
            const t1 = Date.now();

            const recordSet = await sql.q(`SELECT TOP(0) * FROM ${sourceTable}`);
            const columns = Object.keys(recordSet.columns);

            const matchFieldsString = matchFields.map((f) => `T.${f} = S.${f}`).join(' AND ');
            const updateFieldsString = (updateFields ?? columns.filter((f) => matchFields.indexOf(f) === -1))
                .map((f) => `T.${f} = S.${f}`)
                .join(', ');
            const insertFieldsArray = insertFields ?? [...columns];

            const result = await sql.q(`
            MERGE ${targetTable} WITH (SERIALIZABLE) AS T
            USING ${sourceTable} AS S
                ON ${matchFieldsString}
            WHEN MATCHED THEN
                UPDATE SET ${updateFieldsString}
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (${insertFieldsArray.join(', ')})
                VALUES (${insertFieldsArray.map((f) => `S.${f}`).join(', ')})
            ${deleteNotMatching ? 'WHEN NOT MATCHED BY Source THEN DELETE' : ''}
            OUTPUT DELETED.*, $action AS [Action], INSERTED.* ;
                `);
            const executionTime = Math.round(Date.now() - t1);

            const res = result.reduce(
                (pv, cv) => {
                    pv[cv.Action]++;
                    return pv;
                },
                { INSERT: 0, UPDATE: 0, DELETE: 0, executionTime }
            );

            return res;
        },
        async mergeValues(data, targetTable, options) {
            const tmpTable = `tmp_merge_${targetTable}`;
            const deleteTmpTableIfExist = `
            IF OBJECT_ID(N'${tmpTable}') IS NOT NULL
            BEGIN
            DROP TABLE ${tmpTable}
            END
            `;
            const createTmpTable = `SELECT top(0) * INTO ${tmpTable} FROM ${targetTable}`;
            await sql.q(deleteTmpTableIfExist);
            await sql.q(createTmpTable);

            const bulkResult = await this.bulkInsert(tmpTable, data);

            const t1 = Date.now();
            const mergeResult = await this.mergeTables(tmpTable, targetTable, options);
            const executionTime = Math.round(Date.now() - t1);

            if (!options.keepTmpTable) {
                await sql.q(deleteTmpTableIfExist);
            }

            return {
                ...mergeResult,
                executionTime: executionTime + bulkResult.executionTime,
                insertExecutionTime: bulkResult.executionTime,
                mergeExecutionTime: executionTime,
            };
        },
    };
}
