const BPS_DENOM: Int = 10_000;

struct GrcVestingSpec {
    lockDays: Int as uint64;
    returnBps: Int;
}

message(0xac564295) Deploy {
    owner: Address;
    companyId: Int as uint64;
    expiredAt: Int as uint64;

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

message(0x2a817227) DonateTon { }

message(0xd2b343f4) ClaimGrcVesting {
    index: Int;
}

message(0x7362d09c) JettonNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    sender: Address;
    forwardPayload: Slice as remaining;
}

message(0xf8a7ea5) JettonTransfer {
    queryId: Int as uint64;
    amount: Int as coins;
    destination: Address;
    responseDestination: Address?;
    customPayload: Cell?;
    forwardTonAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

struct JettonWalletStateInit {
    balance: Int as coins = 0;
    owner: Address;
    master: Address;
    jettonWalletCode: Cell;
}

struct GrcVestingTranche {
    amount: Int as coins;
    unlockAt: Int as uint64;
}

struct Array {
    m: map<Int as uint16, GrcVestingTranche>;
    length: Int = 0;
}

struct TierBps {
    tier: Int;
    bps: Int;
}

const MaxArraySize: Int = 5_000;

inline extends mutates fun append(self: Array, item: GrcVestingTranche) {
    require(self.length + 1 <= MaxArraySize, "No space in the array left for new items!");

    self.m.set(self.length, item);
    self.length += 1;
}

extends fun getIdx(self: Array, idx: Int): GrcVestingTranche {
    require(self.length > 0, "No items in the array!");
    require(idx >= 0, "Index of the item cannot be negative!");
    require(idx < self.length, "Index is out of array bounds!");

    return self.m.get(idx)!!;
}

inline extends mutates fun deleteIdx(self: Array, idx: Int): GrcVestingTranche {
    require(self.length > 0, "No items in the array to delete!");
    require(idx >= 0, "Index of the item cannot be negative!");
    require(idx < self.length, "Index is out of array bounds!");

    let memorized: GrcVestingTranche = self.m.get(idx)!!;

    let i: Int = idx;
    while (i + 1 < self.length) {
        self.m.set(i, self.m.get(i + 1)!!);
        i += 1;
    }

    self.m.set(self.length - 1, null);
    self.length -= 1;

    return memorized;
}

inline fun buildTonPayloadOwner(companyId: Int): Cell {
    let b = beginCell();
    let _ = b.storeSlice(("Grouche: owner payout").asComment().beginParse());
    let _ = b.storeUint(companyId, 64);
    return b.endCell();
}

inline fun buildJettonPayloadOwner(companyId: Int): Slice {
    let b = beginCell();
    let _ = b.storeSlice(("Grouche: owner payout").asComment().beginParse());
    let _ = b.storeUint(companyId, 64);
    return b.asSlice();
}

inline fun buildJettonPayloadClaim(companyId: Int): Slice {
    let b = beginCell();
    let _ = b.storeSlice(("Grouche: GRC claim").asComment().beginParse());
    let _ = b.storeUint(companyId, 64);
    return b.asSlice();
}

inline fun buildTonPayloadRefund(companyId: Int): Cell {
    let b = beginCell();
    let _ = b.storeSlice(("Grouche: refund company expired").asComment().beginParse());
    let _ = b.storeUint(companyId, 64);
    return b.endCell();
}

inline fun buildJettonPayloadRefund(companyId: Int): Slice {
    let b = beginCell();
    let _ = b.storeSlice(("Grouche: refund company expired").asComment().beginParse());
    let _ = b.storeUint(companyId, 64);
    return b.asSlice();
}

inline fun emptyArray(): Array {
    return Array { m: emptyMap(), length: 0 };
}

contract Grouche {
    owner: Address;
    companyId: Int as uint64;
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

    grcVesting: map<Address, Array>;

    init(msg: Deploy) {
        self.owner = msg.owner;
        self.companyId = msg.companyId;
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

        self.grcVesting = emptyMap();
    }

    receive() {}

    receive(msg: DonateTon) {
        if (now() >= self.expiredAt) {
            message(MessageParameters {
                to: sender(),
                value: 0,
                body: buildTonPayloadRefund(self.companyId),
                mode: SendRemainingValue,
            });
            return;
        }

        message(MessageParameters {
            to: self.owner,
            value: 0,
            body: buildTonPayloadOwner(self.companyId),
            mode: SendRemainingValue,
        });
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

        sendJettons(addr, item.amount, self.grcMinterAddress, self.grcJettonWalletCode, buildJettonPayloadClaim(self.companyId));
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
                sendJettons(msg.sender, msg.amount, self.usdtMinterAddress, self.usdtJettonWalletCode, buildJettonPayloadRefund(self.companyId));
            } else if (sender() == thisGrc) {
                sendJettons(msg.sender, msg.amount, self.grcMinterAddress, self.grcJettonWalletCode, buildJettonPayloadRefund(self.companyId));
            } else if (sender() == thisNot) {
                sendJettons(msg.sender, msg.amount, self.notMinterAddress, self.notJettonWalletCode, buildJettonPayloadRefund(self.companyId));
            } else if (sender() == thisPx) {
                sendJettons(msg.sender, msg.amount, self.pxMinterAddress, self.pxJettonWalletCode, buildJettonPayloadRefund(self.companyId));
            } else if (sender() == thisDogs) {
                sendJettons(msg.sender, msg.amount, self.dogsMinterAddress, self.dogsJettonWalletCode, buildJettonPayloadRefund(self.companyId));
            } else {
                throw(101);
            }
            return;
        }

        if (sender() == thisUsdt) {
            sendJettons(self.owner, msg.amount, self.usdtMinterAddress, self.usdtJettonWalletCode, buildJettonPayloadOwner(self.companyId));
        } else if (sender() == thisGrc) {
            if (msg.amount >= ton("100")) {
                let payload = msg.forwardPayload;

                require(payload.bits() >= 8, "GRC: payload missing tier");
                let tier = payload.loadUint(8);

                let beneficiary = msg.sender;

                let spec = grcTierToParams(tier);
                require(spec.lockDays > 0, "GRC: unknown vesting tier");

                let returnAmount = (msg.amount * spec.returnBps) / BPS_DENOM;
                let ownerAmount = msg.amount - returnAmount;

                if (returnAmount > 0) {
                    if (!self.grcVesting.exists(beneficiary)) {
                        self.grcVesting.set(beneficiary, emptyArray());
                    }
                    let arr = self.grcVesting.get(beneficiary)!!;
                    let unlockTs = now() + (spec.lockDays * 86400);
                    arr.append(GrcVestingTranche { amount: returnAmount, unlockAt: unlockTs });
                    self.grcVesting.set(beneficiary, arr);
                }

                if (ownerAmount > 0) {
                    sendJettons(self.owner, ownerAmount, self.grcMinterAddress, self.grcJettonWalletCode, buildJettonPayloadOwner(self.companyId));
                }
            }
        } else if (sender() == thisNot) {
            sendJettons(self.owner, msg.amount, self.notMinterAddress, self.notJettonWalletCode, buildJettonPayloadOwner(self.companyId));
        } else if (sender() == thisPx) {
            sendJettons(self.owner, msg.amount, self.pxMinterAddress, self.pxJettonWalletCode, buildJettonPayloadOwner(self.companyId));
        } else if (sender() == thisDogs) {
            sendJettons(self.owner, msg.amount, self.dogsMinterAddress, self.dogsJettonWalletCode, buildJettonPayloadOwner(self.companyId));
        } else {
            throw(101);
        }
    }

    get fun getGrcVesting(addr: Address): Array? {
        let vesting = self.grcVesting.get(addr);
        return vesting;
    }
}

fun sendJettons(receiver: Address, amount: Int, minterAddress: Address, jettonWalletCode: Cell, forwardPayload: Slice) {
    let thisContractJettonWallet = calculateJettonWalletAddress(
        myAddress(),
        minterAddress,
        jettonWalletCode,
    );

    message(MessageParameters {
        to: thisContractJettonWallet,
        value: 0,
        body: JettonTransfer {
            queryId: 0,
            amount,
            destination: receiver,
            responseDestination: myAddress(),
            customPayload: null,
            forwardTonAmount: 0,
            forwardPayload,
        }.toCell(),
        mode: SendRemainingValue,
    });
}

inline fun calculateJettonWalletAddress(owner: Address, minterAddress: Address, jettonWalletCode: Cell): Address {
    let initData = getJettonWalletStateInit(owner, minterAddress, jettonWalletCode);
    return contractAddress(StateInit { code: jettonWalletCode, data: initData });
}

inline fun getJettonWalletStateInit(owner: Address, minterAddress: Address, jettonWalletCode: Cell): Cell {
    return JettonWalletStateInit {
        owner,
        master: minterAddress,
        jettonWalletCode,
    }.toCell();
}

inline fun grcTierToParams(tier: Int): GrcVestingSpec {
    if (tier == 1) {
        return GrcVestingSpec { lockDays: 7, returnBps: 100 };
    }
    if (tier == 2) {
        return GrcVestingSpec { lockDays: 30, returnBps: 500 };
    }
    if (tier == 3) {
        return GrcVestingSpec { lockDays: 90, returnBps: 2000 };
    }
    if (tier == 4) {
        return GrcVestingSpec { lockDays: 180, returnBps: 4000 };
    }
    if (tier == 5) {
        return GrcVestingSpec { lockDays: 365, returnBps: 10000 };
    }

    return GrcVestingSpec { lockDays: 0, returnBps: 0 };
}
