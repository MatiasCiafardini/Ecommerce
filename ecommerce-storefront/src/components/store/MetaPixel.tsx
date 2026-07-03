"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

type MetaPixelWindow = Window & {
  fbq?: (...args: unknown[]) => void;
};

export default function MetaPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();
  const trackedPathname = useRef<string | null>(null);

  useEffect(() => {
    if (trackedPathname.current === null) {
      trackedPathname.current = pathname;
      return;
    }

    if (trackedPathname.current === pathname) {
      return;
    }

    trackedPathname.current = pathname;
    (window as MetaPixelWindow).fbq?.("track", "PageView");
  }, [pathname]);

  return (
    <>
      <Script
        id={`meta-pixel-${pixelId}`}
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
