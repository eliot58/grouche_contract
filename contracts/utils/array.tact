import "./constants.tact";
import "./types.tact";

inline fun emptyArray(): Array {
    return Array { m: emptyMap(), length: 0 };
}

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