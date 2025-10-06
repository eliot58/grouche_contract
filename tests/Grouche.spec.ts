import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { Grouche } from '../build/Grouche/Grouche_Grouche';
import '@ton/test-utils';

describe('Grouche', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let grouche: SandboxContract<Grouche>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        grouche = blockchain.openContract(await Grouche.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await grouche.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            null,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: grouche.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and grouche are ready to use
    });
});
