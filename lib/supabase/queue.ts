export function queueCloudPush() {
  if (typeof window === "undefined") return;
  void import("./sync").then((mod) => mod.scheduleCloudPush());
}

export function queueCloudHydrate() {
  if (typeof window === "undefined") return;
  void import("./sync").then((mod) => mod.hydrateFromCloud());
}

export function queueCloudErase() {
  if (typeof window === "undefined") return;
  void import("./sync").then((mod) => mod.eraseCloud());
}
