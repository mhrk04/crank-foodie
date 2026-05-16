import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function scoreTone(score: number | null | undefined) {
  if (typeof score !== "number") return "bg-steel text-ink";
  if (score >= 85) return "bg-leaf text-white";
  if (score >= 70) return "bg-amber text-ink";
  return "bg-tomato text-white";
}

export function formatScore(score: number | null | undefined) {
  return typeof score === "number" ? String(score) : "N/A";
}

export function ipfsToGateway(uri: string) {
  if (!uri.startsWith("ipfs://")) return uri;
  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://jade-patient-viper-512.mypinata.cloud";
  return `${gateway}/ipfs/${uri.replace("ipfs://", "")}`;
}
