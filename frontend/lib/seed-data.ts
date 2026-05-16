import type { Restaurant } from "@/lib/types";

export const seedRestaurants: Restaurant[] = [
  {
    id: 1,
    name: "Kubis & Kale",
    area: "Bandar Sunway",
    latitude: 3.0685,
    longitude: 101.6037,
    priceRange: 2,
    score: 86,
    reportCount: 11,
    cleaningCountToday: 4,
    lastCleanedAt: "3:12 PM",
    tags: ["Mall", "High traffic", "Recent cleaning"]
  },
  {
    id: 2,
    name: "Rock Cafe",
    area: "Sunway Square",
    latitude: 3.0709,
    longitude: 101.607,
    priceRange: 1,
    score: 71,
    reportCount: 22,
    cleaningCountToday: 2,
    lastCleanedAt: "1:48 PM",
    tags: ["Open air", "Student area", "Needs review"]
  },
  {
    id: 3,
    name: "SS15 Chicken Rice",
    area: "SS15",
    latitude: 3.0744,
    longitude: 101.5888,
    priceRange: 1,
    score: 92,
    reportCount: 5,
    cleaningCountToday: 5,
    lastCleanedAt: "4:05 PM",
    tags: ["Positive reports", "Verified logs"]
  },
  {
    id: 4,
    name: "Taylor's Lakeside Cafeteria",
    area: "Taylor's University",
    latitude: 3.0624,
    longitude: 101.6169,
    priceRange: 2,
    score: 80,
    reportCount: 9,
    cleaningCountToday: 3,
    lastCleanedAt: "2:37 PM",
    tags: ["Campus", "Lunch rush"]
  }
];

export const supportedAreas = [
  "Bandar Sunway",
  "Subang Jaya",
  "Sunway Pyramid",
  "Sunway Square",
  "SS15",
  "Taylor's University"
];

