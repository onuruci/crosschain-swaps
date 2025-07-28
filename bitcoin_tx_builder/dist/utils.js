"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHash = getHash;
const crypto_1 = __importDefault(require("crypto"));
function getHash(secret) {
    return crypto_1.default.createHash('sha256').update(secret).digest();
}
