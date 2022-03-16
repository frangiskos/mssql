"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqlFunctions = void 0;
function sqlFunctions(sql) {
    return {
        async insertObject(tableName, data) {
            if (!Array.isArray(data))
                data = [data];
            for (const record of data) {
                await sql.q(`
            INSERT INTO ${tableName}
                (${Object.keys(record).join(',')})
            VALUES
            (${Object.keys(record).map((_, i) => `@P${i + 1}`)})
        `, ...Object.keys(record).map((k) => record[k]));
            }
        },
        async bulkInsert(tableName, data) {
            try {
                const t1 = Date.now();
                // We need to check if there are any objects with missing keys, and if so, add them with null values
                const keys = data
                    .reduce((acc, cur) => [...new Set(acc.concat(Object.keys(cur)))], [])
                    .sort();
                const nullObject = {};
                keys.forEach((k) => (nullObject[k] = null));
                const recordSet = await sql.q(`SELECT TOP(0) ${keys.join(', ')} FROM ${tableName}`);
                const table = recordSet.toTable(tableName);
                for (const record of data) {
                    table.rows.add(...Object.keys(Object.assign(Object.assign({}, nullObject), record))
                        .sort()
                        .map((key) => record[key]));
                }
                const request = new sql.request(sql.pool);
                return new Promise((resolve, reject) => {
                    request.bulk(table, (error, result) => {
                        if (error)
                            return reject(error);
                        const executionTime = Math.round(Date.now() - t1);
                        return resolve(Object.assign(Object.assign({}, result), { executionTime }));
                    });
                });
            }
            catch (error) {
                throw new Error(`Bulk import to ${tableName} failed. \n${error}`);
            }
        },
        async mergeTables(sourceTable, targetTable, { matchFields, insertFields, updateFields, deleteNotMatching }) {
            const t1 = Date.now();
            const recordSet = await sql.q(`SELECT TOP(0) * FROM ${sourceTable}`);
            const columns = Object.keys(recordSet.columns);
            const matchFieldsString = matchFields.map((f) => `T.${f} = S.${f}`).join(' AND ');
            const updateFieldsString = (updateFields !== null && updateFields !== void 0 ? updateFields : columns.filter((f) => matchFields.indexOf(f) === -1))
                .map((f) => `T.${f} = S.${f}`)
                .join(', ');
            const insertFieldsArray = insertFields !== null && insertFields !== void 0 ? insertFields : [...columns];
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
            const res = result.reduce((pv, cv) => {
                pv[cv.Action]++;
                return pv;
            }, { INSERT: 0, UPDATE: 0, DELETE: 0, executionTime });
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
            return Object.assign(Object.assign({}, mergeResult), { executionTime: executionTime + bulkResult.executionTime, insertExecutionTime: bulkResult.executionTime, mergeExecutionTime: executionTime });
        },
    };
}
exports.sqlFunctions = sqlFunctions;
//# sourceMappingURL=functions.js.map