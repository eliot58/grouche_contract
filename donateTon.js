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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@ton/core");
var tweetnacl_1 = require("tweetnacl");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var buf, secretKey, initiativeId, beneficiary, expiredAt, comment, signCell, signedDataCell, sigBuf, body;
        return __generator(this, function (_a) {
            buf = Buffer.from("bf64785d78e58360419ee399da57c91d386d8d083d0f5ff73710a1b1236b152b1c25e8dba165824681b06e05b0a7627cfeb56dcce5c3baeb0f1c8bae67deadcd", 'hex');
            secretKey = new Uint8Array(buf);
            initiativeId = BigInt(1);
            beneficiary = core_1.Address.parse("0QDrzUUbzwyGSjDzsp4EXCCy3wE--RNaGT6pen26HJB_5_w4");
            expiredAt = BigInt(Math.floor(Date.now() / 1000) + 120);
            comment = null;
            signCell = function (cell) {
                var hash = cell.hash();
                var sig = tweetnacl_1.sign.detached(hash, secretKey);
                return Buffer.from(sig);
            };
            signedDataCell = (0, core_1.beginCell)()
                .storeUint(initiativeId, 32)
                .storeUint(expiredAt, 64)
                .storeAddress(beneficiary)
                .endCell();
            sigBuf = signCell(signedDataCell);
            body = (0, core_1.beginCell)()
                .storeUint(713126439, 32)
                .storeBuffer(sigBuf)
                .storeRef(signedDataCell)
                .storeMaybeStringRefTail(comment)
                .endCell();
            console.log(body.toBoc().toString('base64'));
            return [2 /*return*/];
        });
    });
}
main();
