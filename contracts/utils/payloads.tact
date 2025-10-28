inline fun buildTonPayloadOwner(initiativeId: Int): Cell {
    let b = beginCell();
    let _ = b.storeSlice(("Grouche: owner payout").asComment().beginParse());
    let _ = b.storeUint(initiativeId, 32);
    return b.endCell();
}

inline fun buildJettonPayloadOwner(initiativeId: Int): Slice {
    let b = beginCell();
    let _ = b.storeSlice(("Grouche: owner payout").asComment().beginParse());
    let _ = b.storeUint(initiativeId, 32);
    return b.asSlice();
}

inline fun buildJettonPayloadClaim(initiativeId: Int): Slice {
    let b = beginCell();
    let _ = b.storeSlice(("Grouche: GRC claim").asComment().beginParse());
    let _ = b.storeUint(initiativeId, 32);
    return b.asSlice();
}

inline fun buildTonPayloadRefund(initiativeId: Int): Cell {
    let b = beginCell();
    let _ = b.storeSlice(("Grouche: refund initiative expired").asComment().beginParse());
    let _ = b.storeUint(initiativeId, 32);
    return b.endCell();
}

inline fun buildJettonPayloadRefund(initiativeId: Int): Slice {
    let b = beginCell();
    let _ = b.storeSlice(("Grouche: refund initiative expired").asComment().beginParse());
    let _ = b.storeUint(initiativeId, 32);
    return b.asSlice();
}