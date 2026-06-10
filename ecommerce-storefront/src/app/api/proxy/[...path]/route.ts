import { NextRequest, NextResponse } from "next/server";
import { getPublicApiUrl } from "@/lib/runtime-config";
import {
  isPlatformPreviewHost,
  normalizeHostValue,
  parsePreviewStoreId,
  PREVIEW_STORE_COOKIE,
  resolveStoreIdFromHost,
} from "@/lib/tenant/store-context";

const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

function normalizeApiUrl(rawUrl: string) {
  return rawUrl.trim().replace(/\/+$/, "");
}

function getRequestHost(request: NextRequest) {
  return normalizeHostValue(
    request.headers.get("x-forwarded-host") || request.headers.get("host"),
  );
}

function resolveProxyTenant(request: NextRequest) {
  const host = getRequestHost(request);
  const previewStoreId = isPlatformPreviewHost(host)
    ? parsePreviewStoreId(request.cookies.get(PREVIEW_STORE_COOKIE)?.value)
    : null;
  const storeId = previewStoreId ?? resolveStoreIdFromHost(host);

  return {
    host,
    storeId,
    isPreview: Boolean(previewStoreId),
  };
}

function shouldDropIncomingCookies(path: string) {
  return new Set([
    "auth/session-login",
    "auth/login",
    "auth/customer/login",
    "auth/customer/register",
    "auth/google",
  ]).has(path);
}

function buildProxyHeaders(request: NextRequest, storeId: number, storeHost: string, path: string) {
  const headers = new Headers(request.headers);

  headers.delete("connection");
  headers.delete("cookie");
  headers.delete("expect");
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("proxy-authenticate");
  headers.delete("proxy-authorization");
  headers.delete("origin");
  headers.delete("te");
  headers.delete("trailer");
  headers.delete("transfer-encoding");
  headers.delete("upgrade");
  headers.set("x-store-id", String(storeId));
  headers.set("x-store-host", storeHost);
  headers.set("x-forwarded-host", storeHost);

  if (!shouldDropIncomingCookies(path)) {
    const cookie = request.headers.get("cookie");
    if (cookie) {
      headers.set("cookie", cookie);
    }
  }

  return headers;
}

function buildResponseHeaders(upstreamHeaders: Headers) {
  const headers = new Headers(upstreamHeaders);

  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");

  return headers;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithDevRetry(url: URL, init: RequestInit) {
  const attempts = process.env.NODE_ENV === "production" ? 1 : 8;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await sleep(350);
      }
    }
  }

  throw lastError;
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const apiUrl = normalizeApiUrl(getPublicApiUrl());
  const params = await context.params;
  const path = params.path?.join("/") ?? "";
  const targetUrl = new URL(`${apiUrl}/${path}`);
  targetUrl.search = request.nextUrl.search;

  let tenant: ReturnType<typeof resolveProxyTenant>;

  try {
    tenant = resolveProxyTenant(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[proxy] tenant resolution failed", {
      incomingHost: getRequestHost(request),
      method: request.method,
      path,
      message,
    });

    return NextResponse.json(
      { message, error: "Tenant Resolution Failed", statusCode: 400 },
      { status: 400 },
    );
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[proxy] forwarding request", {
      incomingHost: tenant.host,
      resolvedStoreId: tenant.storeId,
      forwardedStoreHost: tenant.host,
      method: request.method,
      path,
    });
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetchWithDevRetry(targetUrl, {
      method: request.method,
      headers: buildProxyHeaders(request, tenant.storeId, tenant.host, path),
      body: BODYLESS_METHODS.has(request.method)
        ? undefined
        : await request.arrayBuffer(),
      redirect: "manual",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[proxy] upstream request failed", {
      targetUrl: targetUrl.toString(),
      incomingHost: tenant.host,
      resolvedStoreId: tenant.storeId,
      method: request.method,
      path,
      message,
    });

    return NextResponse.json(
      {
        message: `No se pudo conectar con el backend configurado en ${apiUrl}.`,
        detail: message,
        error: "Bad Gateway",
        statusCode: 502,
      },
      { status: 502 },
    );
  }

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: buildResponseHeaders(upstreamResponse.headers),
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const HEAD = proxyRequest;
