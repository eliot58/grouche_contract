import "./types.tact";

fun sendJettons(
    receiver: Address,
    amount: Int,
    minterAddress: Address,
    jettonWalletCode: Cell,
    grcMinterAddress: Address
) {
    let thisContractJettonWallet = calculateJettonWalletAddress(
        myAddress(),
        minterAddress,
        jettonWalletCode,
        grcMinterAddress
    );

    message(MessageParameters {
        to: thisContractJettonWallet,
        value: ton("0.05"),
        body: JettonTransfer {
            queryId: 0,
            amount,
            destination: receiver,
            responseDestination: myAddress(),
            customPayload: null,
            forwardTonAmount: 0,
            forwardPayload: beginCell().storeMaybeRef(null).asSlice(),
        }.toCell()
    });
}

inline fun calculateJettonWalletAddress(
    owner: Address,
    minterAddress: Address,
    jettonWalletCode: Cell,
    grcMinterAddress: Address
): Address {
    let initData = getJettonWalletInitData(owner, minterAddress, jettonWalletCode, grcMinterAddress);
    return contractAddress(StateInit { code: jettonWalletCode, data: initData });
}

inline fun getJettonWalletInitData(
    owner: Address,
    minterAddress: Address,
    jettonWalletCode: Cell,
    grcMinterAddress: Address
): Cell {
    // Если это GRC - используем JettonWalletStateInit с ref(code)
    if (minterAddress == grcMinterAddress) {
        return JettonWalletStateInit {
            owner: owner,
            master: minterAddress,
            jettonWalletCode: jettonWalletCode
        }.toCell();
    }
    
    // Если это Governance (USDT и др.) - используем GovernanceJettonWalletStateInit БЕЗ ref
    return GovernanceJettonWalletStateInit {
        owner: owner,
        minter: minterAddress
    }.toCell();
}