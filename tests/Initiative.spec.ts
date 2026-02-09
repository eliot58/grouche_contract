import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell, Address, StateInit, contractAddress } from '@ton/core';
import { Initiative } from '../build/Initiative/Initiative_Initiative';
import nacl from 'tweetnacl';
import '@ton/test-utils';

describe('Initiative', () => {
    let blockchain: Blockchain;
    let founder: SandboxContract<TreasuryContract>;
    let creator: SandboxContract<TreasuryContract>;

    let grcMinter: SandboxContract<TreasuryContract>;
    let notMinter: SandboxContract<TreasuryContract>;
    let usdtMinter: SandboxContract<TreasuryContract>;
    let pxMinter: SandboxContract<TreasuryContract>;
    let dogsMinter: SandboxContract<TreasuryContract>;

    let factory: SandboxContract<TreasuryContract>;
    let donator: SandboxContract<TreasuryContract>;

    let foundation: SandboxContract<Initiative>;
    let regular: SandboxContract<Initiative>;
    let keyPair: nacl.SignKeyPair;

    const jettonWalletCode =
        'b5ee9c7201021101000323000114ff00f4a413f4bcf2c80b0102016202030202cc0405001ba0f605da89a1f401f481f481a8610201d40607020120080900c30831c02497c138007434c0c05c6c2544d7c0fc03383e903e900c7e800c5c75c87e800c7e800c1cea6d0000b4c7e08403e29fa954882ea54c4d167c0278208405e3514654882ea58c511100fc02b80d60841657c1ef2ea4d67c02f817c12103fcbc2000113e910c1c2ebcb853600201200a0b0083d40106b90f6a2687d007d207d206a1802698fc1080bc6a28ca9105d41083deecbef09dd0958f97162e99f98fd001809d02811e428027d012c678b00e78b6664f6aa401f1503d33ffa00fa4021f001ed44d0fa00fa40fa40d4305136a1522ac705f2e2c128c2fff2e2c254344270542013541403c85004fa0258cf1601cf16ccc922c8cb0112f400f400cb00c920f9007074c8cb02ca07cbffc9d004fa40f40431fa0020d749c200f2e2c4778018c8cb055008cf1670fa0217cb6b13cc80c0201200d0e009e8210178d4519c8cb1f19cb3f5007fa0222cf165006cf1625fa025003cf16c95005cc2391729171e25008a813a08209c9c380a014bcf2e2c504c98040fb001023c85004fa0258cf1601cf16ccc9ed5402f73b51343e803e903e90350c0234cffe80145468017e903e9014d6f1c1551cdb5c150804d50500f214013e809633c58073c5b33248b232c044bd003d0032c0327e401c1d3232c0b281f2fff274140371c1472c7cb8b0c2be80146a2860822625a019ad822860822625a028062849e5c412440e0dd7c138c34975c2c0600f1000d73b51343e803e903e90350c01f4cffe803e900c145468549271c17cb8b049f0bffcb8b08160824c4b402805af3cb8b0e0841ef765f7b232c7c572cfd400fe8088b3c58073c5b25c60063232c14933c59c3e80b2dab33260103ec01004f214013e809633c58073c5b3327b552000705279a018a182107362d09cc8cb1f5230cb3f58fa025007cf165007cf16c9718010c8cb0524cf165006fa0215cb6a14ccc971fb0010241023007cc30023c200b08e218210d53276db708010c8cb055008cf165004fa0216cb6a12cb1f12cb3fc972fb0093356c21e203c85004fa0258cf1601cf16ccc9ed54';

    const initiativeId = 1n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3000000);

    function getJettonWalletInitData(
        owner: Address,
        minterAddress: Address,
        jettonWalletCode: Cell,
    ): Cell {
        return beginCell()
            .storeCoins(0n)
            .storeAddress(owner)
            .storeAddress(minterAddress)
            .storeRef(jettonWalletCode)
            .endCell();
    }

    function calculateJettonWalletAddress(
        owner: Address,
        jetton: { master: Address; code: Cell },
    ): Address {
        const initData = getJettonWalletInitData(owner, jetton.master, jetton.code);

        const stateInit: StateInit = {
            code: jetton.code,
            data: initData,
        };

        return contractAddress(0, stateInit);
    }

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        keyPair = nacl.sign.keyPair();
        founder = await blockchain.treasury('founder');
        creator = await blockchain.treasury('creator');
        grcMinter = await blockchain.treasury('grcMinter');
        notMinter = await blockchain.treasury('notMinter');
        usdtMinter = await blockchain.treasury('usdtMinter');
        pxMinter = await blockchain.treasury('pxMinter');
        dogsMinter = await blockchain.treasury('dogsMinter');
        factory = await blockchain.treasury('factory');

        donator = await blockchain.treasury('donator');

        const code = Cell.fromHex(jettonWalletCode);

        foundation = blockchain.openContract(
            await Initiative.fromInit({
                $$type: 'InitiativeInit',
                pub: BigInt('0x' + Buffer.from(keyPair.publicKey).toString('hex')),
                founder: founder.address,
                creator: creator.address,
                initiativeId,
                deadline,
                isRegular: false,
                grcMinterAddress: grcMinter.address,
                notMinterAddress: notMinter.address,
                usdtMinterAddress: usdtMinter.address,
                pxMinterAddress: pxMinter.address,
                dogsMinterAddress: dogsMinter.address,
                usdtJettonWalletCode: code,
                grcJettonWalletCode: code,
                notJettonWalletCode: code,
                pxJettonWalletCode: code,
                dogsJettonWalletCode: code,
            }),
        );
        await foundation.send(factory.getSender(), { value: toNano('0.5') }, null);

        regular = blockchain.openContract(
            await Initiative.fromInit({
                $$type: 'InitiativeInit',
                pub: BigInt('0x' + Buffer.from(keyPair.publicKey).toString('hex')),
                founder: founder.address,
                creator: creator.address,
                initiativeId,
                deadline,
                isRegular: true,
                grcMinterAddress: grcMinter.address,
                notMinterAddress: notMinter.address,
                usdtMinterAddress: usdtMinter.address,
                pxMinterAddress: pxMinter.address,
                dogsMinterAddress: dogsMinter.address,
                usdtJettonWalletCode: code,
                grcJettonWalletCode: code,
                notJettonWalletCode: code,
                pxJettonWalletCode: code,
                dogsJettonWalletCode: code,
            }),
        );
        await regular.send(factory.getSender(), { value: toNano('0.5') }, null);

        const minters = [grcMinter, usdtMinter, notMinter, pxMinter, dogsMinter];
        const participants = [foundation, regular, donator, founder, creator];
        for (const person of participants) {
            for (const minter of minters) {
                const initData = getJettonWalletInitData(person.address, minter.address, code);
                const jwAddress = contractAddress(0, { code: code, data: initData });

                const emptyData = beginCell()
                    .storeCoins(toNano('10000000'))
                    .storeAddress(person.address)
                    .storeAddress(minter.address)
                    .storeRef(code)
                    .endCell();

                await blockchain.setShardAccount(jwAddress, {
                    lastTransactionHash: 0n,
                    lastTransactionLt: 0n,
                    account: {
                        addr: jwAddress,
                        storageStats: { used: { cells: 5n, bits: 1024n }, lastPaid: 0, duePayment: null, storageExtra: null },
                        storage: {
                            lastTransLt: 0n,
                            balance: { coins: toNano('1') },
                            state: {
                                type: 'active',
                                state: { code: code, data: emptyData },
                            },
                        },
                    },
                });
            }
        }
    });

    it('should accept TON donation with valid signature', async () => {
        const donationAmount = toNano('5');
        const expiredAt = Math.floor(Date.now() / 1000) + 600;

        const signedData = beginCell()
            .storeUint(initiativeId, 32)
            .storeUint(expiredAt, 64)
            .storeAddress(donator.address)
            .endCell();

        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);

        const res = await regular.send(
            donator.getSender(),
            { value: donationAmount },
            {
                $$type: 'DonateTon',
                signature: Buffer.from(signature),
                signedData: signedData.beginParse(),
            }
        );

        expect(res.transactions).toHaveTransaction({
            from: donator.address,
            to: regular.address,
            success: true,
        });

        const contractBalance = await blockchain.getContract(regular.address).then(c => c.balance);
        expect(contractBalance).toBeGreaterThan(donationAmount - toNano('0.1'));
    });

    it('should fail DonateTon with wrong signature', async () => {
        const wrongKeyPair = nacl.sign.keyPair(); 

        const expiredAt = Math.floor(Date.now() / 1000) + 600;
        const signedData = beginCell()
            .storeUint(initiativeId, 32)
            .storeUint(expiredAt, 64)
            .storeAddress(donator.address)
            .endCell();

        const wrongSignature = nacl.sign.detached(signedData.hash(), wrongKeyPair.secretKey);

        const res = await regular.send(
            donator.getSender(),
            { value: toNano('1') },
            {
                $$type: 'DonateTon',
                signature: Buffer.from(wrongSignature),
                signedData: signedData.beginParse(),
            }
        );

        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: false,
            exitCode: 48401
        });
    });

    it('should fail DonateTon if beneficiary is not the sender', async () => {
        const expiredAt = Math.floor(Date.now() / 1000) + 600;
        
        const signedData = beginCell()
            .storeUint(initiativeId, 32)
            .storeUint(expiredAt, 64)
            .storeAddress(donator.address)
            .endCell();

        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);

        const res = await regular.send(
            creator.getSender(),
            { value: toNano('1') },
            {
                $$type: 'DonateTon',
                signature: Buffer.from(signature),
                signedData: signedData.beginParse(),
            }
        );

        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: false,
            exitCode: 9669
        });
    });

    it('should fail DonateTon if signature payload is expired', async () => {
        const donationAmount = toNano('1');
        
        const currentTime = blockchain.now ?? Math.floor(Date.now() / 1000);
        const expiredAt = currentTime - 60;

        const signedData = beginCell()
            .storeUint(initiativeId, 32)
            .storeUint(BigInt(expiredAt), 64)
            .storeAddress(donator.address)
            .endCell();

        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);

        const res = await regular.send(
            donator.getSender(),
            { value: donationAmount },
            {
                $$type: 'DonateTon',
                signature: Buffer.from(signature),
                signedData: signedData.beginParse(),
            }
        );

        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: false,
            exitCode: 26045
        });
    });

    it('should fail JettonNotification if payload is expired', async () => {
        const currentTime = blockchain.now ?? Math.floor(Date.now() / 1000);
        const expiredAt = currentTime - 60;
        const lockDays = 0;
    
        const signedData = beginCell()
            .storeUint(initiativeId, 32)
            .storeUint(BigInt(expiredAt), 64)
            .storeAddress(donator.address)
            .storeUint(lockDays, 16)
            .endCell();
    
        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);
    
        const forwardPayload = beginCell()
            .storeRef(beginCell()
                .storeBuffer(Buffer.from(signature))
                .storeSlice(signedData.beginParse())
                .endCell()
            ).endCell();
    
        const usdtWallet = calculateJettonWalletAddress(regular.address, { 
            master: usdtMinter.address, 
            code: Cell.fromHex(jettonWalletCode) 
        });
    
        const res = await regular.send(
            blockchain.sender(usdtWallet),
            { value: toNano('0.2') },
            {
                $$type: 'JettonNotification',
                queryId: 0n,
                amount: toNano('100'),
                sender: donator.address,
                forwardPayload: forwardPayload.beginParse()
            }
        );
    
        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: false,
            exitCode: 26045
        });
    });

    it('should fail JettonNotification if beneficiary is not the jetton sender', async () => {
        const expiredAt = Math.floor(Date.now() / 1000) + 1000;
        const lockDays = 0;
        
        const signedData = beginCell()
            .storeUint(initiativeId, 32)
            .storeUint(expiredAt, 64)
            .storeAddress(donator.address)
            .storeUint(lockDays, 16)
            .endCell();

        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);

        const forwardPayload = beginCell()
            .storeRef(beginCell()
                .storeBuffer(Buffer.from(signature))
                .storeSlice(signedData.beginParse())
                .endCell()
            ).endCell();

        const usdtWallet = calculateJettonWalletAddress(regular.address, { 
            master: usdtMinter.address, 
            code: Cell.fromHex(jettonWalletCode) 
        });

        const res = await regular.send(
            blockchain.sender(usdtWallet),
            { value: toNano('0.2') },
            {
                $$type: 'JettonNotification',
                queryId: 0n,
                amount: toNano('100'),
                sender: creator.address,
                forwardPayload: forwardPayload.beginParse()
            }
        );

        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: false,
            exitCode: 9669
        });
    });

    it('should fail JettonNotification with invalid signature', async () => {
        const wrongKeyPair = nacl.sign.keyPair();
        const expiredAt = Math.floor(Date.now() / 1000) + 1000;
        const lockDays = 0;
    
        const signedData = beginCell()
            .storeUint(initiativeId, 32)
            .storeUint(expiredAt, 64)
            .storeAddress(donator.address)
            .storeUint(lockDays, 16)
            .endCell();
    
        const wrongSignature = nacl.sign.detached(signedData.hash(), wrongKeyPair.secretKey);
    
        const forwardPayload = beginCell()
            .storeRef(beginCell()
                .storeBuffer(Buffer.from(wrongSignature))
                .storeSlice(signedData.beginParse())
                .endCell()
            ).endCell();
    
        const usdtWallet = calculateJettonWalletAddress(regular.address, { 
            master: usdtMinter.address, 
            code: Cell.fromHex(jettonWalletCode) 
        });
    
        const res = await regular.send(
            blockchain.sender(usdtWallet),
            { value: toNano('0.2') },
            {
                $$type: 'JettonNotification',
                queryId: 0n,
                amount: toNano('100'),
                sender: donator.address,
                forwardPayload: forwardPayload.beginParse()
            }
        );
    
        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: false,
            exitCode: 48401
        });
    });

    it('should deposit USDT and update state balance', async () => {
        const amount = toNano('100');
        const expiredAt = Math.floor(Date.now() / 1000) + 1000;
        const lockDays = 0;
    
        const signedData = beginCell()
            .storeUint(initiativeId, 32)
            .storeUint(expiredAt, 64)
            .storeAddress(donator.address)
            .storeUint(lockDays, 16)
            .endCell();
    
        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);
    
        const forwardPayload = beginCell()
            .storeRef(beginCell()
                .storeBuffer(Buffer.from(signature))
                .storeSlice(signedData.beginParse())
                .endCell()
            ).endCell();
    
        const usdtWallet = calculateJettonWalletAddress(regular.address, { master: usdtMinter.address, code: Cell.fromHex(jettonWalletCode) });
    
        const res = await regular.send(
            blockchain.sender(usdtWallet),
            { value: toNano('0.2') },
            {
                $$type: 'JettonNotification',
                queryId: 0n,
                amount,
                sender: donator.address,
                forwardPayload: forwardPayload.beginParse()
            }
        );
    
        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: true
        });
    
        const balances = await regular.getGetBalances();
        expect(balances.usdtAmount).toBe(amount);
    });

    it('should deposit GRC and update state balance', async () => {
        const amount = toNano('10000');
        const expiredAt = Math.floor(Date.now() / 1000) + 1000;
        const lockDays = 90;
    
        const signedData = beginCell()
            .storeUint(initiativeId, 32)
            .storeUint(expiredAt, 64)
            .storeAddress(donator.address)
            .storeUint(lockDays, 16)
            .endCell();
    
        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);
    
        const forwardPayload = beginCell()
            .storeRef(beginCell()
                .storeBuffer(Buffer.from(signature))
                .storeSlice(signedData.beginParse())
                .endCell()
            ).endCell();
    
        const grcWallet = calculateJettonWalletAddress(regular.address, { master: grcMinter.address, code: Cell.fromHex(jettonWalletCode) });
    
        const res = await regular.send(
            blockchain.sender(grcWallet),
            { value: toNano('0.2') },
            {
                $$type: 'JettonNotification',
                queryId: 0n,
                amount,
                sender: donator.address,
                forwardPayload: forwardPayload.beginParse()
            }
        );
    
        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: true
        });
    
        const balances = await regular.getGetBalances();
        expect(balances.grcAmount).toBe(amount * 80n / 100n);
    });

    it('should allow claiming GRC with valid nonce and signature', async () => {
        const amount = toNano('50');
        const nonce = 1001n;
        const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 1000);
    
        const signedData = beginCell()
            .storeUint(initiativeId, 32)
            .storeCoins(amount)
            .storeUint(nonce, 64)
            .storeUint(expiredAt, 64)
            .storeAddress(donator.address)
            .endCell();
    
        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);
    
        const res = await regular.send(
            donator.getSender(),
            { value: toNano('0.2') },
            {
                $$type: 'GrcClaim',
                signature: Buffer.from(signature),
                signedData: signedData.beginParse()
            }
        );
    
        expect(res.transactions).toHaveTransaction({
            from: regular.address,
            to: calculateJettonWalletAddress(regular.address, { master: grcMinter.address, code: Cell.fromHex(jettonWalletCode) }),
            success: true
        });
    });

    it('should fail GrcClaim with wrong signature', async () => {
        const wrongKeyPair = nacl.sign.keyPair(); 

        const amount = toNano('50');
        const nonce = 999n;
        const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 1000);

        const signedData = beginCell()
            .storeUint(initiativeId, 32)
            .storeCoins(amount)
            .storeUint(nonce, 64)
            .storeUint(expiredAt, 64)
            .storeAddress(donator.address)
            .endCell();

        const wrongSignature = nacl.sign.detached(signedData.hash(), wrongKeyPair.secretKey);

        const res = await regular.send(
            donator.getSender(),
            { value: toNano('0.2') },
            {
                $$type: 'GrcClaim',
                signature: Buffer.from(wrongSignature),
                signedData: signedData.beginParse()
            }
        );

        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: false,
            exitCode: 48401
        });
    });

    it('should fail if the same nonce is used twice', async () => {
        const amount = toNano('50');
        const nonce = 2002n;
        const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 1000);
    
        const signedData = beginCell()
            .storeUint(initiativeId, 32)
            .storeCoins(amount)
            .storeUint(nonce, 64)
            .storeUint(expiredAt, 64)
            .storeAddress(donator.address)
            .endCell();

        const signature = Buffer.from(nacl.sign.detached(signedData.hash(), keyPair.secretKey))
    
        const msg = { $$type: 'GrcClaim' as const, signedData: signedData.beginParse(), signature };
    
        await regular.send(donator.getSender(), { value: toNano('0.2') }, msg);
    
        const res = await regular.send(donator.getSender(), { value: toNano('0.2') }, msg);
        
        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: false,
            exitCode: 17091
        });
    });


    it('should fail FounderClaim if called before deadline', async () => {
        const res = await regular.send(
            founder.getSender(),
            { value: toNano('0.2') },
            {
                $$type: 'FounderClaim'
            }
        );

        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: false,
            exitCode: 22830
        });
    });

    it('should fail FounderClaim if sender is not the founder', async () => {
        blockchain.now = Number(deadline + 100n);
    
        const res = await regular.send(
            creator.getSender(),
            { value: toNano('0.2') },
            {
                $$type: 'FounderClaim'
            }
        );
    
        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: false,
            exitCode: 37172
        });
    });

    it('should successfully execute FounderClaim and send all balances to founder', async () => {
        const tonDonation = toNano('10');
        const expiredAtTon = Math.floor(Date.now() / 1000) + 600;
    
        const signedDataTon = beginCell()
            .storeUint(initiativeId, 32)
            .storeUint(expiredAtTon, 64)
            .storeAddress(donator.address)
            .endCell();
    
        const signatureTon = nacl.sign.detached(signedDataTon.hash(), keyPair.secretKey);
    
        let res = await regular.send(
            donator.getSender(),
            { value: tonDonation },
            {
                $$type: 'DonateTon',
                signature: Buffer.from(signatureTon),
                signedData: signedDataTon.beginParse(),
            }
        );
    
        expect(res.transactions).toHaveTransaction({
            from: donator.address,
            to: regular.address,
            success: true,
        });
    
        const usdtAmount = toNano('100');
        const expiredAtUsdt = Math.floor(Date.now() / 1000) + 1000;
        const lockDays = 0;
    
        const signedDataUsdt = beginCell()
            .storeUint(initiativeId, 32)
            .storeUint(expiredAtUsdt, 64)
            .storeAddress(donator.address)
            .storeUint(lockDays, 16)
            .endCell();
    
        const signatureUsdt = nacl.sign.detached(signedDataUsdt.hash(), keyPair.secretKey);
    
        const forwardPayload = beginCell()
            .storeRef(beginCell()
                .storeBuffer(Buffer.from(signatureUsdt))
                .storeSlice(signedDataUsdt.beginParse())
                .endCell()
            ).endCell();
    
        const usdtWallet = calculateJettonWalletAddress(regular.address, { 
            master: usdtMinter.address, 
            code: Cell.fromHex(jettonWalletCode) 
        });
    
        res = await regular.send(
            blockchain.sender(usdtWallet),
            { value: toNano('0.2') },
            {
                $$type: 'JettonNotification',
                queryId: 0n,
                amount: usdtAmount,
                sender: donator.address,
                forwardPayload: forwardPayload.beginParse()
            }
        );
    
        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: true
        });
    
        blockchain.now = Number(deadline + 100n);
    
        res = await regular.send(
            founder.getSender(),
            { value: toNano('0.5') },
            { $$type: 'FounderClaim' }
        );
    
        expect(res.transactions).toHaveTransaction({
            from: founder.address,
            to: regular.address,
            success: true,
        });
    
        expect(res.transactions).toHaveTransaction({
            from: regular.address,
            to: usdtWallet,
            success: true,
        });
    
        expect(res.transactions).toHaveTransaction({
            from: regular.address,
            to: founder.address,
            success: true,
            body: (x) => x!.beginParse().loadUint(32) === 0 && 
                         x!.beginParse().skip(32).loadStringTail() === "Escrow: Force claim by founder"
        });
    
        const finalBalances = await regular.getGetBalances();
        expect(finalBalances.usdtAmount).toBe(0n);
    });

    it('should fail CreatorClaim if isRegular is false', async () => {
        blockchain.now = Number(deadline + 100n);
        const signedData = beginCell()
            .storeUint(initiativeId, 32)
            .storeCoins(0n) // USDT
            .storeCoins(0n) // GRC
            .storeCoins(0n) // NOT
            .storeCoins(0n) // PX
            .storeCoins(0n) // DOGS
            .storeCoins(0n) // TON
            .endCell();

        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);

        const res = await foundation.send(
            creator.getSender(),
            { value: toNano('0.5') },
            {
                $$type: 'CreatorClaim',
                signature: Buffer.from(signature),
                signedData: signedData.beginParse()
            }
        );

        expect(res.transactions).toHaveTransaction({
            to: foundation.address,
            success: false,
            exitCode: 23428
        });
    });

    it('should successfully execute CreatorClaim with split logic', async () => {
        let currentRes; 
        const tonDonation = toNano('10');
        const expiredAtTon = Math.floor(Date.now() / 1000) + 600;
    
        const signedDataTon = beginCell()
            .storeUint(initiativeId, 32)
            .storeUint(expiredAtTon, 64)
            .storeAddress(donator.address)
            .endCell();
    
        const signatureTon = nacl.sign.detached(signedDataTon.hash(), keyPair.secretKey);
    
        currentRes = await regular.send(
            donator.getSender(),
            { value: tonDonation },
            {
                $$type: 'DonateTon',
                signature: Buffer.from(signatureTon),
                signedData: signedDataTon.beginParse(),
            }
        );
    
        const usdtAmount = toNano('100');
        const expiredAtUsdt = Math.floor(Date.now() / 1000) + 1000;
        
        const signedDataUsdt = beginCell()
            .storeUint(initiativeId, 32)
            .storeUint(expiredAtUsdt, 64)
            .storeAddress(donator.address)
            .storeUint(0, 16)
            .endCell();
    
        const signatureUsdt = nacl.sign.detached(signedDataUsdt.hash(), keyPair.secretKey);
    
        const forwardPayload = beginCell()
            .storeRef(beginCell()
                .storeBuffer(Buffer.from(signatureUsdt))
                .storeSlice(signedDataUsdt.beginParse())
                .endCell()
            ).endCell();
    
        const initiativeUsdtWallet = calculateJettonWalletAddress(regular.address, { 
            master: usdtMinter.address, 
            code: Cell.fromHex(jettonWalletCode) 
        });
    
        currentRes = await regular.send(
            blockchain.sender(initiativeUsdtWallet),
            { value: toNano('0.2') },
            {
                $$type: 'JettonNotification',
                queryId: 0n,
                amount: usdtAmount,
                sender: donator.address,
                forwardPayload: forwardPayload.beginParse()
            }
        );
    
        blockchain.now = Number(deadline) + 100;
    
        const limitUsdt = toNano('60');
        const limitTon = toNano('2');
    
        const signedDataClaim = beginCell()
            .storeUint(initiativeId, 32)
            .storeCoins(limitUsdt)
            .storeCoins(0n) // GRC
            .storeCoins(0n) // NOT
            .storeCoins(0n) // PX
            .storeCoins(0n) // DOGS
            .storeCoins(limitTon)
            .endCell();
    
        const signatureClaim = nacl.sign.detached(signedDataClaim.hash(), keyPair.secretKey);
    
        const claimRes = await regular.send(
            creator.getSender(),
            { value: toNano('1') },
            {
                $$type: 'CreatorClaim',
                signature: Buffer.from(signatureClaim),
                signedData: signedDataClaim.beginParse()
            }
        );
    
        expect(claimRes.transactions).toHaveTransaction({
            from: creator.address,
            to: regular.address,
            success: true
        });
    
        expect(claimRes.transactions).toHaveTransaction({
            from: regular.address,
            to: initiativeUsdtWallet,
            success: true,
        });
    
        expect(claimRes.transactions).toHaveTransaction({
            from: regular.address,
            to: creator.address,
            success: true,
            body: (x) => x!.beginParse().skip(32).loadStringTail() === "Escrow: Creator payout"
        });
    
        expect(claimRes.transactions).toHaveTransaction({
            from: regular.address,
            to: founder.address,
            success: true,
            body: (x) => x!.beginParse().skip(32).loadStringTail() === "Escrow: Founder remainder"
        });
    });
    
    it('should fail CreatorClaim if called twice', async () => {
        const signedData = beginCell()
            .storeUint(initiativeId, 32)
            .storeCoins(0n).storeCoins(0n).storeCoins(0n)
            .storeCoins(0n).storeCoins(0n).storeCoins(0n)
            .endCell();
        const signature = Buffer.from(nacl.sign.detached(signedData.hash(), keyPair.secretKey));
    
        const msg = {
            $$type: 'CreatorClaim' as const,
            signature,
            signedData: signedData.beginParse()
        };

        blockchain.now = Number(deadline) + 100;
    
        await regular.send(creator.getSender(), { value: toNano('1') }, msg);
        
        const res = await regular.send(creator.getSender(), { value: toNano('1') }, msg);
        
        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: false,
            exitCode: 42504
        });
    });
});