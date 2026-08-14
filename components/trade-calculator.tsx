"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ACCOUNT_CURRENCIES,
  ASSET_CLASSES,
  DEFAULT_LEVERAGE,
  calculateTrade,
  createDefaultCalculator,
  inferAssetClass,
  isStockOptions,
  money,
  qty,
  sizeUnit,
  tickLabel,
} from "@/lib/calculator";
import type { AssetClass, CalculatorInput, EquityMode } from "@/lib/types";

type TradeCalculatorProps = {
  ticker: string;
  value: CalculatorInput | undefined;
  onChange: (patch: Partial<CalculatorInput>) => void;
  onTicker: (ticker: string) => void;
};

const ASSET_LABEL: Record<AssetClass, string> = {
  forex: "FOREX",
  stock: "STOCK",
  etf: "ETF",
  crypto: "CRYPTO",
};

const SELECT =
  "h-8 w-full appearance-none rounded-lg border border-white/10 bg-black/40 bg-[length:12px] bg-[position:right_12px_center] bg-no-repeat px-2.5 pr-8 font-mono text-sm";

const SELECT_BG = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b907c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Stat({
  label,
  value,
  tone,
  danger,
}: {
  label: string;
  value: string;
  tone?: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        danger
          ? "border-[#ff3b5c]/50 bg-[#ff3b5c]/10"
          : "border-white/8 bg-black/25"
      }`}
    >
      <p
        className={`font-mono text-[10px] tracking-[0.28em] ${
          danger ? "text-[#ff3b5c]" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>
      <p
        className="mt-1 font-mono text-sm font-semibold tracking-tight sm:text-base"
        style={{ color: danger ? "#ff3b5c" : tone }}
      >
        {value}
      </p>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className = "max-w-md grid-cols-4",
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid rounded-full border border-white/10 bg-black/50 p-0.5 ${className}`}
    >
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={`rounded-full px-2 py-1.5 font-mono text-[10px] tracking-widest transition ${
              active
                ? "bg-gold text-primary-foreground shadow-[0_0_18px_rgb(244_196_48/0.28)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function CollapsedStat({
  label,
  value,
  tone,
  danger,
}: {
  label: string;
  value: string;
  tone?: string;
  danger?: boolean;
}) {
  return (
    <span
      className={`flex min-w-[6.75rem] flex-1 flex-col justify-center gap-1 px-3 py-2.5 ${
        danger ? "bg-[#ff3b5c]/12" : ""
      }`}
    >
      <span
        className={`font-mono text-[9px] tracking-[0.24em] ${
          danger ? "text-[#ff3b5c]" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
      <span
        className="truncate font-mono text-sm font-semibold tracking-tight tabular-nums"
        style={{ color: danger ? "#ff3b5c" : tone }}
      >
        {value}
      </span>
    </span>
  );
}

function readNumber(value: string): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

export function TradeCalculator({
  ticker,
  value,
  onChange,
  onTicker,
}: TradeCalculatorProps) {
  const input = value ?? createDefaultCalculator();
  const [draft, setDraft] = useState(ticker);
  const [seenTicker, setSeenTicker] = useState(ticker);
  if (ticker !== seenTicker) {
    setSeenTicker(ticker);
    setDraft(ticker);
  }
  const result = useMemo(
    () => calculateTrade(input, ticker),
    [input, ticker],
  );
  const prevTicker = useRef(ticker);

  useEffect(() => {
    if (prevTicker.current === ticker) return;
    prevTicker.current = ticker;
    if (!ticker) return;
    const inferred = inferAssetClass(ticker);
    onChange({ asset: inferred, leverage: DEFAULT_LEVERAGE[inferred] });
  }, [ticker, onChange]);

  const options = isStockOptions(input);
  const unit = sizeUnit(input);
  const pip = tickLabel(input);
  const marginBlocked =
    result.margin > input.accountBalance && result.margin > 0;
  const warn =
    "border-[#ff3b5c]/60 bg-[#ff3b5c]/10 font-mono text-[#ff3b5c]";
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-white/8 bg-black/35 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-[0.4em] text-muted-foreground">
            TRADE CALCULATOR
          </p>
          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              onTicker(draft);
            }}
            className="mt-1 flex max-w-md items-center gap-2"
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value.toUpperCase())}
                placeholder="TICKER"
                aria-label="Ticker"
                className="h-9 border-white/10 bg-black/40 pl-8 font-mono text-lg font-semibold tracking-[0.28em] uppercase"
              />
            </div>
            <Button type="submit" size="sm" className="font-mono tracking-widest">
              LOAD
            </Button>
          </form>
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label={open ? "Collapse calculator" : "Expand calculator"}
          className="mt-5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-muted-foreground hover:text-foreground"
        >
          <ChevronRight
            className={`size-4 transition-transform ${open ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Asset class"
            value={input.asset}
            className="w-full max-w-md grid-cols-4"
            options={ASSET_CLASSES.map((asset) => ({
              id: asset,
              label: ASSET_LABEL[asset],
            }))}
            onChange={(asset) =>
              onChange({
                asset,
                leverage: DEFAULT_LEVERAGE[asset],
                equityMode: asset === "stock" ? input.equityMode : "shares",
              })
            }
          />
          {input.asset === "stock" ? (
            <Segmented
              label="Stock instrument"
              value={input.equityMode}
              className="w-40 grid-cols-2"
              options={[
                { id: "shares" as EquityMode, label: "SHARES" },
                { id: "options" as EquityMode, label: "OPTIONS" },
              ]}
              onChange={(equityMode) => onChange({ equityMode })}
            />
          ) : null}
        </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Field label="ACCOUNT">
          <select
            value={input.accountCurrency}
            onChange={(event) =>
              onChange({
                accountCurrency: event.target.value as CalculatorInput["accountCurrency"],
              })
            }
            className={SELECT}
            style={SELECT_BG}
          >
            {ACCOUNT_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </Field>
        <Field label="BALANCE">
          <Input
            type="number"
            min={0}
            step="any"
            value={input.accountBalance || ""}
            onChange={(event) =>
              onChange({ accountBalance: readNumber(event.target.value) })
            }
            className={`border-white/10 bg-black/40 font-mono ${marginBlocked ? warn : ""}`}
            aria-invalid={marginBlocked}
          />
        </Field>
        <Field label="RISK %">
          <Input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={input.riskPercent || ""}
            onChange={(event) =>
              onChange({ riskPercent: readNumber(event.target.value) })
            }
            className="border-white/10 bg-black/40 font-mono"
          />
        </Field>
        <Field label="REWARD %">
          <Input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={input.rewardPercent || ""}
            onChange={(event) =>
              onChange({ rewardPercent: readNumber(event.target.value) })
            }
            className="border-white/10 bg-black/40 font-mono"
          />
        </Field>
        <Field label="SIDE">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => onChange({ side: "long" })}
              className={`h-8 rounded-lg font-mono text-[10px] tracking-widest ${
                input.side === "long"
                  ? "bg-[#b6ff3b] text-[#0b1204]"
                  : "border border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              {options ? "BUY" : "LONG"}
            </button>
            <button
              type="button"
              onClick={() => onChange({ side: "short" })}
              className={`h-8 rounded-lg font-mono text-[10px] tracking-widest ${
                input.side === "short"
                  ? "bg-[#ff3b5c] text-[#1a0508]"
                  : "border border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              {options ? "SELL" : "SHORT"}
            </button>
          </div>
        </Field>
        {options ? (
          <>
            <Field label="RIGHT">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => onChange({ optionRight: "call" })}
                  className={`h-8 rounded-lg font-mono text-[10px] tracking-widest ${
                    input.optionRight === "call"
                      ? "bg-gold text-primary-foreground"
                      : "border border-white/10 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  CALL
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ optionRight: "put" })}
                  className={`h-8 rounded-lg font-mono text-[10px] tracking-widest ${
                    input.optionRight === "put"
                      ? "bg-gold text-primary-foreground"
                      : "border border-white/10 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  PUT
                </button>
              </div>
            </Field>
            <Field label="STRIKE">
              <Input
                type="number"
                min={0}
                step="any"
                value={input.strike || ""}
                onChange={(event) =>
                  onChange({ strike: readNumber(event.target.value) })
                }
                className="border-white/10 bg-black/40 font-mono"
              />
            </Field>
            <Field label="EXPIRY">
              <Input
                type="date"
                value={input.expiry}
                onChange={(event) => onChange({ expiry: event.target.value })}
                className="border-white/10 bg-black/40 font-mono"
              />
            </Field>
            <Field label="PREMIUM">
              <Input
                type="number"
                min={0}
                step="any"
                value={input.entry || ""}
                onChange={(event) =>
                  onChange({ entry: readNumber(event.target.value) })
                }
                className="border-white/10 bg-black/40 font-mono"
              />
            </Field>
          </>
        ) : (
          <Field label="ENTRY">
            <Input
              type="number"
              min={0}
              step="any"
              value={input.entry || ""}
              onChange={(event) =>
                onChange({ entry: readNumber(event.target.value) })
              }
              className="border-white/10 bg-black/40 font-mono"
            />
          </Field>
        )}
        <Field label={options ? "STOP PREM" : "STOP"}>
          <Input
            type="number"
            min={0}
            step="any"
            value={input.stop || ""}
            onChange={(event) =>
              onChange({ stop: readNumber(event.target.value) })
            }
            className="border-white/10 bg-black/40 font-mono"
          />
        </Field>
        <Field label={options ? "TARGET PREM" : "TARGET"}>
          <Input
            type="number"
            min={0}
            step="any"
            value={input.target || ""}
            placeholder={
              result.derivedTarget > 0 ? qty(result.derivedTarget, 5) : ""
            }
            onChange={(event) =>
              onChange({ target: readNumber(event.target.value) })
            }
            className="border-white/10 bg-black/40 font-mono"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Field label={`${unit.toUpperCase()} (0 = RISK SIZE)`}>
          <Input
            type="number"
            min={0}
            step="any"
            value={input.size || ""}
            onChange={(event) =>
              onChange({ size: readNumber(event.target.value) })
            }
            className={`w-40 border-white/10 bg-black/40 font-mono ${marginBlocked ? warn : ""}`}
            aria-invalid={marginBlocked}
          />
        </Field>
        <button
          type="button"
          onClick={() => onChange({ size: 0 })}
          className="h-8 rounded-lg border border-white/10 px-3 font-mono text-[10px] tracking-widest text-muted-foreground hover:text-foreground"
        >
          USE RISK SIZE
        </button>
        <p
          className={`pb-1.5 font-mono text-[10px] tracking-widest ${
            marginBlocked ? "text-[#ff3b5c]" : "text-muted-foreground"
          }`}
        >
          {marginBlocked
            ? `MARGIN ${money(result.margin, input.accountCurrency)} EXCEEDS BALANCE`
            : result.usedRiskSize
              ? `SIZED FROM ${input.riskPercent}% RISK`
              : `OVERRIDE · RISK SIZE ${qty(result.suggestedSize)} ${unit}`}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={`${pip} VALUE`}
          value={money(result.tickValue, input.accountCurrency)}
        />
        <Stat
          label="POSITION"
          value={`${qty(result.size)} ${unit}`}
          danger={marginBlocked}
        />
        <Stat
          label={options ? "PREMIUM" : "NOTIONAL"}
          value={money(result.notional, input.accountCurrency)}
        />
        <Stat
          label={
            options
              ? input.side === "long"
                ? "DEBIT / COST"
                : input.optionRight === "put"
                  ? "CASH SECURED"
                  : "SHORT MARGIN"
              : `MARGIN 1:${DEFAULT_LEVERAGE[input.asset]}`
          }
          value={money(result.margin, input.accountCurrency)}
          danger={marginBlocked}
        />
        <Stat
          label={`STOP · ${qty(result.ticksToStop, 1)} ${pip}S`}
          value={money(result.stopLoss, input.accountCurrency)}
          tone="#ff3b5c"
        />
        <Stat
          label={`TARGET · ${qty(result.ticksToTarget, 1)} ${pip}S`}
          value={money(result.takeProfit, input.accountCurrency)}
          tone="#b6ff3b"
        />
        <Stat
          label="R:R"
          value={result.rewardRisk > 0 ? `${result.rewardRisk.toFixed(2)}R` : "—"}
          tone="#f4c430"
        />
        <Stat
          label="ACCOUNT REWARD"
          value={money(result.rewardAmount, input.accountCurrency)}
          tone="#b6ff3b"
        />
      </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 flex w-full divide-x divide-white/8 overflow-x-auto rounded-xl border border-white/8 bg-black/30 text-left"
        >
          <CollapsedStat
            label="SIDE"
            value={
              options
                ? `${input.side === "long" ? "BUY" : "SELL"} ${input.optionRight.toUpperCase()}`
                : input.side === "long"
                  ? "LONG"
                  : "SHORT"
            }
            tone={input.side === "long" ? "#b6ff3b" : "#ff3b5c"}
          />
          <CollapsedStat
            label={options ? "STRIKE" : "ENTRY"}
            value={
              options
                ? input.strike > 0
                  ? qty(input.strike, 2)
                  : "—"
                : input.entry > 0
                  ? qty(input.entry, 4)
                  : "—"
            }
          />
          <CollapsedStat
            label={unit.toUpperCase()}
            value={qty(result.size)}
          />
          <CollapsedStat
            label="RISK"
            value={money(result.stopLoss, input.accountCurrency)}
            tone="#ff3b5c"
          />
          <CollapsedStat
            label="REWARD"
            value={money(result.takeProfit, input.accountCurrency)}
            tone="#b6ff3b"
          />
          <CollapsedStat
            label="R:R"
            value={result.rewardRisk > 0 ? `${result.rewardRisk.toFixed(2)}R` : "—"}
            tone="#f4c430"
          />
          <CollapsedStat
            label={
              options
                ? input.side === "long"
                  ? "DEBIT"
                  : "MARGIN"
                : "MARGIN"
            }
            value={money(result.margin, input.accountCurrency)}
            danger={marginBlocked}
          />
        </button>
      )}
    </section>
  );
}
