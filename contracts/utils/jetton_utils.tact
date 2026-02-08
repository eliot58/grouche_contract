import "./types.tact";

fun sendJettons(
    receiver: Address,
    amount: Int,
    minterAddress: Address,
    jettonWalletCode: Cell
) {
    let thisContractJettonWallet = calculateJettonWalletAddress(
        myAddress(),
        minterAddress,
        jettonWalletCode,
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
    jettonWalletCode: Cell
): Address {
    let initData = getJettonWalletInitData(owner, minterAddress, jettonWalletCode);
    return contractAddress(StateInit { code: jettonWalletCode, data: initData });
}

inline fun getJettonWalletInitData(
    owner: Address,
    minterAddress: Address,
    jettonWalletCode: Cell
): Cell {
    return JettonWalletStateInit {
        owner,
        master: minterAddress,
        jettonWalletCode,
    }.toCell();
}
