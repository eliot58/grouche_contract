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

message(0xc959163f) Withdraw {}

message(0x11405c24) ChangeMinCreationValue {
    newMin: Int as coins;
}

message(0xbc7b9b61) CreateInitiative {
    signature: Slice as bytes64;
    signedData: Slice;
}

message(0xac564295) InitiativeInit {
    pub: Int as uint256;
    
    founder: Address;
    creator: Address;
    initiativeId: Int as uint32;
    isRegular: Bool;
    deadline: Int as uint64;

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

message(0xac564295) FoundationInit {
    pub: Int as uint256;
    
    founder: Address;
    creator: Address;
    initiativeId: Int as uint32;
    deadline: Int as uint64;

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

message(0xac564295) RegularInit {
    pub: Int as uint256;
    
    founder: Address;
    creator: Address;
    initiativeId: Int as uint32;
    deadline: Int as uint64;

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

message(0x2a817227) DonateTon {
    signature: Slice as bytes64;
    signedData: Slice;
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

message(0xb9ffbeb5) GrcClaim {
    signature: Slice as bytes64;
    signedData: Slice;
}

message(0x38a2bd34) FounderClaim {}

message(0x93d5d5fe) CreatorClaim {
    signature: Slice as bytes64;
    signedData: Slice;
}