import { Address, beginCell } from "@ton/core";
import { sign } from 'tweetnacl';
import { CreateInitiative, storeCreateInitiative } from "./build/Factory/Factory_Factory";

async function main() {
    const buf = Buffer.from("2b0d925d2e12b06c8dd684e9d16e2fa7084a6cb09eb32b94811d5c6fc988af8d8a541e5dc5e1bb2937efc7ace69a5a65ecc32eb547c2fe2184da6325a3c9ba97", 'hex');
    const secretKey = new Uint8Array(buf);

    const initiativeId = BigInt(1);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
    const isRegular = false;
    const beneficiary = Address.parse("0QDrzUUbzwyGSjDzsp4EXCCy3wE--RNaGT6pen26HJB_5_w4");
    const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 120);

    const signedDataCell = beginCell()
        .storeUint(initiativeId, 32)
        .storeBit(isRegular)
        .storeUint(deadline, 64)
        .storeAddress(beneficiary)
        .storeUint(expiredAt, 64)
        .endCell();

    const signedDataHash = signedDataCell.hash();
    const sigBytes = sign.detached(signedDataHash, secretKey);
    const sigBuf = Buffer.from(sigBytes);

    const body: CreateInitiative = {
        $$type: 'CreateInitiative',
        signature: sigBuf,
        signedData: signedDataCell.beginParse()
    };

    console.log(beginCell().store(storeCreateInitiative(body)).endCell().toBoc().toString('base64'))
}


main()