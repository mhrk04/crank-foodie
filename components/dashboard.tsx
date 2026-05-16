"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  Bug,
  ClipboardCheck,
  Database,
  Filter,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Utensils
} from "lucide-react";
import { WalletButton } from "@/components/wallet-button";
import { RestaurantMap } from "@/components/restaurant-map";
import { ReportModal } from "@/components/report-modal";
import { CleaningLogModal } from "@/components/cleaning-log-modal";
import { crankFoodieAbi, crankFoodieAddress, reportTypeOptions } from "@/lib/contract";
import { seedRestaurants, supportedAreas } from "@/lib/seed-data";
import { insertSupabaseRow, isSupabaseConfigured } from "@/lib/supabase";
import type { CleaningLogDraft, ReportDraft, Restaurant } from "@/lib/types";
import { cn, scoreTone } from "@/lib/utils";

const emptyRestaurantForm = {
  name: "",
  area: "Bandar Sunway",
  latitude: "3, Jalan PJS 11/15, Bandar Sunway",
  longitude: "47500 Subang Jaya, Selangor",
  priceRange: "10",
  metadataURI: ""
};

export function Dashboard() {
  const [restaurants, setRestaurants] = useState(seedRestaurants);
  const [selectedId, setSelectedId] = useState(seedRestaurants[0].id);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("All");
  const [showRegister, setShowRegister] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState(emptyRestaurantForm);
  const [reportTarget, setReportTarget] = useState<Restaurant | null>(null);
  const [cleaningTarget, setCleaningTarget] = useState<Restaurant | null>(null);
  const [notice, setNotice] = useState("");

  const { data: hash, isPending, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const canWrite = Boolean(crankFoodieAddress);
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

  const selectedRestaurant = restaurants.find((restaurant) => restaurant.id === selectedId) || restaurants[0];
  const averageScore = Math.round(restaurants.reduce((sum, restaurant) => sum + restaurant.score, 0) / restaurants.length);
  const issueCount = restaurants.reduce((sum, restaurant) => sum + restaurant.reportCount, 0);
  const cleaningCount = restaurants.reduce((sum, restaurant) => sum + restaurant.cleaningCountToday, 0);

  function selectRestaurant(restaurant: Restaurant) {
    setSelectedId(restaurant.id);
  }

  async function registerRestaurant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite || !crankFoodieAddress) {
      setNotice("Add NEXT_PUBLIC_CRANKFOODIE_CONTRACT_ADDRESS after deployment to enable writes.");
      return;
    }

    const priceRange = Number(restaurantForm.priceRange);
    if (!Number.isInteger(priceRange) || priceRange <= 0) {
      setNotice("Price must be a positive whole number.");
      return;
    }

    writeContract({
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

    const optimisticRestaurant: Restaurant = {
      id: restaurants.length + 1,
      name: restaurantForm.name,
      area: restaurantForm.area,
      latitude: 3.0685,
      longitude: 101.6037,
      priceRange,
      metadataURI: restaurantForm.metadataURI,
      score: 88,
      reportCount: 0,
      cleaningCountToday: 0,
      lastCleanedAt: "No logs",
      tags: ["New"]
    };
    setRestaurants((current) => [optimisticRestaurant, ...current]);
    setSelectedId(optimisticRestaurant.id);
    setRestaurantForm(emptyRestaurantForm);
    setShowRegister(false);

    await insertSupabaseRow("restaurants", {
      name: optimisticRestaurant.name,
      area: optimisticRestaurant.area,
      latitude: restaurantForm.latitude,
      longitude: restaurantForm.longitude,
      price_range: optimisticRestaurant.priceRange,
      metadata_uri: optimisticRestaurant.metadataURI
    });
  }

  async function submitReport(draft: ReportDraft) {
    if (!canWrite || !crankFoodieAddress) {
      setNotice("Deploy the contract and set its address before submitting reports.");
      return;
    }

    const option = reportTypeOptions.find((item) => item.value === draft.reportType);
    writeContract({
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

    setRestaurants((current) =>
      current.map((restaurant) =>
        restaurant.id === draft.restaurantId
          ? {
              ...restaurant,
              reportCount: restaurant.reportCount + 1,
              score: Math.max(0, restaurant.score - draft.severity * 3)
            }
          : restaurant
      )
    );
    setReportTarget(null);

    await insertSupabaseRow("reports", {
      restaurant_id: draft.restaurantId,
      report_type: draft.reportType,
      severity: draft.severity,
      star_rating: draft.starRating,
      evidence_uris: draft.evidenceURIs,
      details_uri: draft.detailsURI
    });
  }

  async function submitCleaningLog(draft: CleaningLogDraft) {
    if (!canWrite || !crankFoodieAddress) {
      setNotice("Deploy the contract and set its address before submitting cleaning logs.");
      return;
    }

    writeContract({
      address: crankFoodieAddress,
      abi: crankFoodieAbi,
      functionName: "submitCleaningLog",
      args: [BigInt(draft.restaurantId), draft.cleanlinessScore, draft.evidenceURI]
    });

    setRestaurants((current) =>
      current.map((restaurant) =>
        restaurant.id === draft.restaurantId
          ? {
              ...restaurant,
              cleaningCountToday: restaurant.cleaningCountToday + 1,
              lastCleanedAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
              score: Math.min(100, Math.round((restaurant.score + draft.cleanlinessScore) / 2))
            }
          : restaurant
      )
    );
    setCleaningTarget(null);

    await insertSupabaseRow("cleaning_logs", {
      restaurant_id: draft.restaurantId,
      cleanliness_score: draft.cleanlinessScore,
      evidence_uri: draft.evidenceURI
    });
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-steel bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-leaf text-white">
              <Utensils size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-ink">CrankFoodie</h1>
              <p className="text-sm text-ink/70">Monad hygiene ledger for Subang Jaya and Bandar Sunway.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 rounded-md border border-steel px-3 py-2 text-sm">
              <Database size={16} className={isSupabaseConfigured ? "text-leaf" : "text-amber"} />
              <span>{isSupabaseConfigured ? "Supabase connected" : "Supabase optional"}</span>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric icon={<ShieldCheck size={19} />} label="Average hygiene" value={`${averageScore}/100`} tone="leaf" />
            <Metric icon={<Bug size={19} />} label="Incident reports" value={String(issueCount)} tone="tomato" />
            <Metric icon={<ClipboardCheck size={19} />} label="Cleanings today" value={String(cleaningCount)} tone="ocean" />
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
                  {isSubmitting ? "Submitting" : "Register on-chain"}
                </button>
              </div>
            </form>
          ) : null}

          <RestaurantMap restaurants={filteredRestaurants} selectedId={selectedId} onSelect={selectRestaurant} />
        </div>

        <aside className="space-y-4">
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
                {selectedRestaurant.score}
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
                Report issue
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
                    {restaurant.score}
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
