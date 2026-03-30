const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const catalogDir = path.join(rootDir, "ecommerce-storefront", "public", "images", "seed-catalog");
const categoryDir = path.join(rootDir, "ecommerce-storefront", "public", "images", "seed-categories");

const palettes = [
  { cloth: "#e9e3dc", shade: "#cfc5b9", line: "#4a413a", accent: "#9f8671", paper: "#faf6f1" },
  { cloth: "#d8ddd8", shade: "#b6beb7", line: "#414741", accent: "#718070", paper: "#f7f8f4" },
  { cloth: "#ddd7d3", shade: "#bdb3ae", line: "#4f4540", accent: "#8d7367", paper: "#f8f3ef" },
  { cloth: "#dad6de", shade: "#b5afbf", line: "#433f4a", accent: "#766d85", paper: "#f7f5fb" },
  { cloth: "#d9d4cc", shade: "#bbb29f", line: "#474033", accent: "#8a7453", paper: "#f8f4ec" },
];

const categoryLabels = {
  remeras: "Remeras",
  buzos: "Buzos",
  camperas: "Camperas",
  pantalones: "Pantalones",
  cargos: "Cargos",
  joggers: "Joggers",
  camisas: "Camisas",
  shorts: "Shorts",
  chalecos: "Chalecos",
  accesorios: "Accesorios",
};

function titleCase(value) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function hashValue(input) {
  let hash = 0;
  for (const char of input) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function pickPalette(key) {
  return palettes[hashValue(key) % palettes.length];
}

function getProductMeta(filename) {
  const baseName = path.basename(filename, ".svg");
  const isDetail = baseName.endsWith("-detail");
  const slug = baseName.replace(/-(front|detail)$/u, "");
  const parts = slug.split("-");
  const kind = parts[0] || "producto";
  const title = titleCase(parts.slice(0, -1).join("-"));
  const collection = titleCase(parts.slice(-2).join("-"));

  return {
    slug,
    kind,
    isDetail,
    title,
    collection,
    palette: pickPalette(slug),
  };
}

function garmentShape(kind, line) {
  switch (kind) {
    case "remera":
      return `
        <path d="M288 208l118-72 62 52 66-52 118 72-48 116-60-28v430H396V296l-60 28z" fill="url(#clothFill)" stroke="${line}" stroke-width="8" stroke-linejoin="round" />
        <path d="M472 188c20 20 44 30 62 30 20 0 42-10 64-30" stroke="${line}" stroke-width="6" stroke-linecap="round" opacity="0.72" />
        <path d="M468 188v538" stroke="${line}" stroke-width="4" opacity="0.18" />
        <path d="M406 726h138" stroke="${line}" stroke-width="5" opacity="0.4" />
      `;
    case "buzo":
      return `
        <path d="M448 132c26-18 50-28 82-28s56 10 82 28l34 72-28 42H362l-28-42z" fill="url(#shadeFill)" opacity="0.98" />
        <path d="M260 252l140-58h260l140 58-52 112-68-34v406H380V330l-68 34z" fill="url(#clothFill)" stroke="${line}" stroke-width="8" stroke-linejoin="round" />
        <rect x="454" y="468" width="152" height="88" rx="38" fill="none" stroke="${line}" stroke-width="6" opacity="0.42" />
        <path d="M462 194c14 36 34 56 68 56s54-20 68-56" stroke="${line}" stroke-width="5" opacity="0.62" stroke-linecap="round" />
        <path d="M530 246v490" stroke="${line}" stroke-width="4" opacity="0.16" />
      `;
    case "campera":
      return `
        <path d="M298 212l116-72 58 62 58-62 116 72-40 118-70-30v434H424V300l-70 30z" fill="url(#clothFill)" stroke="${line}" stroke-width="8" stroke-linejoin="round" />
        <path d="M530 148v586" stroke="${line}" stroke-width="8" opacity="0.65" />
        <rect x="416" y="446" width="60" height="98" rx="18" fill="none" stroke="${line}" stroke-width="6" opacity="0.38" />
        <rect x="584" y="446" width="60" height="98" rx="18" fill="none" stroke="${line}" stroke-width="6" opacity="0.38" />
        <path d="M430 218h200" stroke="${line}" stroke-width="5" opacity="0.22" />
      `;
    case "camisa":
      return `
        <path d="M310 210l114-74 52 58 54-58 114 74-40 108-62-26v442H418V292l-62 26z" fill="url(#clothFill)" stroke="${line}" stroke-width="8" stroke-linejoin="round" />
        <path d="M530 144v590" stroke="${line}" stroke-width="7" opacity="0.6" />
        <path d="M456 232h148" stroke="${line}" stroke-width="6" opacity="0.42" />
        <path d="M486 164c16 24 28 34 44 34s28-10 44-34" stroke="${line}" stroke-width="5" opacity="0.62" stroke-linecap="round" />
        <path d="M436 314c44 18 150 18 194 0" stroke="${line}" stroke-width="4" opacity="0.16" />
      `;
    case "chaleco":
      return `
        <path d="M390 166l140-54 140 54-28 566H390z" fill="url(#clothFill)" stroke="${line}" stroke-width="8" stroke-linejoin="round" />
        <path d="M530 166v566" stroke="${line}" stroke-width="7" opacity="0.56" />
        <rect x="436" y="430" width="66" height="104" rx="18" fill="none" stroke="${line}" stroke-width="6" opacity="0.34" />
        <rect x="558" y="430" width="66" height="104" rx="18" fill="none" stroke="${line}" stroke-width="6" opacity="0.34" />
      `;
    case "pantalon":
      return `
        <path d="M416 130h228l-22 244-40 362h-78l-20-254-20 254h-78l-40-362z" fill="url(#clothFill)" stroke="${line}" stroke-width="8" stroke-linejoin="round" />
        <path d="M486 130v210m88-210v210" stroke="${line}" stroke-width="6" opacity="0.34" />
        <path d="M464 468l40 66m116-66l-40 66" stroke="${line}" stroke-width="5" opacity="0.16" stroke-linecap="round" />
      `;
    case "cargo":
      return `
        <path d="M400 130h260l-26 228-34 378h-86l-18-220-18 220h-86l-34-378z" fill="url(#clothFill)" stroke="${line}" stroke-width="8" stroke-linejoin="round" />
        <rect x="390" y="386" width="70" height="110" rx="18" fill="none" stroke="${line}" stroke-width="6" opacity="0.42" />
        <rect x="600" y="386" width="70" height="110" rx="18" fill="none" stroke="${line}" stroke-width="6" opacity="0.42" />
        <path d="M488 130v214m84-214v214" stroke="${line}" stroke-width="6" opacity="0.32" />
      `;
    case "jogger":
      return `
        <path d="M416 132h228l-20 248-26 272c-4 40-36 72-76 72h-12l-22-204-22 204h-12c-40 0-72-32-76-72l-26-272z" fill="url(#clothFill)" stroke="${line}" stroke-width="8" stroke-linejoin="round" />
        <rect x="422" y="698" width="74" height="24" rx="12" fill="url(#shadeFill)" />
        <rect x="564" y="698" width="74" height="24" rx="12" fill="url(#shadeFill)" />
        <path d="M486 132v196m88-196v196" stroke="${line}" stroke-width="6" opacity="0.3" />
      `;
    case "short":
      return `
        <path d="M418 136h224l-22 162-24 192h-70l-22-118-22 118h-70l-24-192z" fill="url(#clothFill)" stroke="${line}" stroke-width="8" stroke-linejoin="round" />
        <path d="M486 136v136m88-136v136" stroke="${line}" stroke-width="6" opacity="0.32" />
      `;
    case "accesorio":
      return `
        <path d="M380 462c0-88 66-146 150-146s150 58 150 146v54H380z" fill="url(#clothFill)" stroke="${line}" stroke-width="8" />
        <rect x="338" y="516" width="384" height="34" rx="17" fill="url(#shadeFill)" />
        <path d="M440 604h180v118H440z" fill="url(#clothFill)" stroke="${line}" stroke-width="8" />
      `;
    default:
      return `
        <rect x="392" y="176" width="276" height="540" rx="48" fill="url(#clothFill)" stroke="${line}" stroke-width="8" />
      `;
  }
}

function detailMarkup(kind, line) {
  switch (kind) {
    case "camisa":
    case "campera":
    case "chaleco":
      return `
        <path d="M302 286l198-110 86 94 106-94 84 62-104 120-188 34-162-52z" fill="url(#clothFill)" stroke="${line}" stroke-width="8" stroke-linejoin="round" />
        <path d="M512 176v214" stroke="${line}" stroke-width="7" opacity="0.54" />
        <circle cx="510" cy="324" r="8" fill="${line}" opacity="0.45" />
        <circle cx="510" cy="366" r="8" fill="${line}" opacity="0.45" />
      `;
    case "pantalon":
    case "cargo":
    case "jogger":
    case "short":
      return `
        <path d="M344 218h372l-34 150-18 206h-104l-26-130-26 130H404l-18-206z" fill="url(#clothFill)" stroke="${line}" stroke-width="8" stroke-linejoin="round" />
        <path d="M516 218v132" stroke="${line}" stroke-width="6" opacity="0.36" />
        <rect x="352" y="326" width="76" height="104" rx="18" fill="none" stroke="${line}" stroke-width="6" opacity="0.34" />
      `;
    default:
      return `
        <path d="M298 220l134-80 64 46 62-46 132 80-46 120-68-32v388H412V308l-68 32z" fill="url(#clothFill)" stroke="${line}" stroke-width="8" stroke-linejoin="round" />
        <path d="M526 176v520" stroke="${line}" stroke-width="6" opacity="0.24" />
      `;
  }
}

function buildProductSvg(meta) {
  const { title, collection, palette, kind, isDetail } = meta;
  const { cloth, shade, line, accent, paper } = palette;
  const smallLabel = isDetail ? "Detalle" : collection.toUpperCase();
  const art = isDetail ? detailMarkup(kind, line) : garmentShape(kind, line);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1060 1320" fill="none">
  <defs>
    <linearGradient id="paperBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${paper}" />
      <stop offset="100%" stop-color="#f1ece5" />
    </linearGradient>
    <linearGradient id="clothFill" x1="0" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="${cloth}" />
      <stop offset="58%" stop-color="${shade}" />
      <stop offset="100%" stop-color="${accent}" />
    </linearGradient>
    <linearGradient id="shadeFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${shade}" />
      <stop offset="100%" stop-color="${accent}" />
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="24" stdDeviation="26" flood-color="#000000" flood-opacity="0.12" />
    </filter>
    <pattern id="paperNoise" width="32" height="32" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="8" r="1" fill="#000000" opacity="0.04" />
      <circle cx="17" cy="18" r="1" fill="#000000" opacity="0.03" />
      <circle cx="26" cy="10" r="1" fill="#000000" opacity="0.035" />
      <path d="M8 26h8" stroke="#000000" stroke-width="1" opacity="0.03" />
    </pattern>
    <pattern id="fabricLines" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
      <path d="M0 8h16" stroke="#ffffff" stroke-width="1.1" opacity="0.16" />
    </pattern>
    <clipPath id="artArea">
      <rect x="68" y="68" width="924" height="1184" rx="42" />
    </clipPath>
  </defs>
  <rect width="1060" height="1320" rx="52" fill="url(#paperBg)" />
  <rect width="1060" height="1320" rx="52" fill="url(#paperNoise)" />
  <g clip-path="url(#artArea)">
    <circle cx="864" cy="204" r="180" fill="#ffffff" opacity="0.5" />
    <circle cx="186" cy="1048" r="156" fill="${accent}" opacity="0.08" />
    <ellipse cx="530" cy="1012" rx="244" ry="52" fill="#000000" opacity="0.08" />
    <g filter="url(#softShadow)" transform="${isDetail ? "translate(0 18)" : "translate(0 0)"}">
      ${art}
      <path d="M282 126h496" stroke="${line}" stroke-width="3" opacity="0.08" />
      <rect x="280" y="120" width="500" height="760" fill="url(#fabricLines)" opacity="0.36" />
    </g>
    <path d="M126 170c62-44 146-70 254-78" stroke="${line}" stroke-width="3" opacity="0.12" stroke-linecap="round" />
    <path d="M718 92c86 10 156 34 222 86" stroke="${line}" stroke-width="3" opacity="0.12" stroke-linecap="round" />
  </g>
  <rect x="96" y="96" width="868" height="1128" rx="38" stroke="${line}" stroke-width="2" opacity="0.12" />
  <text x="124" y="126" fill="${line}" font-size="18" font-family="Arial, sans-serif" letter-spacing="5" opacity="0.58">STORE 2 ATELIER</text>
  <text x="124" y="1170" fill="${line}" font-size="18" font-family="Arial, sans-serif" letter-spacing="4" opacity="0.62">${smallLabel}</text>
  <text x="124" y="1210" fill="${line}" font-size="34" font-weight="700" font-family="Arial, sans-serif">${title}</text>
</svg>`;
}

function buildCategorySvg(slug) {
  const title = categoryLabels[slug] || titleCase(slug);
  const palette = pickPalette(slug);
  const { cloth, shade, line, accent, paper } = palette;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${paper}" />
      <stop offset="100%" stop-color="#f0ebe4" />
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${cloth}" />
      <stop offset="100%" stop-color="${shade}" />
    </linearGradient>
  </defs>
  <rect width="1600" height="900" rx="42" fill="url(#bg)" />
  <circle cx="1268" cy="186" r="160" fill="#ffffff" opacity="0.54" />
  <circle cx="240" cy="730" r="150" fill="${accent}" opacity="0.08" />
  <rect x="78" y="78" width="1444" height="744" rx="36" stroke="${line}" stroke-width="2" opacity="0.12" />
  <rect x="132" y="214" width="462" height="450" rx="44" fill="url(#card)" stroke="${line}" stroke-width="4" opacity="0.96" />
  <path d="M210 310c102-76 226-104 354-84" stroke="${line}" stroke-width="5" opacity="0.22" stroke-linecap="round" />
  <path d="M218 430h290" stroke="${line}" stroke-width="5" opacity="0.14" stroke-linecap="round" />
  <path d="M218 492h252" stroke="${line}" stroke-width="5" opacity="0.14" stroke-linecap="round" />
  <path d="M218 554h214" stroke="${line}" stroke-width="5" opacity="0.14" stroke-linecap="round" />
  <text x="132" y="170" fill="${line}" font-size="28" font-family="Arial, sans-serif" letter-spacing="7" opacity="0.64">STORE 2 CATEGORY</text>
  <text x="772" y="400" fill="${line}" font-size="84" font-weight="700" font-family="Arial, sans-serif">${title.toUpperCase()}</text>
  <text x="772" y="486" fill="${line}" font-size="30" font-family="Arial, sans-serif" opacity="0.72">Visual de prenda mas amplio para cards</text>
  <text x="772" y="560" fill="${line}" font-size="24" font-family="Arial, sans-serif" opacity="0.52">Catalogo seed reestructurado</text>
</svg>`;
}

function regenerateCatalog() {
  const filenames = fs.readdirSync(catalogDir).filter((name) => name.endsWith(".svg"));

  for (const filename of filenames) {
    const filePath = path.join(catalogDir, filename);
    fs.writeFileSync(filePath, buildProductSvg(getProductMeta(filename)), "utf8");
  }
}

function regenerateCategories() {
  const filenames = fs.readdirSync(categoryDir).filter((name) => name.endsWith(".svg"));

  for (const filename of filenames) {
    const slug = path.basename(filename, ".svg");
    const filePath = path.join(categoryDir, filename);
    fs.writeFileSync(filePath, buildCategorySvg(slug), "utf8");
  }
}

regenerateCatalog();
regenerateCategories();
console.log("Store2 seed images regenerated with sketch-style apparel assets.");
