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
                const recordSet = await sql.q(`SELECT TOP(0) ${Object.keys(data[0]).join(', ')} FROM ${tableName}`);
                const table = recordSet.toTable(tableName);
                for (const record of data) {
                    table.rows.add(...Object.keys(record).map((key) => record[key]));
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
        async mergeValues(data, targetTable, { matchFields, insertFields, updateFields, deleteNotMatching }) {
            const t1 = Date.now();
            const columns = Object.keys(data[0]);
            // const table = new Table('table');
            // columns.forEach((c) => table.columns.add(c, JsTypeToSqlType(c)));
            // data.forEach((d) => table.rows.add(...Object.values(d)));
            const values = data.map((p) => {
                const val = [];
                for (const column of columns) {
                    const param = p[column];
                    let strParam = '';
                    switch (typeof param) {
                        case 'undefined':
                            strParam = '';
                            break;
                        case 'object':
                            if (param && Object.prototype.toString.call(param) === '[object Date]' && !isNaN(+param)) {
                                strParam = `'${param.toISOString()}'`;
                            }
                            else if (param === null) {
                                strParam = '';
                            }
                            else {
                                strParam = `N'${JSON.stringify(param)}'`;
                            }
                            break;
                        case 'string':
                            strParam = `N'${param}'`;
                            break;
                        case 'number':
                            strParam = +param;
                            break;
                        case 'boolean':
                            strParam = param ? 1 : 0;
                            break;
                    }
                    val.push(strParam);
                }
                return `(${val.join(',')})`;
            });
            const matchFieldsString = matchFields.map((f) => `T.${f} = S.${f}`).join(' AND ');
            const updateFieldsString = (updateFields !== null && updateFields !== void 0 ? updateFields : Object.keys(data[0]).filter((f) => matchFields.indexOf(f) === -1))
                .map((f) => `T.${f} = S.${f}`)
                .join(', ');
            const insertFieldsArray = insertFields !== null && insertFields !== void 0 ? insertFields : Object.keys(data[0]);
            const result = await sql.q(`
            MERGE ${targetTable} WITH (SERIALIZABLE) AS T
            USING (VALUES ${values.join(', ')}) AS S (${columns.join(', ')})
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
    };
}
exports.sqlFunctions = sqlFunctions;
//# sourceMappingURL=functions.js.map