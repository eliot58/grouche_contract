struct JettonWalletStateInit {
    balance: Int as coins = 0;
    owner: Address;
    master: Address;
    jettonWalletCode: Cell;
}

struct GovernanceJettonWalletStateInit {
    status: Int as uint4 = 0;
    balance: Int as coins = 0;
    owner: Address;
    minter: Address;
}

struct Balances {
    usdtAmount: Int as coins;
    grcAmount: Int as coins;
    notAmount: Int as coins;
    pxAmount: Int as coins;
    dogsAmount: Int as coins;
}

struct InitiativeInfo {
    initiativeId: Int as uint32;
    isRegular: Bool;
    deadline: Int as uint64;
}