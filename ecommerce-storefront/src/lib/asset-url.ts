import { getPublicApiUrl } from "@/lib/runtime-config";

function getApiOrigin() {
  const apiUrl = getPublicApiUrl();

  if (!apiUrl) {
    return "";
  }

  try {
    return new URL(apiUrl).origin;
  } catch {
    return "";
  }
}

export function resolveAssetUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith("/uploads/")) {
    const origin = getApiOrigin();
    return origin ? `${origin}${url}` : url;
  }

  return url;
}
