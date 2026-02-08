inline fun returnBpsByLockDays(lockDays: Int): Int {
    if (lockDays == 7) {
        return 100;
    }
    if (lockDays == 30) {
        return 500;
    }
    if (lockDays == 90) {
        return 2000;
    }
    if (lockDays == 180) {
        return 4000;
    }
    if (lockDays == 365) {
        return 10000;
    }

    return 0;
}
