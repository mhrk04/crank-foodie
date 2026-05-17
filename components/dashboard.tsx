"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount, usePublicClient, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  Bug,
  ClipboardCheck,
  Filter,
  MapPin,
  Plus,
  Search,
  Store
} from "lucide-react";
import { WalletButton } from "@/components/wallet-button";
import { RestaurantMap } from "@/components/restaurant-map";
import { ReportModal } from "@/components/report-modal";
import { CleaningLogModal } from "@/components/cleaning-log-modal";
import { crankFoodieAbi, crankFoodieAddress, reportTypeOptions } from "@/lib/contract";
import { supportedAreas } from "@/lib/seed-data";
import type { CleaningLogDraft, ReportDraft, Restaurant } from "@/lib/types";
import { cn, formatScore, scoreTone } from "@/lib/utils";

const emptyRestaurantForm = {
  name: "",
  area: "Bandar Sunway",
  latitude: "3, Jalan PJS 11/15, Bandar Sunway",
  longitude: "47500 Subang Jaya, Selangor",
  priceRange: "10",
  metadataURI: ""
};

const RPC_READ_SPACING_MS = 90;
const RPC_RATE_LIMIT_BACKOFF_MS = 1_250;

type OnChainRestaurant = Record<string, unknown> & readonly unknown[];

function readStructValue<T>(item: OnChainRestaurant, key: string, index: number) {
  return (item[key] ?? item[index]) as T | undefined;
}

function coordinatesFromContract(latitudeValue: string, longitudeValue: string, index: number) {
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return [latitude, longitude] as const;
  }

  const offsets = [
    [0, 0],
    [0.0024, 0.0033],
    [0.0059, -0.0149],
    [-0.0061, 0.0132],
    [0.0101, -0.0031],
    [-0.0104, -0.0062]
  ];
  const [latOffset, lngOffset] = offsets[index % offsets.length];
  return [3.0685 + latOffset, 101.6037 + lngOffset] as const;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function isRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("rate") || message.includes("429") || message.includes("-32011");
}

export function Dashboard() {
  const [selectedId, setSelectedId] = useState(0);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("All");
  const [showRegister, setShowRegister] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState(emptyRestaurantForm);
  const [reportTarget, setReportTarget] = useState<Restaurant | null>(null);
  const [cleaningTarget, setCleaningTarget] = useState<Restaurant | null>(null);
  const [notice, setNotice] = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(true);
  const [restaurantReadError, setRestaurantReadError] = useState("");
  const [scoreWarning, setScoreWarning] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const lastConfirmedHashRef = useRef<`0x${string}` | undefined>(undefined);

  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: hash, isPending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const hasContract = Boolean(crankFoodieAddress);
  const canWrite = hasContract && isConnected;
  const isSubmitting = isPending || isConfirming;

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((restaurant) => {
      const matchesArea = area === "All" || restaurant.area === area;
      const matchesQuery = `${restaurant.name} ${restaurant.area} ${restaurant.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase());
      return matchesArea && matchesQuery;
    });
  }, [area, query, restaurants]);

  const selectedRestaurant = restaurants.find((restaurant) => restaurant.id === selectedId) || restaurants[0] || null;
  const totalRestaurantCount = String(restaurants.length);
  const issueCount = restaurants.reduce((sum, restaurant) => sum + restaurant.reportCount, 0);
  const cleaningCount = restaurants.reduce((sum, restaurant) => sum + restaurant.cleaningCountToday, 0);

  useEffect(() => {
    if (hash && isSuccess && lastConfirmedHashRef.current !== hash) {
      lastConfirmedHashRef.current = hash;
      setRefreshNonce((value) => value + 1);
    }
  }, [hash, isSuccess]);

  useEffect(() => {
    if (!publicClient || !hasContract) {
      setIsLoadingRestaurants(false);
      return;
    }

    const client = publicClient;
    let isCancelled = false;
    let lastReadStartedAt = 0;

    async function waitForReadSlot() {
      const elapsed = Date.now() - lastReadStartedAt;
      if (elapsed < RPC_READ_SPACING_MS) {
        await sleep(RPC_READ_SPACING_MS - elapsed);
      }
      lastReadStartedAt = Date.now();
    }

    async function readContractWithRetry<T>(request: Parameters<typeof client.readContract>[0]) {
      try {
        await waitForReadSlot();
        return (await client.readContract(request)) as T;
      } catch (error) {
        if (!isRateLimitError(error)) {
          throw error;
        }

        await sleep(RPC_RATE_LIMIT_BACKOFF_MS);
        await waitForReadSlot();
        return (await client.readContract(request)) as T;
      }
    }

    async function loadRestaurants() {
      setIsLoadingRestaurants(true);
      setRestaurantReadError("");
      setScoreWarning("");

      try {
        const count = Number(
          await readContractWithRetry<bigint>({
            address: crankFoodieAddress,
            abi: crankFoodieAbi,
            functionName: "restaurantCount"
          })
        );

        if (count === 0) {
          if (!isCancelled) {
            setRestaurants([]);
          }
          return;
        }

        // Construct all multicall requests
        const calls = [];
        for (let index = 0; index < count; index++) {
          const restaurantId = BigInt(index + 1);
          calls.push(
            {
              address: crankFoodieAddress,
              abi: crankFoodieAbi,
              functionName: "getRestaurant",
              args: [restaurantId]
            },
            {
              address: crankFoodieAddress,
              abi: crankFoodieAbi,
              functionName: "calculateHygieneScore",
              args: [restaurantId]
            },
            {
              address: crankFoodieAddress,
              abi: crankFoodieAbi,
              functionName: "getRestaurantReportIds",
              args: [restaurantId]
            },
            {
              address: crankFoodieAddress,
              abi: crankFoodieAbi,
              functionName: "getRestaurantCleaningLogIds",
              args: [restaurantId]
            }
          );
        }

        // Execute all requests in a single multicall!
        const results = (await client.multicall({
          contracts: calls,
          allowFailure: true
        })) as any[];

        const nextRestaurants: Restaurant[] = [];
        const scoreReadFailures: number[] = [];

        for (let index = 0; index < count; index++) {
          const restaurantId = BigInt(index + 1);
          const baseIndex = index * 4;

          const getRes = results[baseIndex];
          const getScore = results[baseIndex + 1];
          const getReports = results[baseIndex + 2];
          const getCleanings = results[baseIndex + 3];

          // If the primary getRestaurant call failed, we skip this restaurant
          if (!getRes || getRes.status !== "success" || !getRes.result) {
            continue;
          }

          const item = getRes.result as any;
          const parsedId = Number(readStructValue<bigint>(item, "id", 0) || restaurantId);
          const rawLatitude = String(readStructValue<string>(item, "latitude", 3) || "");
          const rawLongitude = String(readStructValue<string>(item, "longitude", 4) || "");
          const [latitude, longitude] = coordinatesFromContract(rawLatitude, rawLongitude, nextRestaurants.length);

          let score: number | null = null;
          if (getScore && getScore.status === "success" && getScore.result !== undefined) {
            score = Number(getScore.result);
          } else {
            scoreReadFailures.push(parsedId);
          }

          const reportIds = (getReports && getReports.status === "success" ? (getReports.result as bigint[]) : []) || [];
          const cleaningIds = (getCleanings && getCleanings.status === "success" ? (getCleanings.result as bigint[]) : []) || [];

          nextRestaurants.push({
            id: parsedId,
            name: String(readStructValue<string>(item, "name", 1) || `Restaurant ${parsedId}`),
            area: String(readStructValue<string>(item, "area", 2) || "Monad Testnet"),
            latitude,
            longitude,
            priceRange: Number(readStructValue<bigint>(item, "priceRange", 5) || BigInt(0)),
            metadataURI: String(readStructValue<string>(item, "metadataURI", 6) || ""),
            score,
            reportCount: reportIds.length,
            cleaningCountToday: cleaningIds.length,
            lastCleanedAt: cleaningIds.length > 0 ? `${cleaningIds.length} on-chain logs` : "No logs",
            tags: ["On-chain"]
          });
        }

        if (!isCancelled) {
          setRestaurants(nextRestaurants);
          if (scoreReadFailures.length > 0) {
            setScoreWarning(`Hygiene score unavailable for restaurant #${scoreReadFailures.join(", #")} — showing as empty.`);
          }
        }
      } catch (error) {
        if (!isCancelled) {
          setRestaurantReadError(error instanceof Error ? error.message : "Could not read restaurants from Monad testnet.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingRestaurants(false);
        }
      }
    }

    loadRestaurants();

    return () => {
      isCancelled = true;
    };
  }, [hasContract, publicClient, refreshNonce]);

  useEffect(() => {
    if (restaurants.length > 0 && !restaurants.some((restaurant) => restaurant.id === selectedId)) {
      setSelectedId(restaurants[0].id);
    }
  }, [restaurants, selectedId]);

  const selectRestaurant = useCallback((restaurant: Restaurant) => {
    setSelectedId(restaurant.id);
  }, []);

  async function registerRestaurant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      setNotice(isConnected ? "Contract address is not configured." : "Connect your wallet to register a restaurant.");
      return;
    }

    const priceRange = Number(restaurantForm.priceRange);
    if (!Number.isInteger(priceRange) || priceRange <= 0) {
      setNotice("Price must be a positive whole number.");
      return;
    }

    try {
      setNotice("");
      await writeContractAsync({
        address: crankFoodieAddress,
        abi: crankFoodieAbi,
        functionName: "registerRestaurant",
        args: [
          restaurantForm.name,
          restaurantForm.area,
          restaurantForm.latitude,
          restaurantForm.longitude,
          BigInt(priceRange),
          restaurantForm.metadataURI
        ]
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Restaurant registration was not submitted.");
      return;
    }

    setRestaurantForm(emptyRestaurantForm);
    setShowRegister(false);
  }

  async function submitReport(draft: ReportDraft) {
    if (!canWrite) {
      setNotice(isConnected ? "Contract address is not configured." : "Connect your wallet to submit a review.");
      return;
    }

    const option = reportTypeOptions.find((item) => item.value === draft.reportType);
    try {
      setNotice("");
      await writeContractAsync({
        address: crankFoodieAddress,
        abi: crankFoodieAbi,
        functionName: "submitReport",
        args: [
          BigInt(draft.restaurantId),
          option?.contractValue || 0,
          draft.severity,
          draft.starRating,
          draft.evidenceURIs,
          draft.detailsURI
        ]
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Review was not submitted.");
      return;
    }

    setReportTarget(null);
  }

  async function submitCleaningLog(draft: CleaningLogDraft) {
    if (!canWrite) {
      setNotice(isConnected ? "Contract address is not configured." : "Connect your wallet to submit a cleaning log.");
      return;
    }

    try {
      setNotice("");
      await writeContractAsync({
        address: crankFoodieAddress,
        abi: crankFoodieAbi,
        functionName: "submitCleaningLog",
        args: [BigInt(draft.restaurantId), draft.cleanlinessScore, draft.evidenceURI]
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Cleaning log was not submitted.");
      return;
    }

    setCleaningTarget(null);
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-steel bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-md border border-steel bg-white">
              <Image src="/logo.jpg" alt="" width={44} height={44} className="h-full w-full object-cover" priority />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-ink">CrankFoodie</h1>
              <p className="text-sm text-ink/70">Restaurants Reviewer around Subang Jaya.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/reports"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-steel px-4 text-sm font-semibold text-ink hover:border-leaf"
            >
              View reviews
            </Link>
            <WalletButton />
          </div>
        </div>
      </header>

      <div className="bg-amber/10 border-b border-steel px-4 py-3 text-sm text-ink">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span className="font-bold text-amber shrink-0">⚠️ Disclaimer:</span>
          <span>This application is for <strong>hackathon demonstration and testing purposes only</strong>. The restaurant names and hygiene scores shown here are simulated on the Monad testnet and do not represent actual real-world hygiene reviews or ratings.</span>
        </div>
      </div>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric icon={<Store size={19} />} label="Total restaurants" value={totalRestaurantCount} tone="leaf" />
            <Metric icon={<Bug size={19} />} label="Incident reports" value={String(issueCount)} tone="tomato" />
            <Metric icon={<ClipboardCheck size={19} />} label="Cleaning logs" value={String(cleaningCount)} tone="ocean" />
          </div>

          <div className="grid gap-4 border-y border-steel py-4 md:grid-cols-[1fr_220px_auto]">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/50" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search restaurants, areas, tags"
                className="min-h-11 w-full rounded-md border border-steel bg-white pl-10 pr-3 text-sm outline-none focus:shadow-focus"
              />
            </label>
            <label className="relative block">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/50" size={18} />
              <select
                value={area}
                onChange={(event) => setArea(event.target.value)}
                className="min-h-11 w-full rounded-md border border-steel bg-white pl-10 pr-3 text-sm outline-none focus:shadow-focus"
              >
                <option value="All">All areas</option>
                {supportedAreas.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setShowRegister((value) => !value)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white"
            >
              <Plus size={18} />
              Register
            </button>
          </div>

          {notice ? (
            <div className="rounded-md border border-amber bg-white p-3 text-sm text-ink">
              {notice}
            </div>
          ) : null}

          {isSuccess ? (
            <div className="rounded-md border border-leaf bg-mint p-3 text-sm text-ink">
              Transaction confirmed.
            </div>
          ) : null}

          {isLoadingRestaurants ? (
            <div className="rounded-md border border-steel bg-white p-3 text-sm text-ink">
              Loading restaurants from Monad testnet.
            </div>
          ) : null}

          {restaurantReadError ? (
            <div className="rounded-md border border-tomato bg-red-50 p-3 text-sm text-ink">
              Could not load restaurants: {restaurantReadError}
            </div>
          ) : null}

          {scoreWarning ? (
            <div className="rounded-md border border-amber bg-amber-50 p-3 text-sm text-ink">
              {scoreWarning}
            </div>
          ) : null}

          {showRegister ? (
            <form onSubmit={registerRestaurant} className="grid gap-4 rounded-md border border-steel bg-white p-4 md:grid-cols-2">
              <Field label="Restaurant name">
                <input
                  required
                  value={restaurantForm.name}
                  onChange={(event) => setRestaurantForm((current) => ({ ...current, name: event.target.value }))}
                  className="min-h-11 rounded-md border border-steel px-3 outline-none focus:shadow-focus"
                />
              </Field>
              <Field label="Area">
                <select
                  value={restaurantForm.area}
                  onChange={(event) => setRestaurantForm((current) => ({ ...current, area: event.target.value }))}
                  className="min-h-11 rounded-md border border-steel px-3 outline-none focus:shadow-focus"
                >
                  {supportedAreas.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Address line 1">
                <input
                  required
                  value={restaurantForm.latitude}
                  onChange={(event) => setRestaurantForm((current) => ({ ...current, latitude: event.target.value }))}
                  className="min-h-11 rounded-md border border-steel px-3 outline-none focus:shadow-focus"
                />
              </Field>
              <Field label="Address line 2">
                <input
                  required
                  value={restaurantForm.longitude}
                  onChange={(event) => setRestaurantForm((current) => ({ ...current, longitude: event.target.value }))}
                  className="min-h-11 rounded-md border border-steel px-3 outline-none focus:shadow-focus"
                />
              </Field>
              <Field label="Price">
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={restaurantForm.priceRange}
                  onChange={(event) => setRestaurantForm((current) => ({ ...current, priceRange: event.target.value }))}
                  className="min-h-11 rounded-md border border-steel px-3 outline-none focus:shadow-focus"
                />
              </Field>
              <Field label="Metadata URI">
                <input
                  value={restaurantForm.metadataURI}
                  onChange={(event) => setRestaurantForm((current) => ({ ...current, metadataURI: event.target.value }))}
                  placeholder="ipfs://..."
                  className="min-h-11 rounded-md border border-steel px-3 outline-none focus:shadow-focus"
                />
              </Field>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={!canWrite || isSubmitting}
                  className="min-h-11 rounded-md bg-leaf px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting" : "Register Restaurant"}
                </button>
                {!isConnected ? <p className="mt-2 text-xs text-ink/60">Connect your wallet to register on Monad testnet.</p> : null}
              </div>
            </form>
          ) : null}

          <RestaurantMap restaurants={filteredRestaurants} selectedId={selectedId} onSelect={selectRestaurant} />
        </div>

        <aside className="space-y-4">
          {selectedRestaurant ? (
            <section className="rounded-md border border-steel bg-white p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1 text-sm font-medium text-ocean">
                    <MapPin size={15} />
                    {selectedRestaurant.area}
                  </p>
                  <h2 className="text-xl font-semibold text-ink">{selectedRestaurant.name}</h2>
                </div>
                <span className={cn("rounded-md px-3 py-2 text-sm font-bold", scoreTone(selectedRestaurant.score))}>
                  {formatScore(selectedRestaurant.score)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Reports" value={String(selectedRestaurant.reportCount)} />
                <Info label="Cleanings" value={String(selectedRestaurant.cleaningCountToday)} />
                <Info label="Last cleaned" value={selectedRestaurant.lastCleanedAt} />
                <Info label="Price" value={String(selectedRestaurant.priceRange)} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedRestaurant.tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-mint px-2 py-1 text-xs font-medium text-ink">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={() => setReportTarget(selectedRestaurant)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-tomato px-4 text-sm font-semibold text-white"
                >
                  <Bug size={18} />
                  Submit review
                </button>
                <button
                  type="button"
                  onClick={() => setCleaningTarget(selectedRestaurant)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-leaf px-4 text-sm font-semibold text-white"
                >
                  <ClipboardCheck size={18} />
                  Log cleaning
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-md border border-steel bg-white p-4">
              <p className="font-semibold text-ink">No on-chain restaurants found</p>
              <p className="mt-1 text-sm text-ink/60">Register a restaurant to add it to the Monad testnet contract.</p>
            </section>
          )}


          <section className="space-y-3">
            {filteredRestaurants.map((restaurant) => (
              <button
                key={restaurant.id}
                type="button"
                onClick={() => selectRestaurant(restaurant)}
                className={cn(
                  "w-full rounded-md border bg-white p-4 text-left transition hover:border-leaf",
                  selectedId === restaurant.id ? "border-leaf shadow-focus" : "border-steel"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-ink">{restaurant.name}</h3>
                    <p className="text-sm text-ink/70">{restaurant.area}</p>
                  </div>
                  <span className={cn("rounded-md px-2 py-1 text-xs font-bold", scoreTone(restaurant.score))}>
                    {formatScore(restaurant.score)}
                  </span>
                </div>
              </button>
            ))}
          </section>
        </aside>
      </section>

      {reportTarget ? (
        <ReportModal
          restaurant={reportTarget}
          canWrite={canWrite}
          isSubmitting={isSubmitting}
          onClose={() => setReportTarget(null)}
          onSubmit={submitReport}
        />
      ) : null}

      {cleaningTarget ? (
        <CleaningLogModal
          restaurant={cleaningTarget}
          canWrite={canWrite}
          isSubmitting={isSubmitting}
          onClose={() => setCleaningTarget(null)}
          onSubmit={submitCleaningLog}
        />
      ) : null}
    </main>
  );
}

function Metric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "leaf" | "tomato" | "ocean" }) {
  const toneClass = {
    leaf: "bg-mint text-leaf",
    tomato: "bg-red-50 text-tomato",
    ocean: "bg-blue-50 text-ocean"
  }[tone];

  return (
    <div className="rounded-md border border-steel bg-white p-4">
      <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-md", toneClass)}>{icon}</div>
      <p className="text-sm text-ink/70">{label}</p>
      <p className="text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-steel p-3">
      <p className="text-xs font-medium uppercase tracking-normal text-ink/55">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      {label}
      {children}
    </label>
  );
}