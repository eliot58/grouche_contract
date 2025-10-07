import "./grouche.tact";

message(0xae37766f) FactoryInit {
    authorityPubKey: Int as uint256;

    grcMinterAddress: Address;
    notMinterAddress: Address;
    usdtMinterAddress: Address;
    pxMinterAddress: Address;
    dogsMinterAddress: Address;

    usdtJettonWalletCode: Cell;
    grcJettonWalletCode: Cell;
    notJettonWalletCode: Cell;
    pxJettonWalletCode: Cell;
    dogsJettonWalletCode: Cell;
}

message(0xbc7b9b61) CreateGroucheSigned {
    bundle: SignedBundle;

    initiativeId: Int as uint64;
    expiredAt: Int as uint64;
}

message(0xc959163f) Withdraw { }

contract GroucheFactory {
    owner: Address;
    authorityPubKey: Int as uint256;

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
        self.owner = sender();
        self.authorityPubKey = msg.authorityPubKey;

        self.grcMinterAddress  = msg.grcMinterAddress;
        self.notMinterAddress  = msg.notMinterAddress;
        self.usdtMinterAddress = msg.usdtMinterAddress;
        self.pxMinterAddress   = msg.pxMinterAddress;
        self.dogsMinterAddress = msg.dogsMinterAddress;

        self.usdtJettonWalletCode = msg.usdtJettonWalletCode;
        self.grcJettonWalletCode  = msg.grcJettonWalletCode;
        self.notJettonWalletCode  = msg.notJettonWalletCode;
        self.pxJettonWalletCode   = msg.pxJettonWalletCode;
        self.dogsJettonWalletCode = msg.dogsJettonWalletCode;
    }

    receive() {}

    receive(msg: CreateGroucheSigned) {
        throwUnless(101, msg.bundle.verifySignature(self.authorityPubKey));

        let args = Deploy {
            owner: self.owner,
            initiativeId: msg.initiativeId,
            expiredAt: msg.expiredAt,

            grcMinterAddress: self.grcMinterAddress,
            notMinterAddress: self.notMinterAddress,
            usdtMinterAddress: self.usdtMinterAddress,
            pxMinterAddress: self.pxMinterAddress,
            dogsMinterAddress: self.dogsMinterAddress,

            usdtJettonWalletCode: self.usdtJettonWalletCode,
            grcJettonWalletCode:  self.grcJettonWalletCode,
            notJettonWalletCode:  self.notJettonWalletCode,
            pxJettonWalletCode:   self.pxJettonWalletCode,
            dogsJettonWalletCode: self.dogsJettonWalletCode
        };

        deploy(DeployParameters {
            init: initOf Grouche(args),
            mode: SendIgnoreErrors,
            value: ton("1"),
        });
    }

    receive(msg: Withdraw) {
        require(sender() == self.owner, "Only owner");

        message(MessageParameters {
            to: self.owner,
            value: 0,
            body: ("GroucheFactory: withdraw").asComment(),
            mode: SendRemainingValue,
        });
    }
}
