import { Address, toNano, beginCell } from '@ton/core';
import { CreateGroucheSigned, GroucheFactory, SignedBundle } from '../build/Factory/Factory_GroucheFactory';
import { NetworkProvider } from '@ton/blueprint';
import * as nacl from 'tweetnacl';

function getEd25519SecretKeyFromHex(hex: string): Uint8Array {
  const buf = Buffer.from(hex.replace(/^0x/i, ''), 'hex');
  if (buf.length === 32) return nacl.sign.keyPair.fromSeed(buf).secretKey;
  if (buf.length === 64) return new Uint8Array(buf);
  throw new Error('AUTH_PRIVKEY_HEX must be 32-byte seed or 64-byte secretKey (hex).');
}

function getPublicKeyFromSecretKey(secretKey: Uint8Array): Uint8Array {
  return nacl.sign.keyPair.fromSecretKey(secretKey).publicKey;
}

export async function run(provider: NetworkProvider) {
  const FACTORY_ADDR = 'kQC3EfU7s6HgWy1WK071JkQbFmcXz9yHontFNFg49GNz_AE8';
  const AUTH_PRIVKEY_HEX = process.env.AUTH_PRIVKEY_HEX;
  if (!AUTH_PRIVKEY_HEX) throw new Error('Set AUTH_PRIVKEY_HEX');

  const secretKey = getEd25519SecretKeyFromHex(AUTH_PRIVKEY_HEX);
  const publicKey = getPublicKeyFromSecretKey(secretKey);
  const pubHex = Buffer.from(publicKey).toString('hex');
  const authorityPubKeyUint256 = BigInt('0x' + pubHex);

  console.log('[Keys]');
  console.log(' publicKey (hex):', pubHex);
  console.log(' authorityPubKey (uint256 to pass into FactoryInit):', '0x' + authorityPubKeyUint256.toString(16));

  const companyId = 1n;
  const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 600);

  const signedDataCell = beginCell()
    .storeUint(companyId, 64)
    .storeUint(expiredAt, 64)
    .endCell();

  const signedDataHash = signedDataCell.hash();
  const signature = nacl.sign.detached(signedDataHash, secretKey);

  const ok = nacl.sign.detached.verify(signedDataHash, signature, publicKey);
  if (!ok) throw new Error('Local signature verify FAILED — check keys/inputs');

  const bundle: SignedBundle = {
    $$type: 'SignedBundle',
    signature: Buffer.from(signature),
    signedData: signedDataCell.beginParse()
  };

  const body: CreateGroucheSigned = {
    $$type: 'CreateGroucheSigned',
    bundle,
    companyId,
    expiredAt,
  };

  const factory = provider.open(GroucheFactory.fromAddress(Address.parse(FACTORY_ADDR)));
  await factory.send(
    provider.sender(),
    { value: toNano('0.5') },
    body,
  );

  console.log('CreateGroucheSigned sent:', {
    companyId: companyId.toString(),
    expiredAt: expiredAt.toString(),
    factory: FACTORY_ADDR,
  });
}
