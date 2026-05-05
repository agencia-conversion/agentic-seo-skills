// Cluster remediations from multiple raters by checklist IDs and token overlap.
// Used by consensus to dedupe naturally-phrased remediation actions.

const CHECKLIST_ID_RE = /\b(ex|eq|au|tr)\d+\b/g;

export function clusterRemediation(rawRaters) {
  const all = [];
  for (let i = 0; i < rawRaters.length; i += 1) {
    for (const r of rawRaters[i].remediation ?? []) {
      all.push({
        priority: r.priority,
        what: r.what,
        why: r.why,
        rater: i + 1,
        ids: extractChecklistIds(`${r.what} ${r.why}`),
        tokens: tokenize(r.what),
      });
    }
  }
  const parent = all.map((_, i) => i);
  const find = (i) => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const union = (a, b) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent[rb] = ra; };
  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      if (all[i].priority !== all[j].priority) continue;
      if (sharesChecklistId(all[i].ids, all[j].ids) || jaccard(all[i].tokens, all[j].tokens) >= 0.5) union(i, j);
    }
  }
  const clusters = new Map();
  for (let i = 0; i < all.length; i += 1) {
    const root = find(i);
    const cluster = clusters.get(root) ?? { items: [], raters: new Set(), ids: new Set() };
    cluster.items.push(all[i]);
    cluster.raters.add(all[i].rater);
    for (const id of all[i].ids) cluster.ids.add(id);
    clusters.set(root, cluster);
  }
  const order = { high: 0, medium: 1, low: 2 };
  const out = [];
  for (const c of clusters.values()) {
    const longest = [...c.items].sort((a, b) => b.what.length - a.what.length)[0];
    const allWhys = [...new Set(c.items.map((i) => i.why))];
    out.push({
      priority: longest.priority,
      what: longest.what,
      why: allWhys.length === 1 ? allWhys[0] : allWhys.join(" — "),
      checklist_ids: [...c.ids].sort(),
      agreement_count: c.raters.size,
      variants: c.items.length > 1 ? c.items.map((i) => ({ rater: i.rater, what: i.what })) : undefined,
    });
  }
  return out.sort((a, b) => order[a.priority] - order[b.priority] || b.agreement_count - a.agreement_count);
}

function tokenize(text) {
  return new Set(
    String(text).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/[^\w\s]/g, " ").split(/\s+/)
      .filter((w) => w.length >= 4),
  );
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const v of a) if (b.has(v)) inter += 1;
  return inter / (a.size + b.size - inter);
}

function extractChecklistIds(text) {
  const matches = String(text).toLowerCase().matchAll(CHECKLIST_ID_RE);
  return new Set([...matches].map((m) => m[0]));
}

function sharesChecklistId(a, b) {
  for (const id of a) if (b.has(id)) return true;
  return false;
}
