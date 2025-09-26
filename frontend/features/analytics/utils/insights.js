// Tiny rules engine to produce “coach-like” but non-AI insights.
export function buildInsights(analytics) {
  if (!analytics) return [];

  const A = [];
  const o = analytics.overview || {};
  const s = analytics.sources || {};
  const t = analytics.bestTime || {};
  const e = analytics.experiments || {};
  const c = analytics.companies || {};
  const tl = analytics.timeline || {};

  // 1) Volume & conversion quick hits
  if (o.totalApplications > 0) {
    A.push({
      id: "volume",
      severity: "low",
      tag: "Activity",
      headline: `${o.totalApplications} total applications in range`,
      body: o.interviewRate ? `Interview rate ${o.interviewRate}% · Offer rate ${o.offerRate || 0}%` : undefined,
    });
  }

  // 2) Source outperformance
  if (Array.isArray(s.offerRateBySource) && s.offerRateBySource.length >= 2) {
    const top = s.offerRateBySource[0];
    const mid = s.offerRateBySource[1];
    if (top?.value > 0) {
      A.push({
        id: "source_offer",
        severity: "high",
        tag: "Source",
        headline: `${top.label} shows the best offer rate`,
        body: `Offer rate ${top.value}% vs ${mid?.label ?? "others"} ${mid?.value ?? 0}%`,
      });
    }
  }

  // 3) Best time hint
  if (Array.isArray(t.byWeekday) && t.byWeekday[0]?.label) {
    A.push({
      id: "timing",
      severity: "med",
      tag: "Timing",
      headline: t.bestWindowText || `Most active day: ${t.byWeekday[0].label}`,
    });
  }

  // 4) CL impact
  if (e?.coverLetterImpact) {
    const w = e.coverLetterImpact.withCL?.rate ?? 0;
    const wo = e.coverLetterImpact.withoutCL?.rate ?? 0;
    if (w > 0 || wo > 0) {
      A.push({
        id: "cl",
        severity: w >= wo ? "high" : "low",
        tag: "Experiment",
        headline: `Cover letters: ${w - wo >= 0 ? "help" : "neutral"} (${Math.round(w - wo)}% diff)`,
      });
    }
  }

  // 5) Bottleneck nudge
  if (Array.isArray(tl.bottlenecks) && tl.bottlenecks.length) {
    const b = tl.bottlenecks[0];
    A.push({
      id: "bottleneck",
      severity: "med",
      tag: "Bottleneck",
      headline: `${b.stage} is slowing down (${b.avgDays ?? b.avg_duration_days}d avg)`,
      body: "Consider nudging recruiters or adjusting your follow-up cadence.",
    });
  }

  // 6) Company target idea
  if (Array.isArray(c.topCompanies) && c.topCompanies.length) {
    const best = [...c.topCompanies].sort((a, b) => (b.offer_rate ?? 0) - (a.offer_rate ?? 0))[0];
    if (best?.name) {
      A.push({
        id: "company",
        severity: "low",
        tag: "Targeting",
        headline: `Highest conversion so far: ${best.name}`,
        body: `Offer rate ${best.offer_rate ?? 0}%`,
      });
    }
  }

  return A;
}
