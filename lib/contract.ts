import type { Abi } from "viem";

export const crankFoodieAddress = (process.env.NEXT_PUBLIC_CRANKFOODIE_CONTRACT_ADDRESS ||
  "0x2c14dd42a09a0f32ad9fddaff62c1f85cb56b50e") as `0x${string}`;

export const reportTypeOptions = [
  { label: "Pest object", value: "PestObject", contractValue: 0 },
  { label: "Food poisoning", value: "FoodPoisoning", contractValue: 1 },
  { label: "Dirty toilet", value: "DirtyToilet", contractValue: 2 },
  { label: "Dirty dining", value: "DirtyDiningArea", contractValue: 3 },
  { label: "Bad smell", value: "BadSmell", contractValue: 4 },
  { label: "Cleanliness praise", value: "PositiveCleanliness", contractValue: 5 }
] as const;

export const crankFoodieAbi = [
  {
    type: "function",
    name: "getRestaurant",
    stateMutability: "view",
    inputs: [{ name: "restaurantId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "name", type: "string" },
          { name: "area", type: "string" },
          { name: "latitude", type: "string" },
          { name: "longitude", type: "string" },
          { name: "priceRange", type: "uint256" },
          { name: "metadataURI", type: "string" },
          { name: "active", type: "bool" },
          { name: "registeredBy", type: "address" },
          { name: "createdAt", type: "uint256" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "getReport",
    stateMutability: "view",
    inputs: [{ name: "reportId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "restaurantId", type: "uint256" },
          { name: "reporter", type: "address" },
          { name: "reportType", type: "uint8" },
          { name: "severity", type: "uint8" },
          { name: "starRating", type: "uint8" },
          { name: "evidenceURIs", type: "string[]" },
          { name: "detailsURI", type: "string" },
          { name: "createdAt", type: "uint256" },
          { name: "verified", type: "bool" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "getRestaurantReportIds",
    stateMutability: "view",
    inputs: [{ name: "restaurantId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }]
  },
  {
    type: "function",
    name: "registerRestaurant",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "area", type: "string" },
      { name: "latitude", type: "string" },
      { name: "longitude", type: "string" },
      { name: "priceRange", type: "uint256" },
      { name: "metadataURI", type: "string" }
    ],
    outputs: [{ name: "restaurantId", type: "uint256" }]
  },
  {
    type: "function",
    name: "submitReport",
    stateMutability: "nonpayable",
    inputs: [
      { name: "restaurantId", type: "uint256" },
      { name: "reportType", type: "uint8" },
      { name: "severity", type: "uint8" },
      { name: "starRating", type: "uint8" },
      { name: "evidenceURIs", type: "string[]" },
      { name: "detailsURI", type: "string" }
    ],
    outputs: [{ name: "reportId", type: "uint256" }]
  },
  {
    type: "function",
    name: "submitCleaningLog",
    stateMutability: "nonpayable",
    inputs: [
      { name: "restaurantId", type: "uint256" },
      { name: "cleanlinessScore", type: "uint8" },
      { name: "evidenceURI", type: "string" }
    ],
    outputs: [{ name: "cleaningLogId", type: "uint256" }]
  },
  {
    type: "function",
    name: "calculateHygieneScore",
    stateMutability: "view",
    inputs: [{ name: "restaurantId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }]
  },
  {
    type: "function",
    name: "restaurantCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "event",
    name: "HygieneReportSubmitted",
    inputs: [
      { indexed: true, name: "reportId", type: "uint256" },
      { indexed: true, name: "restaurantId", type: "uint256" },
      { indexed: true, name: "reporter", type: "address" },
      { indexed: false, name: "reportType", type: "uint8" },
      { indexed: false, name: "severity", type: "uint8" },
      { indexed: false, name: "starRating", type: "uint8" },
      { indexed: false, name: "imageCount", type: "uint256" }
    ]
  }
] as const satisfies Abi;
