"use client";

import { getClientStoreId } from "@/lib/tenant/store-context";

const scopedKey = (key: string) => `${key}:store:${getClientStoreId()}`;

export function getScopedStorageItem(key: string) {
  return localStorage.getItem(scopedKey(key));
}

export function setScopedStorageItem(key: string, value: string) {
  localStorage.setItem(scopedKey(key), value);
}

export function removeScopedStorageItem(key: string) {
  localStorage.removeItem(scopedKey(key));
}
