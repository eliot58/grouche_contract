Grouche

Grouche is a decentralized fundraising and vesting system built on the TON blockchain.
It allows projects (called companies) to receive donations in TON and multiple Jetton tokens, while automatically handling refunds, payouts, and vesting schedules.

Each company is deployed as an individual Grouche contract through the GroucheFactory, which authorizes deployments based on signed requests verified by an authority public key.

🧠 Overview

Supports multiple Jetton currencies (GRC, USDT, NOT, PX, DOGS).

Accepts both TON and Jetton donations.

Before expiration: donations are forwarded to the company owner.

After expiration: donations are automatically refunded to donors.

Includes GRC vesting logic where part of the donated tokens is locked and gradually unlocked over time.

Each vesting tranche stores an amount and unlockAt timestamp.

The factory verifies digital signatures from a trusted public key before deploying new Grouche instances.

⚙️ Project structure

contracts/ — Source code of all smart contracts written in Tact.

wrappers/ — TypeScript wrapper classes implementing Contract from ton-core, including serialization and build helpers.

tests/ — Unit tests for contracts.

scripts/ — Deployment and utility scripts.

🚀 Usage
Build
npx blueprint build
# or
yarn blueprint build

Test
npx blueprint test
# or
yarn blueprint test

Deploy / Run scripts
npx blueprint run
# or
yarn blueprint run

Add a new contract
npx blueprint create ContractName
# or
yarn blueprint create ContractName

🧩 Grouche Contract

The Grouche contract manages all fundraising logic, handling incoming donations and distributing them between the owner and GRC vesting accounts.

Constants
const BPS_DENOM: Int = 10_000;


Used for percentage calculations in basis points (1 bps = 0.01%).

Structures

GrcVestingSpec — Defines lock duration and return percentage.

GrcVestingTranche — Represents a single vesting tranche with amount and unlockAt.

Array — A mapped dynamic array implementation for vesting tranches.

TierBps — Defines a vesting tier and corresponding BPS rate.

JettonWalletStateInit — Used to deterministically calculate Jetton wallet addresses.

Messages

Deploy — Initializes the contract.

DonateTon — Handles incoming TON donations (refund or payout).

ClaimGrcVesting — Allows donors to unlock vested GRC tokens after the vesting period.

JettonNotification — Handles incoming Jetton transfers and applies vesting logic.

JettonTransfer — Internal Jetton transfer format.

Behavior
Before expiration

All TON and Jetton donations are forwarded to the owner.

For GRC donations, part of the tokens is allocated for vesting based on the tier.

After expiration

Any incoming TON or Jetton transfers are refunded to senders.

Vesting

Donors can call ClaimGrcVesting to unlock GRC tokens after unlockAt has passed.

Utility functions

buildTonPayloadOwner() / buildJettonPayloadOwner() — Create comments for owner payouts.

buildTonPayloadRefund() / buildJettonPayloadRefund() — Create comments for refunds.

calculateJettonWalletAddress() — Deterministic Jetton wallet address calculation.

grcTierToParams() — Defines 5 GRC vesting tiers:

Tier	Lock (days)	Return BPS	Return %
1	7	100	1%
2	30	500	5%
3	90	2000	20%
4	180	4000	40%
5	365	10000	100%
🏗 GroucheFactory Contract

GroucheFactory is the factory contract responsible for authorizing and deploying individual Grouche company contracts.
Only signed and verified requests from the authority public key can trigger a deployment.

Messages
FactoryInit (op 0xae37766f)

Initializes the factory.

authorityPubKey: uint256 — Ed25519 public key (32 bytes, big-endian) used for verifying signed deployment requests.

Jetton minter addresses: grc, not, usdt, px, dogs.

Jetton wallet codes: grcJettonWalletCode, usdtJettonWalletCode, etc.

Sets owner = sender().

CreateGroucheSigned (op 0xbc7b9b61)

Authorized request to deploy a new Grouche contract.

bundle: SignedBundle — Contains signature and signedData.

companyId: uint64

expiredAt: uint64

Process:

Verifies the digital signature via verifySignature(self.authorityPubKey).

If valid, constructs a Deploy message and deploys a new Grouche contract:

deploy(DeployParameters {
    init: initOf Grouche(args),
    mode: SendIgnoreErrors,
    value: ton("1"),
});


If invalid, throws with exit code 101.

Withdraw (op 0xc959163f)

Owner-only function.

Requires sender() == owner.

Transfers remaining funds to the owner with comment "GroucheFactory: withdraw".

🔐 Signature Verification

The factory uses this inline verifier:

inline extends fun verifySignature(self: SignedBundle, publicKey: Int): Bool {
    return checkSignature(self.signedData.hash(), self.signature, publicKey);
}


So your client must:

Build signedData (a cell with companyId:uint64 | expiredAt:uint64).

Compute hash = signedData.hash() — this is the cell’s internal representation hash, not sha256(BOC).

Sign the hash using Ed25519:

signature = nacl.sign.detached(hash, secretKey);


Send:

bundle.signature = Buffer.from(signature);
bundle.signedData = signedDataCell.beginParse();

🧪 Off-chain checklist

Derive publicKey from your AUTH_PRIVKEY_HEX (32-byte seed → 64-byte secretKey → publicKey).

Verify that get_authority_pubkey() from the factory matches your computed key (uint256 big-endian).

Build signedData (companyId, expiredAt), compute hash = cell.hash().

Sign the hash using Ed25519.

Validate locally:

nacl.sign.detached.verify(hash, signature, publicKey); // must be true


Send CreateGroucheSigned to the bounceable factory address (EQ...).

Use value: ton("0.5" – "1") to cover deployment gas.

🧭 Security notes

authorityPubKey must be stored big-endian as uint256.

Exit code 101 → invalid signature or corrupted payload.

Always use bounceable (EQ...) addresses for calls.

Deployment value ton("1") is recommended for safe child deployment.

Withdraw is restricted to the factory owner.

🧰 Development

Written in Tact

Built and deployed with Blueprint (@ton/blueprint)

TypeScript wrappers auto-generated in wrappers/
