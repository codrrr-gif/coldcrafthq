"use client";

import Script from "next/script";

export default function BookingEmbed() {
  return (
    <>
      <iframe
        src="https://api.leadgenjay.com/widget/booking/5mnQgj667XTQYB46StI1"
        style={{ width: "100%", border: "none", overflow: "hidden" }}
        scrolling="no"
        id="5mnQgj667XTQYB46StI1_1774197386913"
      />
      <Script
        src="https://api.leadgenjay.com/js/form_embed.js"
        strategy="afterInteractive"
      />
    </>
  );
}
