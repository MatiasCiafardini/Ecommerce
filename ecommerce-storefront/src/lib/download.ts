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
  const normalizedBlob =
    blob.type === "application/pdf"
      ? blob
      : new Blob([blob], { type: "application/pdf" });
  const objectUrl = URL.createObjectURL(normalizedBlob);
  openWindowFromUrl(objectUrl);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
};
