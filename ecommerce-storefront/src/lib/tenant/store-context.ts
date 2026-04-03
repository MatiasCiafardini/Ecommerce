export type HostStoreMap = Record<string, number>;

const DEV_HOST_STORE_MAP: HostStoreMap = {
  localhost: 1,
  "127.0.0.1": 1,
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

function isDevelopmentLikeEnvironment() {
  return process.env.NODE_ENV !== "production";
}

function normalizeHostValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const firstValue = value.split(",")[0]?.trim().toLowerCase() ?? "";

  if (!firstValue) {
    return "";
  }

  const withoutProtocol = firstValue.replace(/^[a-z]+:\/\//i, "");
  const withoutPath = withoutProtocol.split("/")[0]?.trim() ?? "";

  return withoutPath.replace(/\.$/, "");
}

function getDefaultHostStoreMap(): HostStoreMap {
  return isDevelopmentLikeEnvironment() ? { ...DEV_HOST_STORE_MAP } : {};
}

function getConfiguredHosts(hostStoreMap: HostStoreMap) {
  const configuredHosts = Object.keys(hostStoreMap).sort();
  return configuredHosts.length > 0 ? configuredHosts.join(", ") : "(none)";
}

function isLocalDevelopmentHost(host: string) {
  return host === "localhost" || host === "127.0.0.1";
}

function resolveLocalFallbackStoreId(host: string, hostStoreMap: HostStoreMap) {
  if (!isLocalDevelopmentHost(host)) {
    return undefined;
  }

  const explicitLocalhostFallback = hostStoreMap[host];

  if (explicitLocalhostFallback) {
    return explicitLocalhostFallback;
  }

  const derivedStoreId =
    hostStoreMap[`${host}:3001`] ??
    hostStoreMap[host === "localhost" ? "127.0.0.1:3001" : "localhost:3001"];

  return derivedStoreId;
}

function buildUnknownHostMessage(host: string | null | undefined, hostStoreMap: HostStoreMap) {
  const normalizedHost = normalizeHostValue(host);
  const configuredHosts = getConfiguredHosts(hostStoreMap);

  if (!normalizedHost) {
    return `Could not resolve store because the request host is missing. Configure NEXT_PUBLIC_STORE_HOST_MAP with one of: ${configuredHosts}`;
  }

  return `Could not resolve store for host "${normalizedHost}". Configure NEXT_PUBLIC_STORE_HOST_MAP with this host. Known hosts: ${configuredHosts}`;
}

export function parseHostStoreMap(raw = process.env.NEXT_PUBLIC_STORE_HOST_MAP): HostStoreMap {
  const fallbackMap = getDefaultHostStoreMap();
  const normalizedRaw = raw?.trim() ?? "";

  if (!normalizedRaw) {
    return fallbackMap;
  }

  const parsedMap: HostStoreMap = {};
  const invalidEntries: string[] = [];

  for (const rawEntry of normalizedRaw.split(",")) {
    const entry = rawEntry.trim();

    if (!entry) {
      continue;
    }

    const separatorIndex = entry.indexOf("=");

    if (separatorIndex <= 0 || separatorIndex === entry.length - 1) {
      invalidEntries.push(entry);
      continue;
    }

    const host = normalizeHostValue(entry.slice(0, separatorIndex));
    const storeId = Number(entry.slice(separatorIndex + 1).trim());

    if (!host || !Number.isInteger(storeId) || storeId <= 0) {
      invalidEntries.push(entry);
      continue;
    }

    parsedMap[host] = storeId;
  }

  if (Object.keys(parsedMap).length === 0) {
    const fallbackHosts = getConfiguredHosts(fallbackMap);
    throw new Error(
      `NEXT_PUBLIC_STORE_HOST_MAP is invalid. Expected entries like "domain.com=1". Received: "${normalizedRaw}". Invalid entries: ${invalidEntries.join(", ") || "(none)"}. Development fallback hosts: ${fallbackHosts}`,
    );
  }

  return {
    ...fallbackMap,
    ...parsedMap,
  };
}

export function resolveStoreIdFromHost(host?: string | null) {
  const normalizedHost = normalizeHostValue(host);
  const hostStoreMap = parseHostStoreMap();

  if (!normalizedHost) {
    throw new Error(buildUnknownHostMessage(host, hostStoreMap));
  }

  const exactMatch = hostStoreMap[normalizedHost];

  if (exactMatch) {
    return exactMatch;
  }

  const localFallback = resolveLocalFallbackStoreId(normalizedHost, hostStoreMap);

  if (localFallback) {
    return localFallback;
  }

  const hostWithoutPort = normalizedHost.replace(/:\d+$/, "");
  const fallbackMatch =
    hostWithoutPort !== normalizedHost ? hostStoreMap[hostWithoutPort] : undefined;

  if (fallbackMatch) {
    return fallbackMatch;
  }

  throw new Error(buildUnknownHostMessage(host, hostStoreMap));
}

export function getClientStoreId() {
  if (typeof window === "undefined") {
    throw new Error("getClientStoreId can only be used in the browser");
  }

  return resolveStoreIdFromHost(window.location.host);
}
