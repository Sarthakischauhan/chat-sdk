"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  defaultRegistry,
  ProviderId,
  type RegistryConfig,
} from "./types";

type ModelContextValue = {
  registry: RegistryConfig;
  provider: ProviderId;
  model: string;
  setProvider: (provider: ProviderId, model?: string) => void;
  setModel: (model: string) => void;
  providerRef: React.MutableRefObject<ProviderId>;
  modelRef: React.MutableRefObject<string>;
};

const ModelContext = createContext<ModelContextValue | null>(null);

type ModelProviderProps = {
  children: ReactNode;
  defaultProvider?: ProviderId;
  registryUrl?: string;
};

export function ModelProvider({
  children,
  defaultProvider = ProviderId.OLLAMA,
  registryUrl = "/api/ai/registry",
}: ModelProviderProps) {
  const [registry, setRegistry] = useState<RegistryConfig>(defaultRegistry);
  const [provider, setProviderState] = useState<ProviderId>(defaultProvider);
  const [model, setModelState] = useState(
    () =>
      defaultRegistry.providers.find((entry) => entry.id === defaultProvider)?.defaultModel ?? "",
  );

  const providerRef = useRef(provider);
  const modelRef = useRef(model);
  providerRef.current = provider;
  modelRef.current = model;

  useEffect(() => {
    let cancelled = false;

    const loadRegistry = async () => {
      try {
        const response = await fetch(registryUrl, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load registry");
        }

        const data = (await response.json()) as RegistryConfig;
        if (cancelled || !Array.isArray(data.providers) || data.providers.length === 0) {
          return;
        }

        setRegistry(data);
      } catch {
        if (!cancelled) {
          setRegistry(defaultRegistry);
        }
      }
    };

    void loadRegistry();
    return () => {
      cancelled = true;
    };
  }, [registryUrl]);

  useEffect(() => {
    const nextProvider =
      registry.providers.find((entry) => entry.id === provider) ??
      registry.providers.find((entry) => entry.id === registry.defaultProviderId) ??
      registry.providers[0];

    if (!nextProvider) {
      return;
    }

    const hasModel = nextProvider.models.some((entry) => entry.id === model);
    if (!hasModel) {
      setProviderState(nextProvider.id);
      setModelState(nextProvider.defaultModel);
    }
  }, [model, provider, registry]);

  const setProvider = useCallback((nextProvider: ProviderId, nextModel?: string) => {
    setProviderState(nextProvider);
    if (nextModel) {
      setModelState(nextModel);
    }
  }, []);

  const setModel = useCallback((nextModel: string) => {
    setModelState(nextModel);
  }, []);

  const value = useMemo<ModelContextValue>(
    () => ({
      registry,
      provider,
      model,
      setProvider,
      setModel,
      providerRef,
      modelRef,
    }),
    [model, provider, registry, setModel, setProvider],
  );

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
}

export function useModel() {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error("useModel must be used inside ModelProvider");
  }
  return context;
}
