import * as nacl from 'tweetnacl';

const kp = nacl.sign.keyPair();
const publicKey = Buffer.from(kp.publicKey);
const secretKey = Buffer.from(kp.secretKey);

console.log('pub (hex):', publicKey.toString('hex'));
console.log('sec (hex):', secretKey.toString('hex'));