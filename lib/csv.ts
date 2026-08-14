import { createDefaultCalculator, inferAssetClass, normalizeTicker, ACCOUNT_CURRENCIES } from "./calculator";
import { createTradeRecord } from "./default-checklist";
import type {
  AssetClass,
  Bias,
  CalcSide,
  ClosedTrade,
  DeskState,
  EquityMode,
  OptionRight,
  Trade,
  TradeOutcome,
  Wave,
} from "./types";

export const CSV_COLUMNS = [
  "id",
  "ticker",
  "side",
  "status",
  "outcome",
  "entry",
  "stop",
  "target",
  "size",
  "asset",
  "equityMode",
  "optionRight",
  "strike",
  "expiry",
  "riskPercent",
  "rewardPercent",
  "accountBalance",
  "accountCurrency",
  "bias",
  "wave",
  "group",
  "createdAt",
  "closedAt",
  "realizedPnl",
] as const;

export type CsvImportResult = {
  trades: Trade[];
  closedTrades: ClosedTrade[];
  groups: { id: string; name: string }[];
  skipped: number;
};

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function csvLine(values: Array<string | number | null | undefined>) {
  return values.map(csvEscape).join(",");
}

function stamp(value: number) {
  if (!value) return "";
  return new Date(value).toISOString();
}

function groupName(desk: DeskState, groupId: string | null) {
  if (!groupId) return "";
  return desk.groups.find((group) => group.id === groupId)?.name ?? "";
}

function rowFromTrade(
  trade: Trade | ClosedTrade,
  desk: DeskState,
  status: "open" | "closed",
) {
  const closed = "closedAt" in trade ? trade : null;
  return csvLine([
    trade.id,
    trade.ticker,
    trade.calculator.side,
    status,
    closed?.outcome ?? "",
    trade.calculator.entry,
    trade.calculator.stop,
    trade.calculator.target,
    trade.calculator.size,
    trade.calculator.asset,
    trade.calculator.equityMode,
    trade.calculator.optionRight,
    trade.calculator.strike,
    trade.calculator.expiry,
    trade.calculator.riskPercent,
    trade.calculator.rewardPercent,
    trade.calculator.accountBalance,
    trade.calculator.accountCurrency,
    trade.bias,
    trade.wave,
    groupName(desk, trade.groupId),
    stamp(trade.createdAt),
    closed ? stamp(closed.closedAt) : "",
    closed?.realizedPnl ?? "",
  ]);
}

export function deskToCsv(desk: DeskState) {
  const lines = [CSV_COLUMNS.join(",")];
  for (const trade of desk.trades) {
    lines.push(rowFromTrade(trade, desk, "open"));
  }
  for (const trade of desk.closedTrades) {
    lines.push(rowFromTrade(trade, desk, "closed"));
  }
  return `${lines.join("\n")}\n`;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseStamp(value: string) {
  if (!value) return 0;
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 1_000_000_000) return asNumber;
  const asDate = Date.parse(value);
  return Number.isFinite(asDate) ? asDate : 0;
}

function num(value: string, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function isSide(value: string): value is CalcSide {
  return value === "long" || value === "short";
}

function isAsset(value: string): value is AssetClass {
  return value === "forex" || value === "stock" || value === "etf" || value === "crypto";
}

function isBias(value: string): value is Bias {
  return value === "bullish" || value === "bearish";
}

function isWave(value: string): value is Wave {
  return value === "A" || value === "B" || value === "C";
}

function isOutcome(value: string): value is TradeOutcome {
  return value === "won" || value === "lost";
}

function isEquityMode(value: string): value is EquityMode {
  return value === "shares" || value === "options";
}

function isRight(value: string): value is OptionRight {
  return value === "call" || value === "put";
}

export function csvToDesk(text: string): CsvImportResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    return { trades: [], closedTrades: [], groups: [], skipped: 0 };
  }

  const headers = splitCsvLine(lines[0]).map((item) => item.toLowerCase());
  const index = (name: string) => headers.indexOf(name);
  const read = (cells: string[], name: string, aliases: string[] = []) => {
    for (const key of [name, ...aliases]) {
      const at = index(key);
      if (at >= 0) return cells[at] ?? "";
    }
    return "";
  };

  const trades: Trade[] = [];
  const closedTrades: ClosedTrade[] = [];
  const groups: { id: string; name: string }[] = [];
  const groupByName = new Map<string, string>();
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const ticker = normalizeTicker(read(cells, "ticker", ["symbol"]));
    if (!ticker) {
      skipped += 1;
      continue;
    }

    const record = createTradeRecord();
    const id = read(cells, "id") || record.id;
    const sideRaw = read(cells, "side").toLowerCase();
    const assetRaw = read(cells, "asset").toLowerCase();
    const biasRaw = read(cells, "bias").toLowerCase();
    const waveRaw = read(cells, "wave").toUpperCase();
    const outcomeRaw = read(cells, "outcome").toLowerCase();
    const statusRaw = read(cells, "status").toLowerCase();
    const modeRaw = read(cells, "equitymode", ["equity_mode"]).toLowerCase();
    const rightRaw = read(cells, "optionright", ["option_right"]).toLowerCase();
    const group = read(cells, "group").trim();
    let groupId: string | null = null;
    if (group) {
      const existing = groupByName.get(group.toLowerCase());
      if (existing) {
        groupId = existing;
      } else {
        const next = { id: crypto.randomUUID(), name: group };
        groups.push(next);
        groupByName.set(group.toLowerCase(), next.id);
        groupId = next.id;
      }
    }

    const currency = read(cells, "accountcurrency", ["currency"]).toUpperCase();
    const defaults = createDefaultCalculator();
    const trade: Trade = {
      ...record,
      id,
      ticker,
      createdAt: parseStamp(read(cells, "createdat", ["created_at"])) || record.createdAt,
      updatedAt: Date.now(),
      bias: isBias(biasRaw) ? biasRaw : record.bias,
      wave: isWave(waveRaw) ? waveRaw : record.wave,
      groupId,
      calculator: {
        ...defaults,
        asset: isAsset(assetRaw) ? assetRaw : inferAssetClass(ticker),
        side: isSide(sideRaw)
          ? sideRaw
          : sideRaw === "sell" || sideRaw === "short"
            ? "short"
            : "long",
        accountCurrency: ACCOUNT_CURRENCIES.includes(
          currency as (typeof ACCOUNT_CURRENCIES)[number],
        )
          ? (currency as Trade["calculator"]["accountCurrency"])
          : defaults.accountCurrency,
        accountBalance: num(read(cells, "accountbalance"), defaults.accountBalance),
        riskPercent: num(read(cells, "riskpercent"), defaults.riskPercent),
        rewardPercent: num(read(cells, "rewardpercent"), defaults.rewardPercent),
        entry: num(read(cells, "entry")),
        stop: num(read(cells, "stop")),
        target: num(read(cells, "target")),
        size: num(read(cells, "size")),
        equityMode: isEquityMode(modeRaw) ? modeRaw : defaults.equityMode,
        optionRight: isRight(rightRaw) ? rightRaw : defaults.optionRight,
        strike: num(read(cells, "strike")),
        expiry: read(cells, "expiry"),
      },
    };

    const outcome = isOutcome(outcomeRaw) ? outcomeRaw : null;
    const closed =
      statusRaw === "closed" ||
      statusRaw === "won" ||
      statusRaw === "lost" ||
      outcome !== null ||
      Boolean(read(cells, "closedat", ["closed_at"]));

    if (closed) {
      closedTrades.push({
        ...trade,
        closedAt: parseStamp(read(cells, "closedat", ["closed_at"])) || Date.now(),
        outcome: outcome ?? (statusRaw === "won" || statusRaw === "lost" ? statusRaw : null),
        realizedPnl: read(cells, "realizedpnl", ["pnl", "realized_pnl"])
          ? num(read(cells, "realizedpnl", ["pnl", "realized_pnl"]))
          : null,
      });
    } else {
      trades.push(trade);
    }
  }

  return { trades, closedTrades, groups, skipped };
}
