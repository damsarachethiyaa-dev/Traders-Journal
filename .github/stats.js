// Draws media/readme-stats.svg: total downloads (past downloads from before this repo, plus every .exe/.apk
// downloaded from this repo's releases), a fixed highlight card, and the latest release. Run by the
// "Download stats" workflow every few hours and on each new release.
const fs = require("fs");
const path = require("path");

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "stats.json"), "utf8"));
const repo = process.env.REPO || cfg.repo;
const headers = { "User-Agent": "readme-stats", Accept: "application/vnd.github+json" };
if (process.env.GH_TOKEN) headers.Authorization = "Bearer " + process.env.GH_TOKEN;

async function api(url) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(url + " -> " + r.status);
  return r.json();
}

function short(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
  return String(n);
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

(async () => {
  let page = 1, live = 0, releases = [];
  for (;;) {
    const list = await api(`https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`);
    releases = releases.concat(list);
    if (list.length < 100) break;
    page++;
  }
  for (const r of releases)
    for (const a of r.assets)
      if (/\.(exe|apk)$/i.test(a.name)) live += a.download_count;
  const total = (cfg.pastDownloads || 0) + live;
  const latest = releases.filter((r) => !r.draft && !r.prerelease)
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))[0];

  const cards = [
    { value: short(total), label: "TOTAL DOWNLOADS", color: "#ff6d00" },
    { value: cfg.highlight.value, label: cfg.highlight.label, color: cfg.highlight.color || "#00e676" },
    { value: latest ? latest.tag_name : "—", label: "LATEST RELEASE", color: "#7c4dff" },
  ];
  const parts = cards.map((c, i) => `    <g transform="translate(${i * 204} 0)">
      <g clip-path="url(#c)"><rect width="198" height="48" rx="4" fill="#161b22"/><rect width="198" height="2" fill="${c.color}"/></g>
      <rect x="0.5" y="0.5" width="197" height="47" rx="4" fill="none" stroke="#30363d"/>
      <text x="99" y="23" text-anchor="middle" font-size="17" font-weight="700" fill="#f0f6fc">${esc(c.value)}</text>
      <text x="99" y="37" text-anchor="middle" font-size="8" font-weight="600" letter-spacing="1.4" fill="#8b949e">${esc(c.label)}</text>
    </g>`).join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="606" height="48" viewBox="0 0 606 48" role="img" aria-label="${esc(
    cards.map((c) => c.value + " " + c.label.toLowerCase()).join(", "))}">
  <defs><clipPath id="c"><rect width="198" height="48" rx="4"/></clipPath></defs>
  <g font-family="Segoe UI, Inter, Helvetica, Arial, sans-serif">
${parts}
  </g>
</svg>
`;
  const out = path.join(__dirname, "..", "media", "readme-stats.svg");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, svg);
  console.log(`${repo}: ${total} downloads (${cfg.pastDownloads} before + ${live} here), latest ${latest && latest.tag_name}`);
})().catch((e) => { console.error(e); process.exit(1); });
