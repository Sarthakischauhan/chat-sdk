"use client";
import { Fragment } from "react";
import { ProviderId, useChat } from "./chat.context";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectValue,
  SelectTrigger,
  SelectItem,
} from "../../ui/select";

const ProviderBadge = ({ logo, name }: { logo?: string; name: string }) => {
  if (logo) {
    return <img src={logo} alt="" aria-hidden="true" className="h-4 w-4 rounded-sm object-contain" />;
  }

  return (
    <span className="bg-muted text-muted-foreground inline-flex h-4 w-4 items-center justify-center rounded-sm text-[9px] font-semibold uppercase">
      {name.slice(0, 1)}
    </span>
  );
};

export const ChatSelect = () => {
  const { state, dispatch, status, registry } = useChat();
  const { provider, model } = state;
  const isSending = status === "submitted" || status === "streaming";
  const selectedValue = `${provider}::${model}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={selectedValue}
        onValueChange={(value) => {
          const [nextProvider, nextModel] = value.split("::");

          dispatch({
            type: "setProvider",
            data: {
              provider: nextProvider as ProviderId,
              model: nextModel,
            },
          });
        }}
        disabled={isSending}
      >
        <SelectTrigger className="h-8 min-w-56 rounded-lg border-0 px-4 text-sm  cursor-pointer">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          {registry.providers.map((entry) => {
            const providerName = entry.name ?? entry.label;

            return (
              <Fragment key={entry.id} >
                <SelectGroup>
                  <SelectLabel className="text-foreground mb-1 mt-1 flex items-center gap-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]">
                    <ProviderBadge logo={entry.logo} name={providerName} />
                    <span>{providerName}</span>
                  </SelectLabel>
                  {entry.models.map((item) => (
                    <SelectItem
                      key={`${entry.id}::${item.id}`}
                      value={`${entry.id}::${item.id}`}
                      className="pl-5 text-sm  cursor-pointer"
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
