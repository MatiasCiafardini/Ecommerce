import { NextResponse } from "next/server";
import { PREVIEW_STORE_COOKIE, parsePreviewStoreId } from "@/lib/tenant/store-context";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const previewStoreId = parsePreviewStoreId(storeId);
  const redirectUrl = new URL("/", request.url);

  if (!previewStoreId) {
    return NextResponse.redirect(redirectUrl);
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(PREVIEW_STORE_COOKIE, String(previewStoreId), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
