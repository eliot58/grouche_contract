import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell, Address, StateInit, contractAddress, Dictionary } from '@ton/core';
import { Initiative } from '../build/Initiative/Initiative_Initiative';
import nacl from 'tweetnacl';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

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

    let jwallet_code_raw = new Cell();
    let jwallet_code = new Cell();     

    const GRC_WALLET_CODE = Cell.fromHex( 'b5ee9c7201021201000328000114ff00f4a413f4bcf2c80b0102016202030202cc0405001ba0f605da89a1f401f481f481a8610201d40607020148080900bb0831c02497c138007434c0c05c6c2544d7c0fc02f83e903e900c7e800c5c75c87e800c7e800c00b4c7e08403e29fa954882ea54c4d167c0238208405e3514654882ea58c511100fc02780d60841657c1ef2ea4d67c02b817c12103fcbc2000113e910c1c2ebcb853600201200a0b020120101101f500f4cffe803e90087c007b51343e803e903e90350c144da8548ab1c17cb8b04a30bffcb8b0950d109c150804d50500f214013e809633c58073c5b33248b232c044bd003d0032c032483e401c1d3232c0b281f2fff274013e903d010c7e801de0063232c1540233c59c3e8085f2dac4f3208405e351467232c7c6600c03f73b51343e803e903e90350c0234cffe80145468017e903e9014d6f1c1551cdb5c150804d50500f214013e809633c58073c5b33248b232c044bd003d0032c0327e401c1d3232c0b281f2fff274140371c1472c7cb8b0c2be80146a2860822625a020822625a004ad822860822625a028062849f8c3c975c2c070c008e00d0e0f009acb3f5007fa0222cf165006cf1625fa025003cf16c95005cc2391729171e25008a813a08208989680aa008208989680a0a014bcf2e2c504c98040fb001023c85004fa0258cf1601cf16ccc9ed5400705279a018a182107362d09cc8cb1f5230cb3f58fa025007cf165007cf16c9718018c8cb0524cf165006fa0215cb6a14ccc971fb0010241023000e10491038375f040076c200b08e218210d53276db708010c8cb055008cf165004fa0216cb6a12cb1f12cb3fc972fb0093356c21e203c85004fa0258cf1601cf16ccc9ed5400db3b51343e803e903e90350c01f4cffe803e900c145468549271c17cb8b049f0bffcb8b0a0822625a02a8005a805af3cb8b0e0841ef765f7b232c7c572cfd400fe8088b3c58073c5b25c60063232c14933c59c3e80b2dab33260103ec01004f214013e809633c58073c5b3327b55200083200835c87b51343e803e903e90350c0134c7e08405e3514654882ea0841ef765f784ee84ac7cb8b174cfcc7e800c04e81408f214013e809633c58073c5b3327b5520'); 
    const STD_WALLET_CODE = Cell.fromHex('b5ee9c7201010101002300084202ba2918c8947e9b25af9ac1b883357754173e5812f807a3d6e642a14709595395');

    const initiativeId = 1n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3000000);

    function getJettonWalletInitData(
        owner: Address,
        minterAddress: Address,
        jettonWalletCode: Cell
    ): Cell {
        if (minterAddress.equals(grcMinter.address)) {
            return beginCell()
                .storeCoins(0n)
                .storeAddress(owner)
                .storeAddress(minterAddress)
                .storeRef(jettonWalletCode)
                .endCell();
        }
        
        return beginCell()
            .storeUint(0, 4)
            .storeCoins(0n)
            .storeAddress(owner)
            .storeAddress(minterAddress)
            .endCell();
    }
    
    function calculateJettonWalletAddress(
        owner: Address,
        jetton: { master: Address; code: Cell },
    ): Address {
        const initData = getJettonWalletInitData(
            owner, 
            jetton.master, 
            jetton.code,
        );
    
        const stateInit: StateInit = {
            code: jetton.code,
            data: initData,
        };
    
        return contractAddress(0, stateInit);
    }

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        jwallet_code_raw   = await compile('JettonWallet');

        const _libs = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
        _libs.set(BigInt(`0x${jwallet_code_raw.hash().toString('hex')}`), jwallet_code_raw);
        const libs = beginCell().storeDictDirect(_libs).endCell();
        blockchain.libs = libs;
        let lib_prep = beginCell().storeUint(2,8).storeBuffer(jwallet_code_raw.hash()).endCell();
        jwallet_code = new Cell({ exotic:true, bits: lib_prep.bits, refs:lib_prep.refs});

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
                usdtJettonWalletCode: STD_WALLET_CODE,
                grcJettonWalletCode: GRC_WALLET_CODE,
                notJettonWalletCode: STD_WALLET_CODE,
                pxJettonWalletCode: STD_WALLET_CODE,
                dogsJettonWalletCode: STD_WALLET_CODE,
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
                usdtJettonWalletCode: STD_WALLET_CODE,
                grcJettonWalletCode: GRC_WALLET_CODE,
                notJettonWalletCode: STD_WALLET_CODE,
                pxJettonWalletCode: STD_WALLET_CODE,
                dogsJettonWalletCode: STD_WALLET_CODE,
            }),
        );
        await regular.send(factory.getSender(), { value: toNano('0.5') }, null);
    
        const minters = [grcMinter, usdtMinter, notMinter, pxMinter, dogsMinter];
        const participants = [foundation, regular, donator, founder, creator];
        
        for (const person of participants) {
            for (const minter of minters) {
                // Определяем правильный код для каждого minter
                const isGrc = minter.address.equals(grcMinter.address);
                const currentCode = isGrc ? GRC_WALLET_CODE : STD_WALLET_CODE;
                
                // Вычисляем initData с правильным кодом
                const initData = getJettonWalletInitData(
                    person.address, 
                    minter.address, 
                    currentCode
                );
                const jwAddress = contractAddress(0, { code: currentCode, data: initData });
    
                // Создаём wallet data с правильной структурой
                let walletData: Cell;
                const initialBalance = toNano('10000000');
                
                if (isGrc) {
                    // GRC формат: coins + owner + master + ref(code)
                    walletData = beginCell()
                        .storeCoins(initialBalance)
                        .storeAddress(person.address)
                        .storeAddress(minter.address)
                        .storeRef(currentCode)
                        .endCell();
                } else {
                    // Governance формат: uint4 + coins + owner + master (БЕЗ ref!)
                    walletData = beginCell()
                        .storeUint(0, 4)
                        .storeCoins(initialBalance)
                        .storeAddress(person.address)
                        .storeAddress(minter.address)
                        .endCell();
                }
    
                await blockchain.setShardAccount(jwAddress, {
                    lastTransactionHash: 0n,
                    lastTransactionLt: 0n,
                    account: {
                        addr: jwAddress,
                        storageStats: { 
                            used: { cells: 5n, bits: 1024n }, 
                            lastPaid: 0, 
                            duePayment: null, 
                            storageExtra: null 
                        },
                        storage: {
                            lastTransLt: 0n,
                            balance: { coins: toNano('1') },
                            state: {
                                type: 'active',
                                state: { 
                                    code: currentCode,  // ← Используем правильный код!
                                    data: walletData 
                                },
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

        // Проверяем, что транзакция успешна
        expect(res.transactions).toHaveTransaction({
            from: donator.address,
            to: regular.address,
            success: true,
        });

        // Проверяем, что баланс контракта увеличился (за вычетом комиссий)
        const contractBalance = await blockchain.getContract(regular.address).then(c => c.balance);
        expect(contractBalance).toBeGreaterThan(donationAmount - toNano('0.1'));
    });

    it('should fail DonateTon with wrong signature', async () => {
        const wrongKeyPair = nacl.sign.keyPair(); 

        const expiredAt = Math.floor(Date.now() / 1000) + 600;
        const signedData = beginCell()
            .storeUint(expiredAt, 64)
            .storeAddress(donator.address)
            .endCell();

        // Подписываем НЕВЕРНЫМ ключом
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
            exitCode: 48401 // Exit code для "Invalid signature" в Tact
        });
    });

    it('should fail DonateTon if beneficiary is not the sender', async () => {
        const expiredAt = Math.floor(Date.now() / 1000) + 600;
        
        // Подписываем данные, где бенефициар — donator
        const signedData = beginCell()
            .storeUint(expiredAt, 64)
            .storeAddress(donator.address)
            .endCell();

        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);

        // Но отправляем от имени другого кошелька (creator)
        const res = await regular.send(
            creator.getSender(),
            { value: toNano('1') },
            {
                $$type: 'DonateTon',
                signature: Buffer.from(signature),
                signedData: signedData.beginParse(),
            }
        );

        // Должно упасть с ошибкой "payload not for sender"
        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: false,
            exitCode: 9669
        });
    });

    it('should fail DonateTon if signature payload is expired', async () => {
        const donationAmount = toNano('1');
        
        // Устанавливаем время истечения в прошлом относительно текущего времени блокчейна
        const currentTime = blockchain.now ?? Math.floor(Date.now() / 1000);
        const expiredAt = currentTime - 60; // Истекло 60 секунд назад

        const signedData = beginCell()
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

        // Ожидаем ошибку "payload expired" (exit code 41804 или подобный, 
        // но Sandbox покажет success: false из-за require)
        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: false,
            exitCode: 26045
        });
    });

    it('should fail JettonNotification if payload is expired', async () => {
        const currentTime = blockchain.now ?? Math.floor(Date.now() / 1000);
        const expiredAt = currentTime - 60; // Expired 1 minute ago
        const lockDays = 0;
    
        const signedData = beginCell()
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
            code: STD_WALLET_CODE
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
            exitCode: 26045 // "Payload expired"
        });
    });

    it('should fail JettonNotification if beneficiary is not the jetton sender', async () => {
        const expiredAt = Math.floor(Date.now() / 1000) + 1000;
        const lockDays = 0;
        
        // Signature is created for 'donator'
        const signedData = beginCell()
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
            code: STD_WALLET_CODE
        });

        // Message is sent by 'creator', but payload says 'donator'
        const res = await regular.send(
            blockchain.sender(usdtWallet),
            { value: toNano('0.2') },
            {
                $$type: 'JettonNotification',
                queryId: 0n,
                amount: toNano('100'),
                sender: creator.address, // Mismatch here
                forwardPayload: forwardPayload.beginParse()
            }
        );

        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: false,
            exitCode: 9669 // "Payload not for sender"
        });
    });

    it('should fail JettonNotification with invalid signature', async () => {
        const wrongKeyPair = nacl.sign.keyPair();
        const expiredAt = Math.floor(Date.now() / 1000) + 1000;
        const lockDays = 0;
    
        const signedData = beginCell()
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
            code: STD_WALLET_CODE
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
            exitCode: 48401 // "Invalid signature"
        });
    });

    it('should deposit USDT and update state balance', async () => {
        const amount = toNano('100');
        const expiredAt = Math.floor(Date.now() / 1000) + 1000;
        const lockDays = 0;
    
        const signedData = beginCell()
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
    
        const usdtWallet = calculateJettonWalletAddress(regular.address, { master: usdtMinter.address, code: STD_WALLET_CODE });
    
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
    
        const grcWallet = calculateJettonWalletAddress(regular.address, { master: grcMinter.address, code: GRC_WALLET_CODE });
    
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
            to: calculateJettonWalletAddress(regular.address, { master: grcMinter.address, code: GRC_WALLET_CODE }),
            success: true
        });
    });

    it('should fail GrcClaim with wrong signature', async () => {
        const wrongKeyPair = nacl.sign.keyPair(); 

        const amount = toNano('50');
        const nonce = 999n;
        const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 1000);

        const signedData = beginCell()
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
        // Убеждаемся, что время еще не вышло
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
        // --- ШАГ 1: Донатим TON ---
        const tonDonation = toNano('10');
        const expiredAtTon = Math.floor(Date.now() / 1000) + 600;
    
        const signedDataTon = beginCell()
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
    
        // --- ШАГ 2: Донатим USDT ---
        const usdtAmount = toNano('100');
        const expiredAtUsdt = Math.floor(Date.now() / 1000) + 1000;
        const lockDays = 0;
    
        const signedDataUsdt = beginCell()
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
            code: STD_WALLET_CODE
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
    
        // --- ШАГ 3: FounderClaim после дедлайна ---
        
        // Перематываем время (используем значение из beforeEach или вычисляем заново)
        // Предполагаем, что дедлайн был +3000000 сек от начала теста
        blockchain.now = Number(deadline + 100n);
    
        res = await regular.send(
            founder.getSender(),
            { value: toNano('0.5') },
            { $$type: 'FounderClaim' }
        );
    
        // 1. Проверяем успех транзакции вызова
        expect(res.transactions).toHaveTransaction({
            from: founder.address,
            to: regular.address,
            success: true,
        });
    
        // 2. Проверяем, что контракт отправил USDT основателю
        expect(res.transactions).toHaveTransaction({
            from: regular.address,
            to: usdtWallet, // Кошелек жетона контракта отправляет перевод
            success: true,
        });
    
        // 3. Проверяем, что остаток TON ушел основателю с правильным комментарием
        expect(res.transactions).toHaveTransaction({
            from: regular.address,
            to: founder.address,
            success: true,
            body: (x) => x!.beginParse().loadUint(32) === 0 && 
                         x!.beginParse().skip(32).loadStringTail() === "Escrow: Force claim by founder"
        });
    
        // 4. Проверяем обнуление балансов в стейте
        const finalBalances = await regular.getGetBalances();
        expect(finalBalances.usdtAmount).toBe(0n);
    });

    it('should fail CreatorClaim if isRegular is false', async () => {
        blockchain.now = Number(deadline + 100n);
        // 2. Формируем пустые лимиты (для этого теста суммы не важны)
        const signedData = beginCell()
            .storeCoins(0n) // USDT
            .storeCoins(0n) // GRC
            .storeCoins(0n) // NOT
            .storeCoins(0n) // PX
            .storeCoins(0n) // DOGS
            .storeCoins(0n) // TON
            .endCell();

        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);

        // 3. Пытаемся вызвать CreatorClaim на контракте FOUNDATION (isRegular = false)
        const res = await foundation.send(
            creator.getSender(),
            { value: toNano('0.5') },
            {
                $$type: 'CreatorClaim',
                signature: Buffer.from(signature),
                signedData: signedData.beginParse()
            }
        );

        // Ожидаем ошибку "CreatorClaim is only available for Regular initiatives"
        expect(res.transactions).toHaveTransaction({
            to: foundation.address,
            success: false,
            exitCode: 23428 // Exit code для этого require
        });
    });

    it('should successfully execute CreatorClaim with split logic', async () => {
        let currentRes; 
        const tonDonation = toNano('10');
        const expiredAtTon = Math.floor(Date.now() / 1000) + 600;
    
        // 1. Донатим TON
        const signedDataTon = beginCell()
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
    
        // 2. Донатим USDT
        const usdtAmount = toNano('100');
        const expiredAtUsdt = Math.floor(Date.now() / 1000) + 1000;
        
        const signedDataUsdt = beginCell()
            .storeUint(expiredAtUsdt, 64)
            .storeAddress(donator.address)
            .storeUint(0, 16) // lockDays
            .endCell();
    
        const signatureUsdt = nacl.sign.detached(signedDataUsdt.hash(), keyPair.secretKey);
    
        const forwardPayload = beginCell()
            .storeRef(beginCell()
                .storeBuffer(Buffer.from(signatureUsdt))
                .storeSlice(signedDataUsdt.beginParse())
                .endCell()
            ).endCell();
    
        // ВАЖНО: Это адрес кошелька USDT, который принадлежит контракту Initiative
        const initiativeUsdtWallet = calculateJettonWalletAddress(regular.address, { 
            master: usdtMinter.address, 
            code: STD_WALLET_CODE
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
    
        // 3. CreatorClaim
        // Фиксируем время СТРОГО перед вызовом
        blockchain.now = Number(deadline) + 100;
    
        const limitUsdt = toNano('60');
        const limitTon = toNano('2'); // Сделаем лимит меньше доната, чтобы проверить остаток основателю
    
        const signedDataClaim = beginCell()
            .storeCoins(limitUsdt)
            .storeCoins(0n) // GRC
            .storeCoins(0n) // NOT
            .storeCoins(0n) // PX
            .storeCoins(0n) // DOGS
            .storeCoins(limitTon)
            .endCell();
    
        const signatureClaim = nacl.sign.detached(signedDataClaim.hash(), keyPair.secretKey);
    
        // Вызываем клайм
        const claimRes = await regular.send(
            creator.getSender(),
            { value: toNano('1') },
            {
                $$type: 'CreatorClaim',
                signature: Buffer.from(signatureClaim),
                signedData: signedDataClaim.beginParse()
            }
        );
    
        // --- ПРОВЕРКИ ---
    
        expect(claimRes.transactions).toHaveTransaction({
            from: creator.address,
            to: regular.address,
            success: true
        });
    
        // Проверка USDT: контракт Initiative должен отправить ДВА сообщения 
        // на свой же Jetton-кошелек для инициации трансферов
        expect(claimRes.transactions).toHaveTransaction({
            from: regular.address,
            to: initiativeUsdtWallet,
            success: true,
        });
    
        // Проверка TON: Выплата Creator
        expect(claimRes.transactions).toHaveTransaction({
            from: regular.address,
            to: creator.address,
            success: true,
            body: (x) => x!.beginParse().skip(32).loadStringTail() === "Escrow: Creator payout"
        });
    
        // Проверка TON: Выплата Founder (остаток)
        expect(claimRes.transactions).toHaveTransaction({
            from: regular.address,
            to: founder.address,
            success: true,
            body: (x) => x!.beginParse().skip(32).loadStringTail() === "Escrow: Founder remainder"
        });
    });
    
    it('should fail CreatorClaim if called twice', async () => {
        const signedData = beginCell()
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
    
        // Первый раз - успех
        await regular.send(creator.getSender(), { value: toNano('1') }, msg);
        
        // Второй раз - ошибка "Already claimed"
        const res = await regular.send(creator.getSender(), { value: toNano('1') }, msg);
        
        expect(res.transactions).toHaveTransaction({
            to: regular.address,
            success: false,
            exitCode: 42504 // "Already claimed"
        });
    });

    it('should send jettons via TestSendJetton (Basic check)', async () => {
        const amount = toNano('10');
    
        // Отправляем тестовую команду контракту
        const res = await regular.send(
            founder.getSender(),
            { value: toNano('0.2') },
            {
                $$type: 'TestSendJetton',
                minter: notMinter.address,
                code: STD_WALLET_CODE, // Код обычного кошелька
                amount: amount
            }
        );
    
        // Проверяем цепочку транзакций
        // 1. Initiative -> Initiative Jetton Wallet (op: transfer)
        // 2. Initiative Jetton Wallet -> Founder Jetton Wallet (op: internal_transfer)

        const initiativeUsdtWallet = calculateJettonWalletAddress(regular.address, { 
            master: notMinter.address, 
            code: STD_WALLET_CODE
        });
        
        expect(res.transactions).toHaveTransaction({
            from: regular.address,
            to: initiativeUsdtWallet,
            success: true,
        });
    });
});