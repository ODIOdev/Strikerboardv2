import type {
  AssetClass,
  CalcSide,
  CalculatorInput,
  CalculatorResult,
  TradeOutcome,
} from "./types";

const FOREX_BASES = new Set([
  "EUR",
  "GBP",
  "AUD",
  "NZD",
  "USD",
  "CAD",
  "CHF",
  "JPY",
  "SGD",
  "HKD",
  "NOK",
  "SEK",
  "MXN",
  "ZAR",
  "TRY",
  "PLN",
  "HUF",
  "CZK",
  "CNH",
  "DKK",
]);

const CRYPTO_BASES = new Set([
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "DOGE",
  "ADA",
  "AVAX",
  "LINK",
  "DOT",
  "LTC",
  "BCH",
  "UNI",
  "ATOM",
  "NEAR",
  "APT",
  "ARB",
  "OP",
  "SUI",
  "PEPE",
  "SHIB",
  "BNB",
  "TON",
  "TRX",
  "HYPE",
]);

const ETF_TICKERS = new Set([
  "SPY",
  "QQQ",
  "IWM",
  "DIA",
  "VTI",
  "VOO",
  "IVV",
  "GLD",
  "SLV",
  "TLT",
  "HYG",
  "EEM",
  "XLF",
  "XLE",
  "XLK",
  "ARKK",
  "SMH",
  "IEMG",
  "VXUS",
]);

export const ASSET_CLASSES: AssetClass[] = ["forex", "stock", "etf", "crypto"];
export const ACCOUNT_CURRENCIES = ["USD", "EUR", "GBP", "AUD", "CAD", "JPY"] as const;
export const DEFAULT_LEVERAGE: Record<AssetClass, number> = {
  forex: 100,
  stock: 1,
  etf: 1,
  crypto: 5,
};

export function createDefaultCalculator(): CalculatorInput {
  return {
    asset: "stock",
    side: "long",
    accountCurrency: "USD",
    accountBalance: 10000,
    leverage: 1,
    riskPercent: 1,
    rewardPercent: 2,
    entry: 0,
    stop: 0,
    target: 0,
    size: 0,
    equityMode: "shares",
    optionRight: "call",
    strike: 0,
    expiry: "",
  };
}

export function levelsForSide(
  side: CalcSide,
  stop: number,
  target: number,
): Pick<CalculatorInput, "stop" | "target"> {
  if (stop <= 0 || target <= 0) return { stop, target };
  const lo = Math.min(stop, target);
  const hi = Math.max(stop, target);
  return side === "short"
    ? { stop: hi, target: lo }
    : { stop: lo, target: hi };
}

export function normalizeTicker(value: string): string {
  return value.replace(/[\s/_-]/g, "").toUpperCase();
}

export function inferAssetClass(ticker: string): AssetClass {
  const symbol = normalizeTicker(ticker);
  if (!symbol) return "stock";
  if (ETF_TICKERS.has(symbol)) return "etf";
  if (CRYPTO_BASES.has(symbol) || CRYPTO_BASES.has(symbol.slice(0, 3))) {
    return "crypto";
  }
  if (symbol.endsWith("USDT") || symbol.endsWith("USDC")) return "crypto";
  if (isForexPair(symbol)) return "forex";
  return "stock";
}

function isForexPair(symbol: string): boolean {
  if (symbol.length !== 6) return false;
  return FOREX_BASES.has(symbol.slice(0, 3)) && FOREX_BASES.has(symbol.slice(3));
}

export function forexQuote(ticker: string): string | null {
  const symbol = normalizeTicker(ticker);
  if (!isForexPair(symbol)) return null;
  return symbol.slice(3);
}

export function isStockOptions(input: CalculatorInput): boolean {
  return input.asset === "stock" && input.equityMode === "options";
}

export function tickSizeFor(input: CalculatorInput, ticker: string): number {
  if (isStockOptions(input)) return 0.01;
  if (input.asset === "forex") {
    const quote = forexQuote(ticker);
    if (quote === "JPY" || quote === "HUF") return 0.01;
    const symbol = normalizeTicker(ticker);
    if (symbol.startsWith("XAU") || symbol.startsWith("XAG")) return 0.01;
    return 0.0001;
  }
  if (input.asset === "crypto") {
    const symbol = normalizeTicker(ticker);
    if (symbol.startsWith("BTC") || symbol.startsWith("ETH")) return 0.01;
    return 0.0001;
  }
  return 0.01;
}

export function contractSizeFor(input: CalculatorInput): number {
  if (isStockOptions(input)) return 100;
  return input.asset === "forex" ? 100_000 : 1;
}

export function sizeUnit(input: CalculatorInput): string {
  if (isStockOptions(input)) return "contracts";
  if (input.asset === "forex") return "lots";
  if (input.asset === "crypto") return "coins";
  return "shares";
}

export function tickLabel(input: CalculatorInput): string {
  if (isStockOptions(input)) return "TICK";
  return input.asset === "forex" ? "PIP" : "TICK";
}

function lossPerUnit(
  input: CalculatorInput,
  ticker: string,
  stopDistance: number,
): number {
  const contract = contractSizeFor(input);
  if (input.asset === "forex") {
    const quote = forexQuote(ticker);
    if (quote && quote !== input.accountCurrency && input.entry > 0) {
      return (stopDistance * contract) / input.entry;
    }
    return stopDistance * contract;
  }
  return stopDistance * contract;
}

function optionsMargin(input: CalculatorInput, units: number, notional: number): number {
  if (input.side === "long") return notional;
  if (input.optionRight === "put" && input.strike > 0) {
    return input.strike * units;
  }
  if (input.strike > 0) return input.strike * units * 0.2;
  return notional;
}

export function calculateTrade(
  input: CalculatorInput,
  ticker: string,
): CalculatorResult {
  const options = isStockOptions(input);
  const tickSize = tickSizeFor(input, ticker);
  const contractSize = contractSizeFor(input);
  const stopDistance = Math.abs(input.entry - input.stop);
  const targetDistance = Math.abs(input.target - input.entry);
  const riskAmount = (input.accountBalance * input.riskPercent) / 100;
  const rewardAmount = (input.accountBalance * input.rewardPercent) / 100;
  const perUnit = stopDistance > 0 ? lossPerUnit(input, ticker, stopDistance) : 0;
  const suggestedSize = perUnit > 0 ? riskAmount / perUnit : 0;
  const size = input.size > 0 ? input.size : suggestedSize;
  const units = size * contractSize;
  const quote = forexQuote(ticker);
  const convert =
    input.asset === "forex" &&
    quote !== null &&
    quote !== input.accountCurrency &&
    input.entry > 0;
  const priceFactor = convert ? 1 / input.entry : 1;
  const tickValue = tickSize * units * priceFactor;
  const notional = input.entry * units * priceFactor;
  const leverage = Math.max(1, DEFAULT_LEVERAGE[input.asset]);
  const margin = options
    ? optionsMargin(input, units, notional)
    : notional / leverage;
  const stopLoss = stopDistance * units * priceFactor;
  const unitValue = units * priceFactor;
  const takeProfit =
    input.target > 0 ? targetDistance * unitValue : rewardAmount;
  const resolvedTargetDistance =
    input.target > 0
      ? targetDistance
      : unitValue > 0
        ? takeProfit / unitValue
        : 0;
  const derivedTarget =
    input.entry > 0 && resolvedTargetDistance > 0
      ? input.side === "short"
        ? input.entry - resolvedTargetDistance
        : input.entry + resolvedTargetDistance
      : 0;
  const rewardRisk =
    input.riskPercent > 0 && input.target <= 0
      ? input.rewardPercent / input.riskPercent
      : stopLoss > 0
        ? takeProfit / stopLoss
        : 0;
  const ticksToStop = tickSize > 0 ? stopDistance / tickSize : 0;
  const ticksToTarget = tickSize > 0 ? resolvedTargetDistance / tickSize : 0;

  return {
    tickSize,
    contractSize,
    units,
    size,
    sizeLabel: sizeUnit(input),
    tickValue,
    ticksToStop,
    ticksToTarget,
    notional,
    margin,
    riskAmount,
    rewardAmount,
    suggestedSize,
    stopLoss,
    takeProfit,
    rewardRisk,
    derivedTarget,
    usedRiskSize: input.size <= 0,
    priceFactor,
  };
}

export function unitValue(input: CalculatorInput, ticker: string): number {
  const calc = calculateTrade(input, ticker);
  return calc.size * calc.contractSize * calc.priceFactor;
}

export function pnlAtExit(
  input: CalculatorInput,
  ticker: string,
  exit: number,
): number {
  if (!Number.isFinite(exit) || input.entry <= 0) return 0;
  const calc = calculateTrade(input, ticker);
  if (calc.size <= 0) return 0;
  const move = input.side === "short" ? input.entry - exit : exit - input.entry;
  return move * calc.size * calc.contractSize * calc.priceFactor;
}

export function outcomeAtExit(
  input: CalculatorInput,
  exit: number,
): TradeOutcome {
  const { side, stop, target, entry } = input;
  if (side === "short") {
    if (stop > 0 && exit >= stop) return "lost";
    if (target > 0 && exit <= target) return "won";
    return exit < entry ? "won" : "lost";
  }
  if (stop > 0 && exit <= stop) return "lost";
  if (target > 0 && exit >= target) return "won";
  return exit > entry ? "won" : "lost";
}

export function money(value: number, currency = "USD"): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function qty(value: number, digits = 4): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}
