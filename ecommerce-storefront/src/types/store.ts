export type StoreInventory = {
  quantity: number;
  reserved: number;
};

export type StoreVariant = {
  id: number;
  price?: number | string | null;
  Size?: string | null;
  Color?: string | null;
  weight?: number | null;
  width?: number | null;
  height?: number | null;
  length?: number | null;
  inventories?: StoreInventory[];
  pricing?: {
    basePrice: number;
    finalPrice: number;
    discountAmount: number;
    discountPercentage: number;
    hasActivePromotion: boolean;
    promotionLabel?: string | null;
    pricingDiscountId?: number | null;
    promotionType?: "percentage" | "fixed_amount" | "free_shipping" | null;
    promotionValue?: number | null;
  };
};

export type StoreProductImage = {
  id?: number;
  url: string;
  position?: number;
  offsetX?: number;
  offsetY?: number;
  zoom?: number;
};

export type StoreCategory = {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
};

export type StoreProductCategoryLink = {
  category: StoreCategory;
};

export type StoreProduct = {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  price?: number | string | null;
  images?: StoreProductImage[];
  variants?: StoreVariant[];
  categories?: StoreProductCategoryLink[];
  pricing?: {
    basePrice: number;
    finalPrice: number;
    discountAmount: number;
    discountPercentage: number;
    hasActivePromotion: boolean;
    promotionLabel?: string | null;
    pricingDiscountId?: number | null;
    promotionType?: "percentage" | "fixed_amount" | "free_shipping" | null;
    promotionValue?: number | null;
  };
};

export type StoreProductOptionValue = {
  id: number;
  value: string;
  productId: number;
};

export type StoreProductOption = {
  id: number;
  name: string;
  values: StoreProductOptionValue[];
};
