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
message(0xcc56750f) ClaimEscrow { }