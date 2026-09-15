"use client";

import { useEffect, useState } from "react";
import { loadChargerCatalog, loadVehicleCatalog } from "@/lib/catalog-client";
import type { ChargersResponse, VehiclesResponse } from "@/types/catalogs";
import type { Result } from "@/types/result";

export type CatalogState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

export type CatalogResource<T> = {
  state: CatalogState<T>;
  retry: () => void;
};

function useCatalog<T>(load: (signal?: AbortSignal) => Promise<Result<T>>, enabled: boolean): CatalogResource<T> {
  const [state, setState] = useState<CatalogState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void load(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setState(result.success
        ? { status: "ready", data: result.data }
        : { status: "error", message: result.error.message });
    });
    return () => controller.abort();
  }, [load, enabled, attempt]);

  function retry(): void {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }

  return { state, retry };
}

export function useVehicleCatalog(): CatalogResource<VehiclesResponse> {
  return useCatalog(loadVehicleCatalog, true);
}

export function useChargerCatalog(enabled = true): CatalogResource<ChargersResponse> {
  return useCatalog(loadChargerCatalog, enabled);
}
