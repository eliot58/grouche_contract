import "./types";

inline fun grcTierToParams(tier: Int): GrcVestingSpec {
    if (tier == 1) {
        return GrcVestingSpec { lockDays: 7,   returnBps: 100 };
    }
    if (tier == 2) {
        return GrcVestingSpec { lockDays: 30,  returnBps: 500 };
    }
    if (tier == 3) {
        return GrcVestingSpec { lockDays: 90,  returnBps: 2000 };
    }
    if (tier == 4) {
        return GrcVestingSpec { lockDays: 180, returnBps: 4000 };
    }
    if (tier == 5) {
        return GrcVestingSpec { lockDays: 365, returnBps: 10000 };
    }
    return GrcVestingSpec { lockDays: 0, returnBps: 0 };
}
