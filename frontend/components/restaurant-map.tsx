"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { Restaurant } from "@/lib/types";
import { scoreTone } from "@/lib/utils";

type RestaurantMapProps = {
  restaurants: Restaurant[];
  selectedId: number;
  onSelect: (restaurant: Restaurant) => void;
};

export function RestaurantMap({ restaurants, selectedId, onSelect }: RestaurantMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [101.6037, 3.0685],
      zoom: 13.2,
      pitch: 30
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = restaurants.map((restaurant) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `h-8 w-8 rounded-full border-2 border-white text-xs font-bold shadow-lg ${scoreTone(restaurant.score)} ${restaurant.id === selectedId ? "ring-4 ring-amber" : ""}`;
      el.textContent = String(restaurant.score);
      el.addEventListener("click", () => onSelect(restaurant));

      return new mapboxgl.Marker({ element: el })
        .setLngLat([restaurant.longitude, restaurant.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 18 }).setHTML(`<strong>${restaurant.name}</strong><br/>Score ${restaurant.score}/100`))
        .addTo(mapRef.current!);
    });
  }, [restaurants, selectedId, onSelect]);

  if (!token) {
    return (
      <div className="relative min-h-[420px] overflow-hidden rounded-md border border-steel bg-mint">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,32,28,0.08)_1px,transparent_1px),linear-gradient(rgba(23,32,28,0.08)_1px,transparent_1px)] bg-[size:32px_32px]" />
        {restaurants.map((restaurant, index) => (
          <button
            key={restaurant.id}
            type="button"
            onClick={() => onSelect(restaurant)}
            className={`absolute h-10 w-10 rounded-full border-2 border-white text-xs font-bold shadow-lg ${scoreTone(restaurant.score)} ${restaurant.id === selectedId ? "ring-4 ring-amber" : ""}`}
            style={{
              left: `${18 + (index % 3) * 28}%`,
              top: `${18 + Math.floor(index / 3) * 28}%`
            }}
            aria-label={restaurant.name}
          >
            {restaurant.score}
          </button>
        ))}
        <div className="absolute bottom-4 left-4 right-4 rounded-md bg-white/90 p-3 text-sm text-ink shadow">
          Set `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` to render the live map. The fallback keeps restaurant selection usable.
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="min-h-[420px] overflow-hidden rounded-md border border-steel" />;
}

