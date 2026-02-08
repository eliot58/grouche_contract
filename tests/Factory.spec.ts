import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell } from '@ton/core';
import { Factory } from '../build/Factory/Factory_Factory';
import nacl from 'tweetnacl';
import '@ton/test-utils';

describe('Factory', () => {
    let blockchain: Blockchain;
    let founder: SandboxContract<TreasuryContract>;
    let creator: SandboxContract<TreasuryContract>;

    let grcMinter: SandboxContract<TreasuryContract>;
    let notMinter: SandboxContract<TreasuryContract>;
    let usdtMinter: SandboxContract<TreasuryContract>;
    let pxMinter: SandboxContract<TreasuryContract>;
    let dogsMinter: SandboxContract<TreasuryContract>;

    let factory: SandboxContract<Factory>;
    let keyPair: nacl.SignKeyPair;

    const GRC_WALLET_CODE = Cell.fromHex( 'b5ee9c7201021201000328000114ff00f4a413f4bcf2c80b0102016202030202cc0405001ba0f605da89a1f401f481f481a8610201d40607020148080900bb0831c02497c138007434c0c05c6c2544d7c0fc02f83e903e900c7e800c5c75c87e800c7e800c00b4c7e08403e29fa954882ea54c4d167c0238208405e3514654882ea58c511100fc02780d60841657c1ef2ea4d67c02b817c12103fcbc2000113e910c1c2ebcb853600201200a0b020120101101f500f4cffe803e90087c007b51343e803e903e90350c144da8548ab1c17cb8b04a30bffcb8b0950d109c150804d50500f214013e809633c58073c5b33248b232c044bd003d0032c032483e401c1d3232c0b281f2fff274013e903d010c7e801de0063232c1540233c59c3e8085f2dac4f3208405e351467232c7c6600c03f73b51343e803e903e90350c0234cffe80145468017e903e9014d6f1c1551cdb5c150804d50500f214013e809633c58073c5b33248b232c044bd003d0032c0327e401c1d3232c0b281f2fff274140371c1472c7cb8b0c2be80146a2860822625a020822625a004ad822860822625a028062849f8c3c975c2c070c008e00d0e0f009acb3f5007fa0222cf165006cf1625fa025003cf16c95005cc2391729171e25008a813a08208989680aa008208989680a0a014bcf2e2c504c98040fb001023c85004fa0258cf1601cf16ccc9ed5400705279a018a182107362d09cc8cb1f5230cb3f58fa025007cf165007cf16c9718018c8cb0524cf165006fa0215cb6a14ccc971fb0010241023000e10491038375f040076c200b08e218210d53276db708010c8cb055008cf165004fa0216cb6a12cb1f12cb3fc972fb0093356c21e203c85004fa0258cf1601cf16ccc9ed5400db3b51343e803e903e90350c01f4cffe803e900c145468549271c17cb8b049f0bffcb8b0a0822625a02a8005a805af3cb8b0e0841ef765f7b232c7c572cfd400fe8088b3c58073c5b25c60063232c14933c59c3e80b2dab33260103ec01004f214013e809633c58073c5b3327b55200083200835c87b51343e803e903e90350c0134c7e08405e3514654882ea0841ef765f784ee84ac7cb8b174cfcc7e800c04e81408f214013e809633c58073c5b3327b5520'); 
    const STD_WALLET_CODE = Cell.fromHex('b5ee9c7201010101002300084202ba2918c8947e9b25af9ac1b883357754173e5812f807a3d6e642a14709595395');

    beforeEach(async () => {
        // Подготовка окружения перед каждым тестом
        blockchain = await Blockchain.create();
        keyPair = nacl.sign.keyPair(); // Генерируем ключи для подписи данных

        let publicKey = Buffer.from(keyPair.publicKey);

        // Создаем виртуальные кошельки для ролей
        founder = await blockchain.treasury('founder'); // Владелец/основатель фабрики
        creator = await blockchain.treasury('creator'); // Пользователь, создающий инициативы

        // Минтеры различных жетонов (имитация адресов)
        grcMinter = await blockchain.treasury('grcMinter');
        notMinter = await blockchain.treasury('notMinter');
        usdtMinter = await blockchain.treasury('usdtMinter');
        pxMinter = await blockchain.treasury('pxMinter');
        dogsMinter = await blockchain.treasury('dogsMinter');

        // Инициализация и деплой контракта Factory
        factory = blockchain.openContract(
            await Factory.fromInit({
                $$type: 'FactoryInit',
                pub: BigInt('0x' + publicKey.toString('hex')),
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

        // Проверка успешного деплоя фабрики
        const deployResult = await factory.send(founder.getSender(), { value: toNano('0.05') }, null);
        expect(deployResult.transactions).toHaveTransaction({
            from: founder.address,
            to: factory.address,
            deploy: true,
            success: true,
        });
    });

    // --- ТЕСТЫ СОЗДАНИЯ ИНИЦИАТИВ ---

    it('should create a Regular initiative', async () => {
        // ТЕСТ: Успешное создание обычной (Regular) инициативы
        const initiativeId = 1n;
        const isRegular = true;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3000000);
        const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 600);
        const beneficiary = creator.address;

        // Формируем данные и подписываем их закрытым ключом
        const signedData = beginCell()
            .storeUint(initiativeId, 32)
            .storeBit(isRegular)
            .storeUint(deadline, 64)
            .storeAddress(beneficiary)
            .storeUint(expiredAt, 64)
            .endCell();

        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);

        const result = await factory.send(
            creator.getSender(),
            { value: toNano('1') },
            {
                $$type: 'CreateInitiative',
                signature: Buffer.from(signature),
                signedData: signedData.beginParse(),
            },
        );

        // Проверяем, что фабрика успешно создала (задеплоила) дочерний контракт
        expect(result.transactions).toHaveTransaction({
            from: factory.address,
            deploy: true,
            success: true,
        });
    });

    it('should create a Foundation initiative', async () => {
        // ТЕСТ: Успешное создание инициативы типа "Фонд" (Foundation)
        const initiativeId = 2n;
        const isRegular = false; // Отличие здесь
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3000000);
        const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 600);
        const beneficiary = creator.address;

        const signedData = beginCell()
            .storeUint(initiativeId, 32)
            .storeBit(isRegular)
            .storeUint(deadline, 64)
            .storeAddress(beneficiary)
            .storeUint(expiredAt, 64)
            .endCell();

        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);

        const result = await factory.send(
            creator.getSender(),
            { value: toNano('1') },
            {
                $$type: 'CreateInitiative',
                signature: Buffer.from(signature),
                signedData: signedData.beginParse(),
            },
        );

        expect(result.transactions).toHaveTransaction({
            from: factory.address,
            deploy: true,
            success: true,
        });
    });

    // --- ТЕСТЫ ОШИБОК ПРИ СОЗДАНИИ ---

    it('should fail to create initiative if sent value is less than minCreationValue', async () => {
        // ТЕСТ: Ошибка, если прислано слишком мало TON для создания
        const initiativeId = 100n;
        const isRegular = true;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3000000);
        const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 600);
        const beneficiary = creator.address;

        const signedData = beginCell()
            .storeUint(initiativeId, 32).storeBit(isRegular).storeUint(deadline, 64).storeAddress(beneficiary).storeUint(expiredAt, 64).endCell();

        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);

        const result = await factory.send(
            creator.getSender(),
            { value: toNano('0.5') }, // Отправляем меньше минималки (допустим, лимит 1 TON)
            {
                $$type: 'CreateInitiative',
                signature: Buffer.from(signature),
                signedData: signedData.beginParse(),
            },
        );

        // Транзакция должна завершиться неудачей (success: false)
        expect(result.transactions).toHaveTransaction({
            from: creator.address,
            to: factory.address,
            success: false,
        });
    });

    it('should fail if signature is invalid', async () => {
        // ТЕСТ: Ошибка, если данные подписаны неверным ключом
        const wrongKeyPair = nacl.sign.keyPair(); // Другая пара ключей

        const initiativeId = 3n;
        const isRegular = false;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3000000);
        const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 600);
        const beneficiary = creator.address;

        const signedData = beginCell()
            .storeUint(initiativeId, 32).storeBit(isRegular).storeUint(deadline, 64).storeAddress(beneficiary).storeUint(expiredAt, 64).endCell();

        const signature = nacl.sign.detached(signedData.hash(), wrongKeyPair.secretKey);

        const result = await factory.send(
            creator.getSender(),
            { value: toNano('1.1') },
            {
                $$type: 'CreateInitiative',
                signature: Buffer.from(signature),
                signedData: signedData.beginParse(),
            },
        );

        expect(result.transactions).toHaveTransaction({
            from: creator.address,
            to: factory.address,
            success: false,
        });
    });

    it('should fail if payload is expired', async () => {
        // ТЕСТ: Ошибка, если срок жизни подписи (expiredAt) уже истек
        const initiativeId = 4n;
        const isRegular = true;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3000000);

        const expiredAt = BigInt(Math.floor(Date.now() / 1000) - 60); // Время в прошлом
        const beneficiary = creator.address;

        const signedData = beginCell()
            .storeUint(initiativeId, 32).storeBit(isRegular).storeUint(deadline, 64).storeAddress(beneficiary).storeUint(expiredAt, 64).endCell();

        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);

        const result = await factory.send(
            creator.getSender(),
            { value: toNano('1.1') },
            {
                $$type: 'CreateInitiative',
                signature: Buffer.from(signature),
                signedData: signedData.beginParse(),
            },
        );

        expect(result.transactions).toHaveTransaction({
            from: creator.address,
            to: factory.address,
            success: false,
        });
    });

    it('should fail if sender is not the beneficiary', async () => {
        // ТЕСТ: Запрет на создание инициативы, если отправитель транзакции не совпадает с бенефициаром в подписи
        const initiativeId = 5n;
        const isRegular = true;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3000000);
        const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 600);

        const beneficiary = founder.address; // В подписи указан founder

        const signedData = beginCell()
            .storeUint(initiativeId, 32).storeBit(isRegular).storeUint(deadline, 64).storeAddress(beneficiary).storeUint(expiredAt, 64).endCell();

        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);

        const result = await factory.send(
            creator.getSender(), // Но отправляет creator
            { value: toNano('1.1') },
            {
                $$type: 'CreateInitiative',
                signature: Buffer.from(signature),
                signedData: signedData.beginParse(),
            },
        );

        expect(result.transactions).toHaveTransaction({
            from: creator.address,
            to: factory.address,
            success: false,
        });
    });

    // --- АДМИНИСТРАТИВНЫЕ ТЕСТЫ ---

    it('should allow founder to withdraw but keep 0.5 TON reserve', async () => {
        // ТЕСТ: Вывод средств владельцем с сохранением минимального резерва контракта
        await founder.send({
            to: factory.address,
            value: toNano('5'),
            bounce: false,
        });

        const beforeBalance = await founder.getBalance();
        const expectedReserve = toNano('0.5');

        const result = await factory.send(founder.getSender(), { value: toNano('0.05') }, { $$type: 'Withdraw' });

        expect(result.transactions).toHaveTransaction({
            from: factory.address,
            to: founder.address,
            success: true,
        });

        const factoryBalanceAfter = (await blockchain.getContract(factory.address)).balance;

        // Проверяем, что на балансе осталось около 0.5 TON (с учетом погрешности на газ)
        expect(factoryBalanceAfter).toBeGreaterThanOrEqual(expectedReserve - toNano('0.01'));
        expect(factoryBalanceAfter).toBeLessThan(expectedReserve + toNano('0.01'));

        const afterBalance = await founder.getBalance();
        expect(afterBalance).toBeGreaterThan(beforeBalance);
    });

    it('should allow founder to change min creation value and reflect it in getter', async () => {
        // ТЕСТ: Изменение минимальной стоимости создания инициативы владельцем
        const newPrice = toNano('2');

        const result = await factory.send(
            founder.getSender(),
            { value: toNano('0.05') },
            { $$type: 'ChangeMinCreationValue', newMin: newPrice },
        );

        expect(result.transactions).toHaveTransaction({
            from: founder.address,
            to: factory.address,
            success: true,
        });

        // Проверяем через getter, что цена действительно обновилась
        const currentPrice = await factory.getMinCreationValue();
        expect(currentPrice).toBe(newPrice);
    });

    it('should fail to create initiative if value is below new min price', async () => {
        // ТЕСТ: Проверка, что после повышения цены старая цена больше не принимается
        await factory.send(
            founder.getSender(),
            { value: toNano('0.05') },
            { $$type: 'ChangeMinCreationValue', newMin: toNano('2') },
        );

        const initiativeId = 10n;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3000000);
        const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 600);
        const signedData = beginCell()
            .storeUint(initiativeId, 32).storeBit(true).storeUint(deadline, 64).storeAddress(creator.address).storeUint(expiredAt, 64).endCell();

        const signature = nacl.sign.detached(signedData.hash(), keyPair.secretKey);

        const result = await factory.send(
            creator.getSender(),
            { value: toNano('1.5') }, // Это меньше новой цены в 2 TON
            {
                $$type: 'CreateInitiative',
                signature: Buffer.from(signature),
                signedData: signedData.beginParse(),
            },
        );

        expect(result.transactions).toHaveTransaction({
            from: creator.address,
            to: factory.address,
            success: false,
        });
    });
});