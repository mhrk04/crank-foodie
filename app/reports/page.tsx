"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, ClipboardList, ExternalLink, RefreshCw, Search, Star, UserRound } from "lucide-react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { WalletButton } from "@/components/wallet-button";
import { crankFoodieAbi, crankFoodieAddress, reportTypeOptions } from "@/lib/contract";
import { cn, ipfsToGateway } from "@/lib/utils";

type RestaurantRecord = {
  id: bigint;
  name: string;
  area: string;
  latitude: string;
  longitude: string;
  priceRange: bigint;
  metadataURI: string;
  active: boolean;
  registeredBy: `0x${string}`;
  createdAt: bigint;
};

type ReportRecord = {
  id: bigint;
  restaurantId: bigint;
  reporter: `0x${string}`;
  reportType: number;
  severity: number;
  starRating: number;
  evidenceURIs: string[];
  detailsURI: string;
  createdAt: bigint;
  verified: boolean;
};

export default function RestaurantReportsPage() {
  const [restaurantInput, setRestaurantInput] = useState("1");
  const [requestedRestaurantId, setRequestedRestaurantId] = useState<bigint | null>(null);
  const [formError, setFormError] = useState("");

  const { address, isConnected } = useAccount();
  const reportTypeLabelByValue = useMemo(() => {
    return new Map<number, string>(reportTypeOptions.map((option) => [option.contractValue, option.label]));
  }, []);

  const restaurantRead = useReadContract({
    address: crankFoodieAddress,
    abi: crankFoodieAbi,
    functionName: "getRestaurant",
    args: requestedRestaurantId ? [requestedRestaurantId] : undefined,
    query: {
      enabled: requestedRestaurantId !== null
    }
  });

  const reportIdsRead = useReadContract({
    address: crankFoodieAddress,
    abi: crankFoodieAbi,
    functionName: "getRestaurantReportIds",
    args: requestedRestaurantId ? [requestedRestaurantId] : undefined,
    query: {
      enabled: requestedRestaurantId !== null
    }
  });

  const reportIds = useMemo(() => {
    return reportIdsRead.data ? [...reportIdsRead.data] : [];
  }, [reportIdsRead.data]);

  const reportsRead = useReadContracts({
    contracts: reportIds.map((reportId) => ({
      address: crankFoodieAddress,
      abi: crankFoodieAbi,
      functionName: "getReport",
      args: [reportId]
    })),
    query: {
      enabled: reportIds.length > 0
    }
  });

  const restaurant = restaurantRead.data as RestaurantRecord | undefined;
  const reports = useMemo(() => {
    return (reportsRead.data || [])
      .map((item) => (item.status === "success" ? (item.result as unknown as ReportRecord) : null))
      .filter((item): item is ReportRecord => Boolean(item));
  }, [reportsRead.data]);

  const walletReports = useMemo(() => {
    if (!address) return reports;
    return reports.filter((report) => report.reporter.toLowerCase() === address.toLowerCase());
  }, [address, reports]);

  const isLoading = restaurantRead.isLoading || reportIdsRead.isLoading || reportsRead.isLoading;
  const readError = restaurantRead.error || reportIdsRead.error || reportsRead.error;

  function generateReports(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedId = Number(restaurantInput);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setFormError("Enter a positive restaurant ID.");
      return;
    }

    setFormError("");
    const nextId = BigInt(parsedId);
    setRequestedRestaurantId(nextId);
    if (requestedRestaurantId === nextId) {
      restaurantRead.refetch();
      reportIdsRead.refetch();
      reportsRead.refetch();
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-steel bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-steel text-ink hover:border-leaf"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-ink">Restaurant reviews</h1>
              <p className="text-sm text-ink/70">Generate report IDs from the Monad contract and inspect the reviews.</p>
            </div>
          </div>
          <WalletButton />
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="space-y-4">
          <form onSubmit={generateReports} className="rounded-md border border-steel bg-white p-4">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-mint text-leaf">
              <ClipboardList size={20} />
            </div>
            <label className="grid gap-2 text-sm font-medium text-ink">
              Restaurant ID
              <input
                type="number"
                min="1"
                step="1"
                value={restaurantInput}
                onChange={(event) => setRestaurantInput(event.target.value)}
                className="min-h-11 rounded-md border border-steel px-3 outline-none focus:shadow-focus"
              />
            </label>
            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={17} /> : <Search size={17} />}
              {isLoading ? "Generating" : "Generate reviews"}
            </button>
            {formError ? <p className="mt-3 text-sm text-tomato">{formError}</p> : null}
            {!isConnected ? (
              <p className="mt-3 text-sm text-ink/60">Connect your wallet to filter this list to your own submitted reviews.</p>
            ) : null}
          </form>

          <section className="rounded-md border border-steel bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-normal text-ink/55">Contract</p>
            <p className="mt-2 break-all text-sm font-semibold text-ink">{crankFoodieAddress}</p>
            <p className="mt-3 text-sm text-ink/70">Function: getRestaurantReportIds(uint256 restaurantId)</p>
          </section>
        </aside>

        <div className="space-y-4">
          {readError ? (
            <div className="rounded-md border border-tomato bg-white p-4 text-sm text-ink">
              Could not read restaurant reports. Check that the restaurant ID exists on this contract.
            </div>
          ) : null}

          {restaurant ? (
            <section className="rounded-md border border-steel bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-ocean">{restaurant.area}</p>
                  <h2 className="text-xl font-semibold text-ink">{restaurant.name}</h2>
                  <p className="mt-1 text-sm text-ink/70">Restaurant #{restaurant.id.toString()}</p>
                </div>
                <span className={cn("rounded-md px-3 py-2 text-sm font-bold", restaurant.active ? "bg-mint text-leaf" : "bg-red-50 text-tomato")}>
                  {restaurant.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <Info label="Generated IDs" value={String(reportIds.length)} />
                <Info label="My reviews" value={String(walletReports.length)} />
                <Info label="Price" value={restaurant.priceRange.toString()} />
              </div>
            </section>
          ) : (
            <section className="rounded-md border border-steel bg-white p-6">
              <h2 className="text-lg font-semibold text-ink">Generate a restaurant report list</h2>
              <p className="mt-2 text-sm text-ink/70">Enter a restaurant ID to call the contract and view report details.</p>
            </section>
          )}

          {requestedRestaurantId !== null && reportIds.length === 0 && !isLoading && !readError ? (
            <div className="rounded-md border border-steel bg-white p-4 text-sm text-ink/70">
              No reports were returned for restaurant #{requestedRestaurantId.toString()}.
            </div>
          ) : null}

          {walletReports.length > 0 ? (
            <section className="space-y-3">
              {walletReports.map((report) => (
                <article key={report.id.toString()} className="rounded-md border border-steel bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-ink">Review #{report.id.toString()}</h3>
                        {report.verified ? <span className="rounded-md bg-mint px-2 py-1 text-xs font-semibold text-leaf">Verified</span> : null}
                      </div>
                      <p className="mt-1 flex items-center gap-1 break-all text-sm text-ink/65">
                        <UserRound size={14} />
                        {shortAddress(report.reporter)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-amber" aria-label={`${report.starRating} star rating`}>
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star key={index} size={16} fill={index < report.starRating ? "currentColor" : "none"} />
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <Info label="Type" value={reportTypeLabelByValue.get(Number(report.reportType)) || "Unknown"} />
                    <Info label="Severity" value={`${report.severity}/5`} />
                    <Info label="Created" value={formatTimestamp(report.createdAt)} />
                  </div>

                  {report.detailsURI ? <UriLink className="mt-4" label="Details URI" uri={report.detailsURI} /> : null}
                  {report.evidenceURIs.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium uppercase tracking-normal text-ink/55">Evidence</p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {report.evidenceURIs.map((uri, index) => (
                          <EvidenceImage key={`${uri}-${index}`} label={`Evidence ${index + 1}`} uri={uri} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </section>
          ) : requestedRestaurantId !== null && reportIds.length > 0 && !isLoading ? (
            <div className="rounded-md border border-steel bg-white p-4 text-sm text-ink/70">
              {isConnected
                ? "This restaurant has reports, but none were submitted by your connected wallet."
                : "Connect your wallet to filter the generated reports to your own reviews."}
            </div>
          ) : null}
        </div>
      </section>
    </main>
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

function UriLink({ className, label, uri }: { className?: string; label: string; uri: string }) {
  return (
    <a
      href={toHttpUri(uri)}
      target="_blank"
      rel="noreferrer"
      className={cn("inline-flex min-h-9 items-center gap-2 rounded-md border border-steel bg-white px-3 text-sm font-medium text-ink hover:border-leaf", className)}
    >
      {label}
      <ExternalLink size={14} />
    </a>
  );
}

function EvidenceImage({ label, uri }: { label: string; uri: string }) {
  const [hasError, setHasError] = useState(false);
  const href = toHttpUri(uri);

  if (hasError) {
    return <UriLink label={label} uri={uri} />;
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-md border border-steel bg-white hover:border-leaf">
      <div className="aspect-[4/3] bg-mint">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={href} alt={label} className="h-full w-full object-cover" loading="lazy" onError={() => setHasError(true)} />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-ink">
        <span>{label}</span>
        <ExternalLink size={14} className="shrink-0 text-ink/60 group-hover:text-leaf" />
      </div>
    </a>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(timestamp: bigint) {
  const milliseconds = Number(timestamp) * 1000;
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(milliseconds));
}

function toHttpUri(uri: string) {
  return ipfsToGateway(uri);
}
