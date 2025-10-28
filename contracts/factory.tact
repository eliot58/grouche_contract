import "./foundation.tact";
import "./regular.tact";
import "./utils/messages";

message(0xae37766f) FactoryInit {
    pub: Int as uint256;

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

message(0xbc7b9b61) CreateInitiative {
    signature: Slice as bytes64;
    signedData: Slice;
}

message(0xc959163f) Withdraw {}

contract Factory {
    founder: Address;
    pub: Int as uint256; 

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
        require(context().value >= ton("1"), "Min 1 TON to create");

        require(checkSignature(msg.signedData.hash(), msg.signature, self.pub), "Invalid bundle");

        let initiativeId = msg.signedData.loadUint(32);
        let isRegular = msg.signedData.loadBool();
        let deadline = msg.signedData.loadUint(64);
        let beneficiary = msg.signedData.loadAddress();
        let expiredAt = msg.signedData.loadUint(64);

        require(now() < expiredAt, "payload expired");
        require(beneficiary == sender(), "payload not for sender");

        if (isRegular) {
            let args = RegularInit {
                pub: self.pub,
                founder: self.founder,
                creator: sender(),
                initiativeId: initiativeId,
                deadline: deadline,

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
                init: initOf Regular(args),
                mode: SendIgnoreErrors,
                value: ton("0.05"),
            });
        } else {
            let args = FoundationInit {
                pub: self.pub,
                founder: self.founder,
                creator: sender(),
                initiativeId: initiativeId,
                deadline: deadline,

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
                init: initOf Foundation(args),
                mode: SendIgnoreErrors,
                value: ton("0.05"),
            });
        }
    }

    receive(msg: Withdraw) {
        require(sender() == self.founder, "Only founder");

        let bal = myBalance();
        if (bal > GAS_RESERVE_TON) {
            let payout = bal - GAS_RESERVE_TON;
            if (payout > 0) {
                message(MessageParameters {
                    to: self.founder,
                    value: payout,
                    body: ("Factory: withdraw").asComment(),
                    mode: 0,
                });
            }
        }
    }
}
