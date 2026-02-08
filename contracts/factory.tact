import "./initiative";
import "./utils/messages";
import "./utils/constants";

contract Factory {
    founder: Address;
    pub: Int as uint256;
    minCreationValue: Int as coins;

    grcMinterAddress: Address;
    usdtMinterAddress: Address;
    notMinterAddress: Address;
    pxMinterAddress: Address;
    dogsMinterAddress: Address;

    usdtJettonWalletCode: Cell;
    grcJettonWalletCode: Cell;
    notJettonWalletCode: Cell;
    pxJettonWalletCode: Cell;
    dogsJettonWalletCode: Cell;

    init(msg: FactoryInit) {
        self.founder = sender();
        self.pub = msg.pub;
        self.minCreationValue = ton("1");

        self.grcMinterAddress = msg.grcMinterAddress;
        self.notMinterAddress = msg.notMinterAddress;
        self.usdtMinterAddress = msg.usdtMinterAddress;
        self.pxMinterAddress = msg.pxMinterAddress;
        self.dogsMinterAddress = msg.dogsMinterAddress;

        self.usdtJettonWalletCode = msg.usdtJettonWalletCode;
        self.grcJettonWalletCode = msg.grcJettonWalletCode;
        self.notJettonWalletCode = msg.notJettonWalletCode;
        self.pxJettonWalletCode = msg.pxJettonWalletCode;
        self.dogsJettonWalletCode = msg.dogsJettonWalletCode;
    }

    receive() {}

    receive(msg: CreateInitiative) {
        require(context().value >= self.minCreationValue, "Insufficient TON to create");

        require(checkSignature(msg.signedData.hash(), msg.signature, self.pub), "Invalid signature");

        let initiativeId = msg.signedData.loadUint(32);
        let isRegular = msg.signedData.loadBool();
        let deadline = msg.signedData.loadUint(64);
        let beneficiary = msg.signedData.loadAddress();
        let expiredAt = msg.signedData.loadUint(64);

        require(deadline > now(), "Deadline must be in the future");
        require(now() < expiredAt, "Payload expired");
        require(beneficiary == sender(), "Payload not for sender");

        let args = InitiativeInit {
            pub: self.pub,
            founder: self.founder,
            creator: sender(),
            initiativeId,
            isRegular,
            deadline,

            grcMinterAddress: self.grcMinterAddress,
            notMinterAddress: self.notMinterAddress,
            usdtMinterAddress: self.usdtMinterAddress,
            pxMinterAddress: self.pxMinterAddress,
            dogsMinterAddress: self.dogsMinterAddress,

            usdtJettonWalletCode: self.usdtJettonWalletCode,
            grcJettonWalletCode: self.grcJettonWalletCode,
            notJettonWalletCode: self.notJettonWalletCode,
            pxJettonWalletCode: self.pxJettonWalletCode,
            dogsJettonWalletCode: self.dogsJettonWalletCode,
        };

        deploy(DeployParameters {
            init: initOf Initiative(args),
            mode: SendIgnoreErrors,
            value: ton("0.05"),
        });
    }

    receive(msg: ChangeMinCreationValue) {
        require(sender() == self.founder, "Only founder can change price");
        require(msg.newMin > ton("0.05"), "Too low price");
        self.minCreationValue = msg.newMin;
    }

    receive(msg: Withdraw) {
        require(sender() == self.founder, "Only founder");

        nativeReserve(GAS_RESERVE_TON, 0);

        message(MessageParameters {
            to: self.founder,
            value: 0,
            mode: SendRemainingBalance + SendIgnoreErrors,
            body: ("Factory: withdraw").asComment()
        });
    }

    get fun minCreationValue(): Int {
        return self.minCreationValue;
    }
}
