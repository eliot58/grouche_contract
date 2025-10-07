# 🪙 Grouche

**Grouche** is a decentralized **fundraising and vesting system** built on the **TON blockchain**.  
It allows projects (called *initiatives*) to receive donations in TON and multiple Jetton tokens while automatically managing **refunds, payouts, and vesting schedules**.

Each company is deployed as an individual **Grouche contract** via the **GroucheFactory**, which authorizes deployments based on signed requests verified by an authority public key.

---

## 🧠 Overview

- Supports multiple Jetton currencies: **GRC**, **USDT**, **NOT**, **PX**, **DOGS**.  
- Accepts both **TON** and **Jetton** donations.  
- **Before expiration:** donations are forwarded to the company owner.  
- **After expiration:** donations are automatically refunded to donors.  
- Includes **GRC vesting logic** where a portion of tokens is locked and gradually unlocked over time.  
- Each vesting tranche stores:
  - `amount`
  - `unlockAt` (timestamp)
- The factory verifies **digital signatures** from a trusted authority public key before deploying new Grouche instances.

---

## ⚙️ Project Structure

| Folder | Description |
|:--------|:-------------|
| `contracts/` | Smart contracts written in **Tact**. |
| `wrappers/` | TypeScript wrapper classes implementing `Contract` from `ton-core`, including serialization and build helpers. |
| `tests/` | Unit tests for contracts. |
| `scripts/` | Deployment and utility scripts. |

---

## 🚀 Usage

### 🏗 Build

`npx blueprint build`
### or

`yarn blueprint build`

Test

`npx blueprint test`
### or

`yarn blueprint test`

Deploy / Run scripts

`npx blueprint run`
### or

`yarn blueprint run`

Add a new contract

`npx blueprint create ContractName`
### or

`yarn blueprint create ContractName`

## 🧩 Grouche Contract

The Grouche contract manages all fundraising logic, handling incoming donations and distributing them between the owner and GRC vesting accounts.

Constants
`const BPS_DENOM: Int = 10_000;`


Used for percentage calculations in basis points (1 bps = 0.01%).

Structures

GrcVestingSpec — Defines lock duration and return percentage.

GrcVestingTranche — Represents a single vesting tranche with amount and unlockAt.

Array — A mapped dynamic array implementation for vesting tranches.

TierBps — Defines a vesting tier and corresponding BPS rate.

JettonWalletStateInit — Used to deterministically calculate Jetton wallet addresses.

## Messages

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

`buildTonPayloadOwner()` / `buildJettonPayloadOwner()` — Create comments for owner payouts.

`buildTonPayloadRefund()` / `buildJettonPayloadRefund()` — Create comments for refunds.

`calculateJettonWalletAddress()` — Deterministic Jetton wallet address calculation.

`grcTierToParams()` — Defines 5 GRC vesting tiers:

| Tier | Lock (days) | Return BPS | Return % |
|:----:|:------------:|:-----------:|:---------:|
| 1 | 7 | 100 | 1% |
| 2 | 30 | 500 | 5% |
| 3 | 90 | 2000 | 20% |
| 4 | 180 | 4000 | 40% |
| 5 | 365 | 10000 | 100% |

## 🏗 GroucheFactory Contract

GroucheFactory is the factory contract responsible for authorizing and deploying individual Grouche initiative contracts.
Only signed and verified requests from the authority public key can trigger a deployment.

## Messages
FactoryInit

Initializes the factory.

authorityPubKey: uint256 — Ed25519 public key (32 bytes, big-endian) used for verifying signed deployment requests.

Jetton minter addresses: grc, not, usdt, px, dogs.

Jetton wallet codes: grcJettonWalletCode, usdtJettonWalletCode, etc.

Sets owner = sender().

CreateGroucheSigned (op 0xbc7b9b61)

Authorized request to deploy a new Grouche contract.

bundle: SignedBundle — Contains signature and signedData.

`initiativeId: uint64`

`expiredAt: uint64`

Process:

Verifies the digital signature via `verifySignature(self.authorityPubKey)`.

If valid, constructs a Deploy message and deploys a new Grouche contract:

```
deploy(DeployParameters {
    init: initOf Grouche(args),
    mode: SendIgnoreErrors,
    value: ton("1"),
});
```


If invalid, throws with exit code 101.

Withdraw

Owner-only function.

Requires `sender() == owner`.

Transfers remaining funds to the owner with comment "GroucheFactory: withdraw".

## 🧰 Development

Written in Tact

Built and deployed with Blueprint (@ton/blueprint)

TypeScript wrappers auto-generated in wrappers/
