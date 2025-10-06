"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var nacl = require("tweetnacl");
var kp = nacl.sign.keyPair();
var publicKey = Buffer.from(kp.publicKey);
var secretKey = Buffer.from(kp.secretKey);
console.log('pub (hex):', publicKey.toString('hex'));
console.log('sec (hex):', secretKey.toString('hex'));
