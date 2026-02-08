import "./utils/constants";
import "./utils/types";
import "./utils/messages";
import "./utils/jetton_utils";
import "./utils/vesting";

message(0x45d50760) TestSendJetton {
    minter: Address;
    code: Cell;
    amount: Int as coins;
}

contract Initiative {
    pub: Int as uint256;

    founder: Address;
    creator: Address;
    initiativeId: Int as uint32;
    isRegular: Bool;
    deadline: Int as uint64;

    isClaimed: Bool;

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

    balances: Balances;

    usedNonces: map<Int as uint64, Bool>;

    init(msg: InitiativeInit) {
        self.pub = msg.pub;
        self.founder = msg.founder;
        self.creator = msg.creator;
        self.initiativeId = msg.initiativeId;
        self.isRegular = msg.isRegular;
        self.deadline = msg.deadline;

        self.isClaimed = false;

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

        self.balances = Balances {
            usdtAmount: 0,
            grcAmount: 0,
            notAmount: 0,
            pxAmount: 0,
            dogsAmount: 0,
        };
    }

    receive() {}

    receive(msg: DonateTon) {
        require(checkSignature(msg.signedData.hash(), msg.signature, self.pub), "Invalid signature");

        let expiredAt = msg.signedData.loadUint(64);
        let beneficiary: Address = msg.signedData.loadAddress();

        require(now() < expiredAt, "Payload expired");
        require(beneficiary == sender(), "Payload not for sender");
    }

    receive(msg: GrcClaim) {
        require(checkSignature(msg.signedData.hash(), msg.signature, self.pub), "Invalid signature");

        let amount: Int = msg.signedData.loadCoins();
        let nonce: Int = msg.signedData.loadUint(64);
        let expiredAt: Int = msg.signedData.loadUint(64);
        let beneficiary: Address = msg.signedData.loadAddress();

        require(now() < expiredAt, "Payload expired");
        require(beneficiary == sender(), "Payload not for sender");
        require(!self.usedNonces.exists(nonce), "Nonce already used");

        self.usedNonces.set(nonce, true);

        sendJettons(
            sender(),
            amount,
            self.grcMinterAddress,
            self.grcJettonWalletCode,
            self.grcMinterAddress
        );
    }

    receive(msg: JettonNotification) {
        let sender = msg.sender;
        let payload = msg.forwardPayload.loadRef().beginParse();

        let signature: Slice = payload.loadBits(512);
        let signedData: Slice = payload.loadBits(64 + 267 + 16);

        require(checkSignature(signedData.hash(), signature, self.pub), "Invalid signature");

        let expiredAt = signedData.loadUint(64);
        let beneficiary = signedData.loadAddress();
        let lockDays = signedData.loadUint(16);

        require(now() < expiredAt, "Payload expired");
        require(beneficiary == sender, "Payload not for sender");

        let thisUsdt = calculateJettonWalletAddress(
            myAddress(),
            self.usdtMinterAddress,
            self.usdtJettonWalletCode,
            self.grcMinterAddress
        );
        let thisGrc = calculateJettonWalletAddress(
            myAddress(),
            self.grcMinterAddress,
            self.grcJettonWalletCode,
            self.grcMinterAddress
        );
        let thisNot = calculateJettonWalletAddress(
            myAddress(),
            self.notMinterAddress,
            self.notJettonWalletCode,
            self.grcMinterAddress
        );
        let thisPx = calculateJettonWalletAddress(
            myAddress(),
            self.pxMinterAddress,
            self.pxJettonWalletCode,
            self.grcMinterAddress
        );
        let thisDogs = calculateJettonWalletAddress(
            myAddress(),
            self.dogsMinterAddress,
            self.dogsJettonWalletCode,
            self.grcMinterAddress
        );

        if (sender() == thisUsdt) {
            self.balances.usdtAmount += msg.amount;
        } else if (sender() == thisGrc) {
            let returnBps = returnBpsByLockDays(lockDays);
            let returnAmount = (msg.amount * returnBps) / BPS_DENOM;
            let founderAmount = msg.amount - returnAmount;

            self.balances.grcAmount += founderAmount;
        } else if (sender() == thisNot) {
            self.balances.notAmount += msg.amount;
        } else if (sender() == thisPx) {
            self.balances.pxAmount += msg.amount;
        } else if (sender() == thisDogs) {
            self.balances.dogsAmount += msg.amount;
        } else {
            throw(602); // E602: unexpected jetton wallet in active branch
        }
    }

    receive(msg: CreatorClaim) {
        require(self.isRegular, "CreatorClaim is only available for Regular initiatives");
        require(!self.isClaimed, "Already claimed");
        require(sender() == self.creator, "Only creator can claim with signature");
        require(now() >= self.deadline, "Not expired yet");

        require(checkSignature(msg.signedData.hash(), msg.signature, self.pub), "Invalid signature");

        let s = msg.signedData;

        let cUsdt = s.loadCoins();
        let cGrc = s.loadCoins();
        let cNot = s.loadCoins();
        let cPx = s.loadCoins();
        let cDogs = s.loadCoins();
        let cTon = s.loadCoins();

        self.isClaimed = true;

        self._splitJettons(self.creator, self.founder, cUsdt, cGrc, cNot, cPx, cDogs);

        let totalTon = myBalance() - GAS_RESERVE_TON;
        let payoutToCreator = min(cTon, totalTon);
        let payoutToFounder = totalTon - payoutToCreator;

        if (payoutToCreator > 0) {
            message(MessageParameters {
                to: self.creator,
                value: payoutToCreator,
                mode: SendIgnoreErrors,
                body: "Escrow: Creator payout".asComment(),
            });
        }

        if (payoutToFounder > 0) {
            message(MessageParameters {
                to: self.founder,
                value: payoutToFounder,
                mode: SendIgnoreErrors,
                body: "Escrow: Founder remainder".asComment(),
            });
        }
    }

    receive(msg: TestSendJetton) {
        sendJettons(
            sender(), 
            msg.amount, 
            msg.minter, 
            msg.code, 
            self.grcMinterAddress // response_destination
        );
    }

    receive(_: FounderClaim) {
        require(now() >= self.deadline, "Not expired yet");
        require(sender() == self.founder, "Only founder can force claim");

        self._splitJettons(self.creator, self.founder, 0, 0, 0, 0, 0);

        nativeReserve(GAS_RESERVE_TON, 0);
        message(MessageParameters {
            to: self.founder,
            value: 0,
            mode: SendRemainingBalance,
            body: "Escrow: Force claim by founder".asComment(),
        });
    }

    inline fun _splitJettons(creator: Address, founder: Address, cUsdt: Int, cGrc: Int, cNot: Int, cPx: Int, cDogs: Int) {
        self._sendSplit(self.usdtMinterAddress, self.usdtJettonWalletCode, creator, founder, cUsdt, self.balances.usdtAmount);
        self.balances.usdtAmount = 0;

        self._sendSplit(self.grcMinterAddress, self.grcJettonWalletCode, creator, founder, cGrc, self.balances.grcAmount);
        self.balances.grcAmount = 0;

        self._sendSplit(self.notMinterAddress, self.notJettonWalletCode, creator, founder, cNot, self.balances.notAmount);
        self.balances.notAmount = 0;

        self._sendSplit(self.pxMinterAddress, self.pxJettonWalletCode, creator, founder, cPx, self.balances.pxAmount);
        self.balances.pxAmount = 0;

        self._sendSplit(self.dogsMinterAddress, self.dogsJettonWalletCode, creator, founder, cDogs, self.balances.dogsAmount);
        self.balances.dogsAmount = 0;
    }

    inline fun _sendSplit(minter: Address, code: Cell, creator: Address, founder: Address, creatorLimit: Int, total: Int) {
        let toCreator = min(creatorLimit, total);
        let toFounder = total - toCreator;

        if (toCreator > 0) {
            sendJettons(creator, toCreator, minter, code, self.grcMinterAddress);
        }
        if (toFounder > 0) {
            sendJettons(founder, toFounder, minter, code, self.grcMinterAddress);
        }
    }

    get fun getInitiative(): InitiativeInfo {
        return InitiativeInfo { initiativeId: self.initiativeId, isRegular: self.isRegular, deadline: self.deadline };
    }

    get fun getBalances(): Balances {
        return self.balances;
    }
}
