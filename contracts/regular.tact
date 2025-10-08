import "./utils/constants";
import "./utils/types";
import "./utils/messages";
import "./utils/array";
import "./utils/payloads";
import "./utils/jetton_utils";
import "./utils/vesting";

contract Regular {
    founder: Address;
    creator: Address;
    initiativeId: Int as uint64;
    expiredAt: Int as uint64;

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

    init(msg: RegularInit) {
        self.founder = msg.founder;
        self.creator = msg.creator;
        self.initiativeId = msg.initiativeId;
        self.expiredAt = msg.expiredAt;

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
        if (now() >= self.expiredAt) {
            message(MessageParameters {
                to: sender(),
                value: 0,
                body: buildTonPayloadRefund(self.initiativeId),
                mode: SendRemainingValue,
            });
        }
    }

    receive(msg: ClaimGrcVesting) {
        let addr = sender();

        require(self.grcVesting.exists(addr), "No pending GRC for sender");

        let arr = self.grcVesting.get(addr)!!;

        let index = msg.index;
        require(index >= 0 && index < arr.length, "Index out of bounds");

        let item = arr.m.get(index)!!;
        require(now() >= item.unlockAt, "GRC not yet unlocked");

        let _ = arr.deleteIdx(index);
        self.grcVesting.set(addr, arr);

        sendJettons(addr, item.amount, self.grcMinterAddress, self.grcJettonWalletCode, buildJettonPayloadClaim(self.initiativeId));
    }

    receive(msg: JettonNotification) {
        let thisUsdt = calculateJettonWalletAddress(
            myAddress(),
            self.usdtMinterAddress,
            self.usdtJettonWalletCode,
        );

        let thisGrc = calculateJettonWalletAddress(
            myAddress(),
            self.grcMinterAddress,
            self.grcJettonWalletCode,
        );

        let thisNot = calculateJettonWalletAddress(
            myAddress(),
            self.notMinterAddress,
            self.notJettonWalletCode,
        );

        let thisPx = calculateJettonWalletAddress(
            myAddress(),
            self.pxMinterAddress,
            self.pxJettonWalletCode,
        );

        let thisDogs = calculateJettonWalletAddress(
            myAddress(),
            self.dogsMinterAddress,
            self.dogsJettonWalletCode,
        );

        if (now() >= self.expiredAt) {
            if (sender() == thisUsdt) {
                sendJettons(msg.sender, msg.amount, self.usdtMinterAddress, self.usdtJettonWalletCode, buildJettonPayloadRefund(self.initiativeId));
            } else if (sender() == thisGrc) {
                sendJettons(msg.sender, msg.amount, self.grcMinterAddress, self.grcJettonWalletCode, buildJettonPayloadRefund(self.initiativeId));
            } else if (sender() == thisNot) {
                sendJettons(msg.sender, msg.amount, self.notMinterAddress, self.notJettonWalletCode, buildJettonPayloadRefund(self.initiativeId));
            } else if (sender() == thisPx) {
                sendJettons(msg.sender, msg.amount, self.pxMinterAddress, self.pxJettonWalletCode, buildJettonPayloadRefund(self.initiativeId));
            } else if (sender() == thisDogs) {
                sendJettons(msg.sender, msg.amount, self.dogsMinterAddress, self.dogsJettonWalletCode, buildJettonPayloadRefund(self.initiativeId));
            } else {
                throw(601); // E601: unexpected jetton wallet in expired branch
            }
            return;
        }

        if (sender() == thisUsdt) {
            self.balances.usdtAmount += msg.amount;
        } else if (sender() == thisGrc) {
            if (msg.amount >= ton("100")) {
                let payload = msg.forwardPayload;

                require(payload.bits() >= 8, "GRC: payload missing tier");
                let tier = payload.loadUint(8);

                let beneficiary = msg.sender;

                let spec = grcTierToParams(tier);
                require(spec.lockDays > 0, "GRC: unknown vesting tier");

                let returnAmount = (msg.amount * spec.returnBps) / BPS_DENOM;
                let founderAmount = msg.amount - returnAmount;

                if (returnAmount > 0) {
                    if (!self.grcVesting.exists(beneficiary)) {
                        self.grcVesting.set(beneficiary, emptyArray());
                    }
                    let arr = self.grcVesting.get(beneficiary)!!;
                    let unlockTs = now() + (spec.lockDays * SECONDS_IN_DAY);
                    arr.append(GrcVestingTranche { amount: returnAmount, unlockAt: unlockTs });
                    self.grcVesting.set(beneficiary, arr);
                }

                if (founderAmount > 0) {
                    self.balances.grcFounderAmount += founderAmount;
                }
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
        require(now() >= self.expiredAt, "Not expired yet");

        if (sender() == self.creator) {
            self._payoutEscrow(sender());
            return;
        }

        if (sender() == self.founder) {
            let deadline = self.expiredAt + (GRACE_PERIOD_DAYS * SECONDS_IN_DAY);
            require(now() >= deadline, "Founder must wait grace period");
            self._payoutEscrow(sender());
            return;
        }

        throw(603); // E603: unauthorized claimant
    }

    inline fun _payoutEscrow(claimant: Address) {
        let usdt = self.balances.usdtAmount;
        self.balances.usdtAmount = 0;
        let grcO = self.balances.grcFounderAmount;
        self.balances.grcFounderAmount = 0;
        let notA = self.balances.notAmount;
        self.balances.notAmount = 0;
        let pxA = self.balances.pxAmount;
        self.balances.pxAmount = 0;
        let dogsA = self.balances.dogsAmount;
        self.balances.dogsAmount = 0;

        if (usdt > 0) {
            sendJettons(claimant, usdt, self.usdtMinterAddress, self.usdtJettonWalletCode, buildJettonPayloadOwner(self.initiativeId));
        }
        if (grcO > 0) {
            sendJettons(claimant, grcO, self.grcMinterAddress, self.grcJettonWalletCode, buildJettonPayloadOwner(self.initiativeId));
        }
        if (notA > 0) {
            sendJettons(claimant, notA, self.notMinterAddress, self.notJettonWalletCode, buildJettonPayloadOwner(self.initiativeId));
        }
        if (pxA > 0) {
            sendJettons(claimant, pxA, self.pxMinterAddress, self.pxJettonWalletCode, buildJettonPayloadOwner(self.initiativeId));
        }
        if (dogsA > 0) {
            sendJettons(claimant, dogsA, self.dogsMinterAddress, self.dogsJettonWalletCode, buildJettonPayloadOwner(self.initiativeId));
        }

        let bal = myBalance();
        if (bal > GAS_RESERVE_TON) {
            let payout = bal - GAS_RESERVE_TON;
            if (payout > 0) {
                message(MessageParameters {
                    to: claimant,
                    value: payout,
                    body: buildTonPayloadOwner(self.initiativeId),
                    mode: 0,
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
