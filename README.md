# 🪙 Grouche

**Grouche** is a decentralized fundraising and vesting system built on the **TON blockchain**.  
It allows **verified projects** (called _initiatives_) to receive donations in **TON** and multiple **Jetton tokens**, while automatically managing **refunds**, **payouts**, and **vesting schedules**.

All initiatives are deployed via a single **Factory contract**, which validates **Ed25519-signed** deployment requests from a trusted authority.

---

## 🧰 Development

```bash
# Build contracts
npx blueprint build

# Run tests
npx blueprint test

# Deploy or execute scripts
npx blueprint run

# Create new contract template
npx blueprint create ContractName
```

## 🪞 Example Lifecycle

```mermaid
sequenceDiagram
    participant O as Founder
    participant F as Factory
    participant C as Creator
    participant I as Initiative
    participant D as Donor

    Note over F: Phase 1: Creation
    C->>F: CreateInitiative (signature, value >= min)
    F->>I: Deploy Initiative Contract

    Note over I: Phase 2: Funding
    D->>I: DonateTon (signed data)
    D->>I: Send Jettons (JettonNotification)
    Note right of I: if GRC: Split between<br/>balances & user returnBps

    Note over I: Phase 3: Claiming
    D->>I: GrcClaim (signed, nonce check)
    I->>D: Transfer GRC Jettons

    rect rgb(240, 240, 240)
        Note over I: Phase 4: Final Settlement (now >= deadline)
        C->>I: CreatorClaim (signed limits)
        I->>C: Send Jettons up to limits + TON payout
        I->>O: Send remainder Jettons + TON remainder
        Note right of I: self.isClaimed = true
    end

    rect rgb(255, 230, 230)
        Note over I: Emergency / Force Claim
        O->>I: FounderClaim (Force)
        I->>O: Send ALL remaining Jettons & TON
    end
```