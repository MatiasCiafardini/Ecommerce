const openWindowFromUrl = (url: string) => {
  const popup = window.open(url, "_blank", "noopener,noreferrer");

  if (!popup) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
};

export const openBlobFile = (blob: Blob) => {
  const supportedInlineTypes = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
  ]);
  const normalizedBlob = supportedInlineTypes.has(blob.type)
    ? blob
    : new Blob([blob], { type: "application/pdf" });
  const objectUrl = URL.createObjectURL(normalizedBlob);
  openWindowFromUrl(objectUrl);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
};

export const downloadBlobFile = (blob: Blob, filename: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
};
