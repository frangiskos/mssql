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
    };
}
exports.sqlFunctions = sqlFunctions;
//# sourceMappingURL=functions.js.map