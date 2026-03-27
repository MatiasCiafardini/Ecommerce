const parseStoreIds = (rawValue?: string | null) =>
  String(rawValue ?? "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

export const isManualSalesEnabledForStore = (storeId: number) => {
  const enabledStoreIds = parseStoreIds(process.env.MANUAL_SALES_ENABLED_STORE_IDS);
  return enabledStoreIds.includes(storeId);
};

export const resolveStoreFeatures = (storeId: number) => ({
  manualSalesEnabled: isManualSalesEnabledForStore(storeId),
});
