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
  const objectUrl = URL.createObjectURL(blob);
  openWindowFromUrl(objectUrl);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
};
