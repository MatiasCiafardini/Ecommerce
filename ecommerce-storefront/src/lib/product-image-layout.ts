type ImageLayout = {
  offsetX?: number | null;
  offsetY?: number | null;
  zoom?: number | null;
};

function getImageLayoutValues(image?: ImageLayout | null) {
  const offsetX = Number(image?.offsetX ?? 0);
  const offsetY = Number(image?.offsetY ?? 0);
  const zoom = Number(image?.zoom ?? 1.08);

  return { offsetX, offsetY, zoom };
}

export function getCatalogImageTransform(image?: ImageLayout | null) {
  const { offsetX, offsetY, zoom } = getImageLayoutValues(image);

  return {
    objectFit: "contain" as const,
    objectPosition: "center center" as const,
    transform: `translate(${offsetX}%, ${offsetY}%) scale(${zoom})`,
    transformOrigin: "center center" as const,
  };
}

export function getProductImageTransform(image?: ImageLayout | null) {
  const { offsetX, offsetY, zoom } = getImageLayoutValues(image);

  return {
    objectFit: "cover" as const,
    objectPosition: "center center" as const,
    transform: `translate(${offsetX}%, ${offsetY}%) scale(${zoom})`,
    transformOrigin: "center center" as const,
  };
}

export function clampImageOffset(value: number) {
  return Math.max(-40, Math.min(40, value));
}

export function clampImageZoom(value: number) {
  return Math.max(1, Math.min(2.5, value));
}
