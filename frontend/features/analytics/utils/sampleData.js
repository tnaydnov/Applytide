// Generates a safe, generic sample dataset for empty accounts.
export function generateDemoAnalytics() {
  const today = new Date();
  const daysBack = 84;
  const dayList = Array.from({ length: daysBack }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (daysBack - 1 - i));
    const date = d.toISOString().slice(0,10);
    return { date, count: Math.random() < 0.35 ? 0 : Math.floor(Math.random()*3) };
  });

  const weekdayLabels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const byWeekday = weekdayLabels.map((l,i) => ({ label: l, value: [12,16,18,19,15,7,6][i] }));

  const byHour = Array.from({length:24}, (_,h)=>({ label: `${h}:00`, value: Math.floor((Math.sin(h/3)+1)*8 + Math.random()*2) }));

  return {
    overview: {
      totalApplications: 42,
      applicationsChange: 12,
      interviewRate: 18,
      interviewRateChange: 6,
      offerRate: 5,
      offerRateChange: 2,
      avgResponseTime: 5,
      responseTimeChange: -9,
      statusDistribution: [
        { label: "Applied", value: 18 },
        { label: "Under Review", value: 12 },
        { label: "Interviewing", value: 8 },
        { label: "Rejected", value: 3 },
        { label: "Offer", value: 1 },
      ],
      applicationsOverTime: Array.from({ length: 12 }, (_, i) => ({
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - (11 - i) * 7).toISOString().slice(0,10),
        count: Math.floor(Math.random() * 8),
      })),
      funnel: [
        { name: "Applied", count: 42 },
        { name: "Phone Screen", count: 14 },
        { name: "Technical", count: 9 },
        { name: "On-site", count: 4 },
        { name: "Offer", count: 2 },
      ],
    },
    applications: {
      statusBreakdown: [
        { status: "Applied", count: 18, percentage: 43 },
        { status: "Under Review", count: 12, percentage: 29 },
        { status: "Interviewing", count: 8, percentage: 19 },
        { status: "Rejected", count: 3, percentage: 7 },
        { status: "Offer", count: 1, percentage: 2 },
      ],
      monthlyData: Array.from({ length: 6 }, (_, i) => ({
        month: `2025-0${i+1}`,
        count: 5 + Math.floor(Math.random()*6),
      })),
      jobTitles: [
        { title: "Product Manager", count: 7 },
        { title: "Software Engineer", count: 6 },
        { title: "Data Analyst", count: 5 },
        { title: "Marketing Manager", count: 4 },
        { title: "Sales Rep", count: 3 },
      ],
      totalApplications: 42,
      successRate: 12,
      avgResponseTime: 5,
    },
    interviews: {
      typeBreakdown: [
        { label: "Phone Screen", value: 8 },
        { label: "Technical", value: 6 },
        { label: "Behavioral", value: 3 },
        { label: "On-site", value: 2 },
      ],
      successByType: [
        { label: "Phone Screen", value: 35 },
        { label: "Technical", value: 22 },
        { label: "Behavioral", value: 40 },
        { label: "On-site", value: 50 },
      ],
      totalInterviews: 19,
      successRate: 28,
      avgInterviewsPerApp: 0.5,
      conversionRate: 11,
      performanceOverTime: Array.from({ length: 10 }, (_, i) => ({
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - (9 - i) * 7).toISOString().slice(0,10),
        value: 20 + Math.floor(Math.random() * 30),
      })),
    },
    companies: {
      topCompanies: [
        { name: "Acme", applications: 6, interviews: 3, offers: 1, interview_rate: 50, offer_rate: 16 },
        { name: "Globex", applications: 5, interviews: 2, offers: 0, interview_rate: 40, offer_rate: 0 },
      ],
      sizeDistribution: [
        { label: "Startup (1-50)", value: 8 },
        { label: "Medium (51-500)", value: 6 },
        { label: "Large (500+)", value: 4 },
      ],
      successBySize: [
        { label: "Startup", value: 14 },
        { label: "Medium", value: 10 },
        { label: "Large", value: 6 },
      ],
      totalCompanies: 12,
      avgSuccessRate: 12,
      responseRate: 36,
    },
    timeline: {
      stageDurations: [
        { label: "Applied → Phone", value: 5.2 },
        { label: "Phone → Tech", value: 6.4 },
        { label: "Tech → On-site", value: 9.1 },
      ],
      timelineTrends: Array.from({ length: 10 }, (_, i) => ({
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - (9 - i) * 7).toISOString().slice(0,10),
        value: 4 + Math.floor(Math.random() * 7),
      })),
      bottlenecks: [{ stage: "Under Review", avgDays: 16, description: "Long response wait" }],
      avgProcessDuration: 28,
      avgResponseTime: 5,
      avgInterviewTime: 12,
      avgDecisionTime: 10,
    },
    activity: {
      activityByDay: dayList,
      streak: { current: 3, best: 9 },
    },
    sources: {
      breakdown: [
        { label: "Company Site", value: 16 },
        { label: "LinkedIn", value: 12 },
        { label: "Referral", value: 7 },
        { label: "Other", value: 7 },
      ],
      interviewRateBySource: [
        { label: "Referral", value: 31 },
        { label: "Company Site", value: 22 },
        { label: "LinkedIn", value: 16 },
        { label: "Other", value: 12 },
      ],
      offerRateBySource: [
        { label: "Referral", value: 9 },
        { label: "Company Site", value: 6 },
        { label: "LinkedIn", value: 4 },
      ],
      topSources: [
        { label: "Company Site", applications: 16, interviewRate: 22, offerRate: 6 },
        { label: "LinkedIn", applications: 12, interviewRate: 16, offerRate: 4 },
        { label: "Referral", applications: 7, interviewRate: 31, offerRate: 9 },
      ],
    },
    experiments: {
      resumeVersions: [
        { label: "Resume v1", interviewRate: 18, count: 14 },
        { label: "Resume v2", interviewRate: 26, count: 11 },
      ],
      coverLetterImpact: {
        withCL: { rate: 22, count: 17 },
        withoutCL: { rate: 14, count: 25 },
      },
    },
    bestTime: { byWeekday, byHour, bestWindowText: "Tuesdays 9–11am look strongest" },
    expectations: { medians: { response: 5, interview: 12, decision: 22 }, p75: { response: 10, interview: 20, decision: 35 } }
  };
}
