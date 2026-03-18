const toDataUri = (svg: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

export const urbanSkyline = toDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="none">
    <rect width="1600" height="900" fill="#111111"/>
    <g opacity="0.18" stroke="#f3eee7" stroke-width="2">
      <path d="M0 120h1600"/>
      <path d="M0 260h1600"/>
      <path d="M0 400h1600"/>
      <path d="M0 540h1600"/>
      <path d="M0 680h1600"/>
      <path d="M180 0v900"/>
      <path d="M420 0v900"/>
      <path d="M660 0v900"/>
      <path d="M900 0v900"/>
      <path d="M1140 0v900"/>
      <path d="M1380 0v900"/>
    </g>
    <g fill="#e7dfd4" opacity="0.12">
      <rect x="86" y="398" width="138" height="502"/>
      <rect x="258" y="296" width="102" height="604"/>
      <rect x="382" y="344" width="188" height="556"/>
      <rect x="612" y="236" width="144" height="664"/>
      <rect x="780" y="420" width="120" height="480"/>
      <rect x="932" y="182" width="226" height="718"/>
      <rect x="1198" y="300" width="110" height="600"/>
      <rect x="1334" y="242" width="180" height="658"/>
    </g>
    <circle cx="1220" cy="168" r="116" fill="#f3eee7" opacity="0.08"/>
  </svg>
`);

export const concreteTexture = toDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" preserveAspectRatio="none">
    <rect width="800" height="800" fill="#1b1b1b"/>
    <g opacity="0.12" fill="#f3eee7">
      <circle cx="88" cy="126" r="2"/>
      <circle cx="210" cy="302" r="2"/>
      <circle cx="420" cy="218" r="2"/>
      <circle cx="600" cy="140" r="2"/>
      <circle cx="706" cy="382" r="2"/>
      <circle cx="530" cy="520" r="2"/>
      <circle cx="118" cy="610" r="2"/>
      <circle cx="260" cy="700" r="2"/>
      <circle cx="684" cy="694" r="2"/>
    </g>
    <g opacity="0.07" stroke="#ffffff" stroke-width="1">
      <path d="M20 180c120 18 220-24 322-8s216 64 438 12"/>
      <path d="M10 420c166 30 320-22 470-8s202 42 300 24"/>
      <path d="M42 628c140-10 234-54 382-40s250 54 340 34"/>
    </g>
  </svg>
`);

export const editorialLines = toDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="none">
    <rect width="1200" height="800" fill="none"/>
    <g opacity="0.18" stroke="#f3eee7" stroke-width="1.4">
      <path d="M0 130h1200"/>
      <path d="M0 270h1200"/>
      <path d="M0 410h1200"/>
      <path d="M0 550h1200"/>
      <path d="M140 0v800"/>
      <path d="M370 0v800"/>
      <path d="M600 0v800"/>
      <path d="M830 0v800"/>
      <path d="M1060 0v800"/>
    </g>
  </svg>
`);

export const urbanCrowdScene = toDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="none">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#121212"/>
        <stop offset="55%" stop-color="#2a2a2a"/>
        <stop offset="100%" stop-color="#8d8172"/>
      </linearGradient>
      <linearGradient id="coat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f3eee7"/>
        <stop offset="100%" stop-color="#cbc1b4"/>
      </linearGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#bg)"/>
    <g opacity="0.12" stroke="#f3eee7" stroke-width="2">
      <path d="M0 120h1600"/>
      <path d="M0 280h1600"/>
      <path d="M0 440h1600"/>
      <path d="M0 600h1600"/>
      <path d="M0 760h1600"/>
      <path d="M180 0v900"/>
      <path d="M440 0v900"/>
      <path d="M700 0v900"/>
      <path d="M960 0v900"/>
      <path d="M1220 0v900"/>
      <path d="M1480 0v900"/>
    </g>
    <g opacity="0.18" fill="#f3eee7">
      <circle cx="1240" cy="140" r="96"/>
      <circle cx="1340" cy="210" r="22"/>
      <circle cx="1120" cy="220" r="16"/>
    </g>
    <g transform="translate(170 120)">
      <g opacity="0.92">
        <circle cx="180" cy="142" r="54" fill="#1a1a1a"/>
        <path d="M104 240c18-62 52-96 76-96h8c24 0 58 34 76 96l22 254H80l24-254z" fill="#222222"/>
        <path d="M114 258c34 18 98 18 132 0v248H114V258z" fill="url(#coat)"/>
        <path d="M146 508l-24 182h46l24-146h10l24 146h46l-24-182z" fill="#0f0f0f"/>
        <path d="M108 284l-56 116 34 18 54-94z" fill="#1b1b1b"/>
        <path d="M250 284l56 116-34 18-54-94z" fill="#1b1b1b"/>
      </g>
      <g transform="translate(286 30)" opacity="0.85">
        <circle cx="180" cy="142" r="54" fill="#d8d1c8"/>
        <path d="M102 242c24-74 58-102 78-102h8c20 0 52 28 78 102l24 260H78l24-260z" fill="#efe7dc"/>
        <path d="M112 290c42-20 132-20 154 0l-8 214H120z" fill="#b0a393"/>
        <path d="M142 504l-28 186h46l34-150h12l32 150h48l-28-186z" fill="#2b2b2b"/>
      </g>
      <g transform="translate(610 72)" opacity="0.78">
        <circle cx="180" cy="142" r="50" fill="#181818"/>
        <path d="M120 232c20-56 42-90 60-90h8c18 0 38 34 58 90l26 274H96l24-274z" fill="#131313"/>
        <path d="M118 250c20 32 102 32 122 0l8 176H110z" fill="#5b554e"/>
        <path d="M136 506l-18 184h42l24-146h10l24 146h42l-18-184z" fill="#101010"/>
      </g>
    </g>
  </svg>
`);
