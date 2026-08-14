export type TradeChart = {
  id: string;
  tradeId: string;
  createdAt: number;
  name: string;
  dataUrl: string;
};

export const CHARTS_EVENT = "striker-charts";
export const MAX_CHARTS = 24;

const DB_NAME = "striker-charts";
const DB_VERSION = 1;
const STORE = "charts";
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHARTS_EVENT));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("tradeId", "tradeId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export async function loadTradeCharts(tradeId: string): Promise<TradeChart[]> {
  if (typeof window === "undefined") return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const index = tx.objectStore(STORE).index("tradeId");
    const request = index.getAll(tradeId);
    request.onsuccess = () => {
      const rows = (request.result as TradeChart[]).sort(
        (a, b) => b.createdAt - a.createdAt,
      );
      resolve(rows);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function countTradeCharts(tradeId: string): Promise<number> {
  const rows = await loadTradeCharts(tradeId);
  return rows.length;
}

export async function saveTradeChart(chart: TradeChart): Promise<void> {
  await withStore("readwrite", (store) => store.put(chart));
  emit();
}

export async function deleteTradeChart(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
  emit();
}

export async function removeTradeCharts(tradeId: string): Promise<void> {
  const rows = await loadTradeCharts(tradeId);
  if (rows.length === 0) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const row of rows) store.delete(row.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  emit();
}

export async function compressChartFile(file: File): Promise<{
  dataUrl: string;
  name: string;
}> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not read that image.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return {
    dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY),
    name: file.name.replace(/\.[^.]+$/, "") || "chart",
  };
}
