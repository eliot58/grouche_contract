import "./utils/constants";
import "./utils/types";
import "./utils/messages";
import "./utils/array";
import "./utils/jetton_utils";
import "./utils/vesting";

contract Foundation {
    pub: Int as uint256;

    founder: Address;
    creator: Address;
    initiativeId: Int as uint32;
    deadline: Int as uint64;

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

    grcVesting: map<Address, Array>;

    init(msg: FoundationInit) {
        self.pub = msg.pub;
        
        self.founder = msg.founder;
        self.creator = msg.creator;
        self.initiativeId = msg.initiativeId;
        self.deadline = msg.deadline;

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
            grcFounderAmount: 0,
            notAmount: 0,
            pxAmount: 0,
            dogsAmount: 0,
        };

        self.grcVesting = emptyMap();
    }

    receive() {}

    receive(msg: DonateTon) {
        require(checkSignature(msg.signedData.hash(), msg.signature, self.pub), "Invalid bundle");

        let initiativeId = msg.signedData.loadUint(32);
        let expiredAt = msg.signedData.loadUint(64);
        let beneficiary: Address = msg.signedData.loadAddress();

        require(now() < expiredAt, "payload expired");
        require(self.initiativeId == initiativeId, "initiativeId mismatch");
        require(beneficiary == sender(), "payload not for sender");
        require(now() < self.deadline, "deadline expired");
    }

    receive(msg: ClaimGrcVesting) {
        let addr = sender();

        require(self.grcVesting.exists(addr), "No pending GRC for sender");

        let arr = self.grcVesting.get(addr)!!;

        let index = msg.index;

        let item = arr.getIdx(index);
        
        require(now() >= item.unlockAt, "GRC not yet unlocked");

        let _ = arr.deleteIdx(index);
        self.grcVesting.set(addr, arr);

        sendJettons(
            addr,
            item.amount,
            self.grcMinterAddress,
            self.grcJettonWalletCode
        );
    }

    receive(msg: JettonNotification) {
        let sender = msg.sender;
        let payload = msg.forwardPayload.loadRef().beginParse();

        let signature: Slice = payload.loadBits(512);
        let signedData: Slice = payload.loadBits(32 + 64 + 267 + 16);

        require(checkSignature(signedData.hash(), signature, self.pub), "Invalid bundle");

        let initiativeId = signedData.loadUint(32);
        let expiredAt = signedData.loadUint(64);
        let beneficiary = signedData.loadAddress();
        let lockDays = signedData.loadUint(16);

        require(now() < expiredAt, "payload expired");
        require(self.initiativeId == initiativeId, "initiativeId mismatch");
        require(beneficiary == sender, "payload not for sender");
        require(now() < self.deadline, "deadline expired");

        let thisUsdt = calculateJettonWalletAddress(
            myAddress(), 
            self.usdtMinterAddress, 
            self.usdtJettonWalletCode
        );
        let thisGrc = calculateJettonWalletAddress(
            myAddress(), 
            self.grcMinterAddress, 
            self.grcJettonWalletCode
        );
        let thisNot = calculateJettonWalletAddress(
            myAddress(), 
            self.notMinterAddress, 
            self.notJettonWalletCode
        );
        let thisPx = calculateJettonWalletAddress(
            myAddress(), 
            self.pxMinterAddress, 
            self.pxJettonWalletCode
        );
        let thisDogs = calculateJettonWalletAddress(
            myAddress(), 
            self.dogsMinterAddress, 
            self.dogsJettonWalletCode
        );

        if (sender() == thisUsdt) {
            self.balances.usdtAmount += msg.amount;
        } else if (sender() == thisGrc) {
            let returnBps = returnBpsByLockDays(lockDays);

            let returnAmount = (msg.amount * returnBps) / BPS_DENOM;
            let founderAmount = msg.amount - returnAmount;

            if (returnAmount > 0) {
                if (!self.grcVesting.exists(sender)) {
                    self.grcVesting.set(sender, emptyArray());
                }
                let arr = self.grcVesting.get(sender)!!;
                let unlockTs = now() + (lockDays * SECONDS_IN_DAY);
                arr.append(GrcVestingTranche { amount: returnAmount, unlockAt: unlockTs });
                self.grcVesting.set(sender, arr);
            }

            if (founderAmount > 0) {
                self.balances.grcFounderAmount += founderAmount;
            }
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

    receive(msg: ClaimEscrow) {
        require(now() >= self.deadline, "Not expired yet");
        require(self.founder == sender(), "Only founder");

        self._payoutEscrow(sender());
    }

    inline fun _payoutEscrow(claimant: Address) {
        let usdtAmount = self.balances.usdtAmount;
        let grcAmount = self.balances.grcFounderAmount;
        let notAmount = self.balances.notAmount;
        let pxAmount = self.balances.pxAmount;
        let dogsAmount = self.balances.dogsAmount;

        if (usdtAmount > 0) {
            sendJettons(
                claimant, 
                usdtAmount, 
                self.usdtMinterAddress, 
                self.usdtJettonWalletCode
            );
            self.balances.usdtAmount = 0;
        }
        if (grcAmount > 0) {
            sendJettons(
                claimant, 
                grcAmount, 
                self.grcMinterAddress, 
                self.grcJettonWalletCode
            );
            self.balances.grcFounderAmount = 0;
        }
        if (notAmount > 0) {
            sendJettons(
                claimant, 
                notAmount, 
                self.notMinterAddress,
                self.notJettonWalletCode
            );
            self.balances.notAmount = 0;
        }
        if (pxAmount > 0) {
            sendJettons(
                claimant, 
                pxAmount, 
                self.pxMinterAddress, 
                self.pxJettonWalletCode
            );
            self.balances.pxAmount = 0;
        }
        if (dogsAmount > 0) {
            sendJettons(
                claimant, 
                dogsAmount, 
                self.dogsMinterAddress, 
                self.dogsJettonWalletCode
            );
            self.balances.dogsAmount = 0;
        }

        let bal = myBalance();
        if (bal > GAS_RESERVE_TON) {
            let payout = bal - GAS_RESERVE_TON;
            if (payout > 0) {
                message(MessageParameters {
                    to: claimant,
                    value: payout
                });
            }
        }
    }

    get fun getGrcVesting(addr: Address): Array? {
        let vesting = self.grcVesting.get(addr);
        return vesting;
    }
    
    get fun getBalances(): Balances {
        let balances = self.balances;
        return balances;
    }
}
