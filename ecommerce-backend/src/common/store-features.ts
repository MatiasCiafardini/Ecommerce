export const resolveStoreFeatures = (store?: {
  manualSalesEnabled?: boolean | null;
}) => ({
  manualSalesEnabled: Boolean(store?.manualSalesEnabled),
});
