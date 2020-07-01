"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
function sqlFunctions(sql) {
    return {
        insertObject(tableName, data) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!Array.isArray(data))
                    data = [data];
                for (const record of data) {
                    yield sql.q(`
            INSERT INTO ${tableName}
                (${Object.keys(record).join(',')})
            VALUES
            (${Object.keys(record).map((_, i) => `@P${i + 1}`)})
        `, ...Object.keys(record).map((k) => record[k]));
                }
            });
        },
        bulkInsert(tableName, data) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const recordSet = yield sql.q(`SELECT TOP(0) ${Object.keys(data[0]).join(', ')} FROM ${tableName}`);
                    const table = recordSet.toTable(tableName);
                    for (const record of data) {
                        table.rows.add(...Object.keys(record).map((key) => record[key]));
                    }
                    const request = new sql.request(sql.pool);
                    const t1 = Date.now();
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
            });
        },
    };
}
exports.sqlFunctions = sqlFunctions;
//# sourceMappingURL=functions.js.map