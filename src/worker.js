export default {
    async fetch(request, env) {
      // Serve static assets
      const res = await env.ASSETS.fetch(request);
  
      // Optional SPA-ish fallback to index.html on 404 GETs
      if (res.status === 404 && request.method === "GET") {
        const url = new URL(request.url);
        if (url.pathname !== "/favicon.ico") {
          const idx = await env.ASSETS.fetch(new Request(new URL("/", url), request));
          return withHeaders(idx);
        }
      }
      return withHeaders(res);
    },
  
    async email(message, env) {
      try {
        const subject = message.headers.get("subject") || "(no subject)";
        const from = message.from || "(unknown)";
        const to = message.to || "(unknown)";
        const ts = new Date().toISOString();
  
        const payload = {
          embeds: [{
            title: subject,
            description:
              `**From**: \`${from}\`\n` +
              `**To**: \`${to}\`\n` +
              `**Subject**: \`${escapeTicks(subject)}\`\n\n` +
              `**Content**: \`Unavailable due to Cloudflare limitations.\``,
            color: 0x00ff00,
            timestamp: ts,
            footer: { text: `Email from ${from}` }
          }]
        };
  
        if (env.DISCORD_WEBHOOK_URL) {
          const r = await fetch(env.DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (!r.ok) console.warn("Discord webhook failed:", r.status, await r.text());
        } else {
          console.warn("Missing DISCORD_WEBHOOK_URL secret");
        }
  
        await message.forward("ben@churton.uk"); // change if you want
      } catch (err) {
        console.error("Email handler error:", err);
        try { await message.forward("ben@churton.uk"); } catch {}
      }
    }
  };
  
  function withHeaders(res) {
    const h = new Headers(res.headers);
    h.set("Cache-Control", "public, max-age=3600");
    h.set("X-Content-Type-Options", "nosniff");
    h.set("Referrer-Policy", "no-referrer");
    h.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    h.set("Content-Security-Policy",
      "default-src 'self'; connect-src 'self'; img-src 'self' data:; " +
      "style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self'; frame-ancestors 'none'"
    );
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  }
  const escapeTicks = s => String(s).replace(/`/g, "ˋ");
  