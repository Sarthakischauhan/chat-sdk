"use client";

import { Fragment, useCallback, useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectValue,
  SelectTrigger,
  SelectItem,
} from "../../ui/select";
import { ProviderId, useMessages, useModel } from "./context";

const ProviderBadge = ({ logo, name }: { logo?: string; name: string }) => {
  if (logo) {
    return (
      <img
        className="chat-model-provider-logo"
        src={logo}
        alt=""
        aria-hidden="true"
      />
    );
  }

  return (
    <span className="chat-model-provider-logo chat-model-provider-fallback" aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  );
};

export const ChatSelect = () => {
  const { provider, model, registry, setProvider } = useModel();
  const { isSending } = useMessages();
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const selectedValue = `${provider}::${model}`;
  const setRootElement = useCallback((node: HTMLDivElement | null) => {
    setPortalContainer(node?.closest(".chat-root") as HTMLElement | null);
  }, []);

  return (
    <div ref={setRootElement}>
      <Select
        value={selectedValue}
        onValueChange={(value) => {
          const [nextProvider, nextModel] = value.split("::");
          setProvider(nextProvider as ProviderId, nextModel);
        }}
        disabled={isSending}
      >
        <SelectTrigger className="chat-model-trigger">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent
          align="start"
          position="popper"
          className="chat-model-content"
          portalContainer={portalContainer}
        >
          {registry.providers.map((entry) => {
            const providerName = entry.name ?? entry.label;

            return (
              <Fragment key={entry.id}>
                <SelectGroup className="chat-model-group">
                  <SelectLabel className="chat-model-label">
                    <ProviderBadge logo={entry.logo} name={providerName} />
                    <span>{providerName}</span>
                  </SelectLabel>
                  {entry.models.map((item) => (
                    <SelectItem
                      key={`${entry.id}::${item.id}`}
                      value={`${entry.id}::${item.id}`}
                      className="chat-model-item"
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </Fragment>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};
