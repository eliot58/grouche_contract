import { Address, Cell, beginCell } from "@ton/core";
import { sign } from 'tweetnacl';

async function main() {
    const buf = Buffer.from("2b0d925d2e12b06c8dd684e9d16e2fa7084a6cb09eb32b94811d5c6fc988af8d8a541e5dc5e1bb2937efc7ace69a5a65ecc32eb547c2fe2184da6325a3c9ba97", 'hex');
    const secretKey = new Uint8Array(buf);

    const initiativeId = BigInt(1);
    const beneficiary = Address.parse("0QDrzUUbzwyGSjDzsp4EXCCy3wE--RNaGT6pen26HJB_5_w4");
    const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 120);

    const comment = null

    const signCell = (cell: Cell) => {
        const hash = cell.hash();
        const sig = sign.detached(hash, secretKey);
        return Buffer.from(sig);
    };

    const signedDataCell = beginCell()
        .storeUint(initiativeId, 32)
        .storeUint(expiredAt, 64)
        .storeAddress(beneficiary)
        .endCell();

    const sigBuf = signCell(signedDataCell);

    const body = beginCell()
        .storeUint(713126439, 32)
        .storeBuffer(sigBuf)
        .storeRef(signedDataCell)
        .storeMaybeStringRefTail(comment)
        .endCell();

    console.log(body.toBoc().toString('base64'))

}


main()