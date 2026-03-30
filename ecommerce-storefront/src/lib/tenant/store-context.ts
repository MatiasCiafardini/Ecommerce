const DEFAULT_HOST_STORE_MAP: Record<string, number> = {
  "localhost:3001": 1,
  "127.0.0.1:3001": 1,
  "localhost:3002": 2,
  "127.0.0.1:3002": 2,
  "localhost:3003": 3003,
  "127.0.0.1:3003": 3003,
  "localhost:3004": 4,
  "127.0.0.1:3004": 4,
  "localhost:3005": 3005,
  "127.0.0.1:3005": 3005,
};

function normalizeHost(host?: string | null) {
  return host?.trim().toLowerCase() ?? "";
}

function buildUnknownHostMessage(host?: string | null) {
  const normalizedHost = normalizeHost(host);
  const configuredHosts = Object.keys(parseHostStoreMap()).sort();

  if (!normalizedHost) {
    return `Could not resolve store because the request host is missing. Configure NEXT_PUBLIC_STORE_HOST_MAP with one of: ${configuredHosts.join(", ")}`;
  }

  return `Could not resolve store for host "${normalizedHost}". Configure NEXT_PUBLIC_STORE_HOST_MAP with this host. Known hosts: ${configuredHosts.join(", ")}`;
}

function parseHostStoreMap() {
  const raw = process.env.NEXT_PUBLIC_STORE_HOST_MAP?.trim();

  if (!raw) {
    return DEFAULT_HOST_STORE_MAP;
  }

  const entries = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [host, value] = entry.split("=");
      const storeId = Number(value?.trim());

      if (!host || !Number.isInteger(storeId) || storeId <= 0) {
        return null;
      }

      return [normalizeHost(host), storeId] as const;
    })
    .filter((entry): entry is readonly [string, number] => entry !== null);

  if (entries.length === 0) {
    return DEFAULT_HOST_STORE_MAP;
  }

  return Object.fromEntries(entries);
}

export function resolveStoreIdFromHost(host?: string | null) {
  const normalizedHost = normalizeHost(host);
  const hostStoreMap = parseHostStoreMap();
  const storeId = hostStoreMap[normalizedHost];

  if (!storeId) {
    throw new Error(buildUnknownHostMessage(host));
  }

  return storeId;
}

export function getClientStoreId() {
  if (typeof window === "undefined") {
    throw new Error("getClientStoreId can only be used in the browser");
  }

  return resolveStoreIdFromHost(window.location.host);
}
