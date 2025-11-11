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
    length: Int as int257 = 0;
}

struct Balances {
    usdtAmount: Int as coins;
    grcFounderAmount: Int as coins;
    notAmount: Int as coins;
    pxAmount: Int as coins;
    dogsAmount: Int as coins;
}