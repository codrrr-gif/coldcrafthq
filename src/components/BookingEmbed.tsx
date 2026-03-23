"use client";

import { useEffect } from "react";

export default function BookingEmbed() {
  useEffect(() => {
    const SCRIPT_SRC = "https://api.leadgenjay.com/js/form_embed.js";
    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.type = "text/javascript";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div style={{ width: "100%", minHeight: "700px" }}>
      <iframe
        src="https://api.leadgenjay.com/widget/booking/5mnQgj667XTQYB46StI1"
        style={{
          width: "100%",
          minHeight: "700px",
          border: "none",
          overflow: "hidden",
          display: "block",
        }}
        scrolling="no"
        id="5mnQgj667XTQYB46StI1_1774284812641"
      />
    </div>
  );
}
