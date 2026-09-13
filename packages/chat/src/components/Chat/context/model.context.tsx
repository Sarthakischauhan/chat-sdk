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
  thinkingLevels: Record<string, string>;
  getThinkingLevel: (providerId: string, modelId: string) => string | undefined;
  setThinkingLevel: (providerId: string, modelId: string, level: string) => void;
  setProvider: (provider: ProviderId, model?: string) => void;
  setModel: (model: string) => void;
  providerRef: React.MutableRefObject<ProviderId>;
  modelRef: React.MutableRefObject<string>;
  thinkingLevelsRef: React.MutableRefObject<Record<string, string>>;
};

const ModelContext = createContext<ModelContextValue | null>(null);

type ModelProviderProps = {
  children: ReactNode;
  defaultProvider?: ProviderId;
  registryUrl?: string;
};

export function ModelProvider({
  children,
  defaultProvider = ProviderId.MOCK,
  registryUrl = "/api/ai/registry",
}: ModelProviderProps) {
  const [registry, setRegistry] = useState<RegistryConfig>(defaultRegistry);
  const [provider, setProviderState] = useState<ProviderId>(defaultProvider);
  const [model, setModelState] = useState(
    () =>
      defaultRegistry.providers.find((entry) => entry.id === defaultProvider)?.defaultModel ?? "",
  );
  const [thinkingLevels, setThinkingLevelsState] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const p of defaultRegistry.providers) {
      for (const m of p.models) {
        const levels = m.thinkingLevels;
        if (levels?.length) initial[`${p.id}::${m.id}`] = levels.includes("medium") ? "medium" : levels[0];
      }
    }
    return initial;
  });

  const providerRef = useRef(provider);
  const modelRef = useRef(model);
  const thinkingLevelsRef = useRef(thinkingLevels);
  providerRef.current = provider;
  modelRef.current = model;
  thinkingLevelsRef.current = thinkingLevels;

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
        const nextThinking: Record<string, string> = {};
        for (const p of data.providers) {
          for (const m of p.models) {
            const levels = m.thinkingLevels;
            if (levels?.length) nextThinking[`${p.id}::${m.id}`] = levels.includes("medium") ? "medium" : levels[0];
          }
        }
        setThinkingLevelsState((prev) => ({ ...nextThinking, ...prev }));
        const preferred =
          data.providers.find((entry) => entry.id === data.defaultProviderId) ??
          data.providers[0];
        if (preferred) {
          setProviderState(preferred.id);
          setModelState(preferred.defaultModel);
        }
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

  const getThinkingLevel = useCallback(
    (providerId: string, modelId: string) => thinkingLevels[`${providerId}::${modelId}`],
    [thinkingLevels],
  );

  const setThinkingLevel = useCallback((providerId: string, modelId: string, level: string) => {
    setThinkingLevelsState((prev) => ({ ...prev, [`${providerId}::${modelId}`]: level }));
  }, []);

  const setModel = useCallback((nextModel: string) => {
    setModelState(nextModel);
  }, []);

  const value = useMemo<ModelContextValue>(
    () => ({
      registry,
      provider,
      model,
      thinkingLevels,
      getThinkingLevel,
      setThinkingLevel,
      setProvider,
      setModel,
      providerRef,
      modelRef,
      thinkingLevelsRef,
    }),
    [model, provider, registry, setModel, setProvider, thinkingLevels, getThinkingLevel, setThinkingLevel],
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
