# 🍽️ CrankFoodie

> Immutable Restaurant Hygiene & Food Safety Reputation System built on Monad.

FoodProof is a decentralized restaurant transparency platform that allows users to submit immutable hygiene-related reports for restaurants around Subang Jaya & Bandar Sunway.

Instead of relying only on traditional reviews, FoodProof focuses on:

- 🪳 Pest sightings
- 🤢 Food poisoning reports
- 🚽 Toilet cleaning logs
- 🧼 Hygiene quality scoring
- 📍 Restaurant geolocation tracking
- 📈 Historical hygiene reputation

All critical reports are stored on-chain using Solidity smart contracts deployed on Monad Testnet.

---

# 🚀 Problem

Restaurant hygiene reports are often:
- Deleted
- Manipulated
- Hidden
- Difficult to verify
- Scattered across platforms

Food poisoning incidents and hygiene issues rarely have a transparent public history.

FoodProof creates a tamper-resistant hygiene ledger for restaurants.

---

# 💡 Solution

FoodProof allows users to:

✅ Report cockroach/fly/rat sightings  
✅ Submit food poisoning incidents  
✅ Track toilet cleaning schedules  
✅ View restaurant hygiene history  
✅ Check hygiene scores  
✅ View restaurant coordinates on map  
✅ Upload evidence via IPFS  
✅ Access immutable public records  

---

# 🌍 Supported Areas (MVP)

Initial MVP focuses on:

- Bandar Sunway
- Subang Jaya
- Sunway Pyramid
- Sunway Square
- SS15
- Taylor’s University area

Example restaurants:
- Kubis & Kale
- Rock Cafe
- Mamak restaurants
- Chicken rice shops
- Pizza restaurants
- Cafeterias
- Mall restaurants

---

# ⚡ Why Monad?

Monad is ideal for FoodProof because:

- High TPS
- Cheap transactions
- EVM compatible
- Supports frequent micro-interactions
- Scalable for community reporting

FoodProof may generate:
- Thousands of daily reports
- Cleaning logs
- Hygiene updates
- Community validations

---

# 🏗️ Architecture

## Smart Contract (Monad)
Stores:
- Restaurant registry
- Hygiene reports
- Cleaning logs
- Report timestamps
- Verification status
- Coordinates
- Hygiene scoring

## Off-Chain Storage (IPFS)
Stores:
- Images
- Evidence photos
- Descriptions
- Metadata

## Frontend
Built with:
- Next.js
- TailwindCSS
- Wagmi/Viem
- Mapbox

---

# 📦 Core Features

## 1. Restaurant Registry

Register restaurants with:
- Name
- Area
- Coordinates
- Price range
- Metadata

---

## 2. Hygiene Reports

Users can submit:
- Cockroach sightings
- Rat sightings
- Dirty toilet reports
- Food poisoning incidents
- Bad smell reports
- Positive cleanliness reports

Each report includes:
- Severity
- Timestamp
- Evidence hash
- Reporter wallet

---

## 3. Toilet Cleaning Logs

Restaurants can log:
- Cleaning time
- Cleaner wallet
- Toilet condition
- Evidence image

Example:
```text
Last cleaned: 3:12 PM
Today's cleaning count: 4
```

---

## 4. Hygiene Score

Calculated from:
- Pest reports
- Food poisoning reports
- Cleaning frequency
- Verified complaints
- Community trust

Example:
```text
Hygiene Score: 86 / 100
```

---

## 5. Map View

Display restaurants using coordinates.

Supports:
- Nearby restaurants
- Hygiene heatmap
- Incident density

---

# 📜 Smart Contract Example

```solidity
struct Restaurant {
    uint256 id;
    string name;
    string area;
    int256 latitude;
    int256 longitude;
    uint8 priceRange;
    bool active;
}

struct Report {
    uint256 id;
    uint256 restaurantId;
    address reporter;
    ReportType reportType;
    uint8 severity;
    string evidenceURI;
    uint256 createdAt;
    bool verified;
}

struct CleaningLog {
    uint256 id;
    uint256 restaurantId;
    address cleaner;
    uint8 cleanlinessScore;
    string evidenceURI;
    uint256 cleanedAt;
}
```

---

# 🪳 Report Types

```solidity
enum ReportType {
    PestCockroach,
    PestFly,
    PestRat,
    FoodPoisoning,
    DirtyToilet,
    DirtyDiningArea,
    BadSmell,
    PositiveCleanliness
}
```

---

# 🗺️ Coordinate Example

Coordinates stored as scaled integers.

```solidity
latitude = 3068500;    // 3.068500
longitude = 101603700; // 101.603700
```

---

# 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Monad Testnet |
| Smart Contract | Solidity |
| Frontend | Next.js |
| Wallet | RainbowKit |
| Web3 Library | Wagmi / Viem |
| Storage | IPFS / Pinata |
| Maps | Mapbox |
| Indexing | Supabase |

---

# 🔐 Future Features

- DAO verification system
- Restaurant response portal
- AI hygiene risk prediction
- Government inspection integration
- QR-based restaurant hygiene scanning
- zkProof anonymous reporting
- Reward system for trusted reporters

---

# 📈 Example Use Case

A customer visits a restaurant and notices:
- Cockroaches near kitchen
- Dirty toilet
- Strong bad smell

They:
1. Open FoodProof
2. Select restaurant
3. Upload evidence
4. Submit report on Monad

The report becomes immutable and publicly viewable.

Future customers can see:
- Hygiene history
- Cleaning frequency
- Community trust score

---

# 🚧 Hackathon Scope (MVP)

## Smart Contract
- Restaurant registration
- Hygiene report submission
- Cleaning log submission
- Read functions

## Frontend
- Restaurant list
- Map view
- Report modal
- Hygiene dashboard

## Optional Stretch Goals
- IPFS image upload
- Wallet reputation
- Report verification

---
