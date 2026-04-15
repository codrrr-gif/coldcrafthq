"use client";

import { useEffect } from "react";

export default function BookingEmbed() {
  useEffect(() => {
    const SCRIPT_SRC = "https://assets.calendly.com/assets/external/widget.js";
    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <>
      <link
        href="https://assets.calendly.com/assets/external/widget.css"
        rel="stylesheet"
      />
      <div
        className="calendly-inline-widget"
        data-url="https://calendly.com/matt-coldcrafthq/30min?hide_gdpr_banner=1&background_color=111113&text_color=edeef0&primary_color=6e56cf"
        style={{ minWidth: "320px", width: "100%", height: "700px" }}
      />
    </>
  );
}
