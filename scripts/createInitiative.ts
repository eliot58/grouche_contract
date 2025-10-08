import { Address, toNano, beginCell } from '@ton/core';
import { CreateInitiative, Factory } from '../build/Factory/Factory_Factory';
import { NetworkProvider } from '@ton/blueprint';
import * as nacl from 'tweetnacl';

function getEd25519SecretKeyFromHex(hex: string): Uint8Array {
  const buf = Buffer.from(hex.replace(/^0x/i, ''), 'hex');
  if (buf.length === 32) return nacl.sign.keyPair.fromSeed(buf).secretKey;
  if (buf.length === 64) return new Uint8Array(buf);
  throw new Error('AUTH_PRIVKEY_HEX must be 32-byte seed or 64-byte secretKey (hex).');
}

export async function run(provider: NetworkProvider) {
  const FACTORY_ADDR = 'kQBBvvinu907M0zZ_2dqG6s6KoFqfw0lLo8Afvs6R2xEnFFY';
  const AUTH_PRIVKEY_HEX = process.env.AUTH_PRIVKEY_HEX;
  if (!AUTH_PRIVKEY_HEX) throw new Error('Set AUTH_PRIVKEY_HEX');

  const secretKey = getEd25519SecretKeyFromHex(AUTH_PRIVKEY_HEX);

  const initiativeId = 1n;
  const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 600);
  const isRegular = false;

  const signedDataCell = beginCell()
    .storeUint(initiativeId, 64)
    .storeUint(isRegular ? 1 : 0, 1)
    .storeUint(expiredAt, 64)
    .endCell();

  const signedDataHash = signedDataCell.hash();
  const sigBytes = nacl.sign.detached(signedDataHash, secretKey);
  const sigBuf = Buffer.from(sigBytes);

  if (sigBuf.length !== 64) throw new Error('Signature must be 64 bytes');

  const body: CreateInitiative = {
    $$type: 'CreateInitiative',
    signature: sigBuf,
    signedData: signedDataCell.beginParse()
  };

  const factory = provider.open(Factory.fromAddress(Address.parse(FACTORY_ADDR)));
  await factory.send(
    provider.sender(),
    { value: toNano('1') },
    body,
  );

  console.log('CreateInitiative sent:', {
    initiativeId: initiativeId.toString(),
    isRegular,
    expiredAt: expiredAt.toString(),
    factory: FACTORY_ADDR,
  });
}
