/**
 * Extracts a clean description, requirements and skills from a raw job object.
 * This is display-only (does not mutate the DB shape).
 */
export function parseJobForDisplay(job) {
  const rawDesc = (job?.description || "").replace(/\r/g, "");
  const existingReqs = Array.isArray(job?.requirements) ? [...job.requirements] : [];
  const existingSkills = Array.isArray(job?.skills) ? [...job.skills] : [];

  const reqHeaders = [
    "requirements",
    "minimum requirements",
    "must have",
    "nice to have",
    "qualifications",
    "about you",
    "what you'll need",
    "what you bring",
  ];

  const skillHeaders = [
    "skills",
    "required skills",
    "preferred skills",
    "nice to have skills",
    "technical skills",
    "tech stack",
    "technology stack",
    "our stack",
    "stack",
  ];

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const reqHeaderRe = new RegExp(`^\\s*(?:${reqHeaders.map(esc).join("|")})\\s*:?\\s*$`, "i");
  const skillHeaderRe = new RegExp(`^\\s*(?:${skillHeaders.map(esc).join("|")})\\s*:?\\s*$`, "i");
  const skillInlineRe = new RegExp(`^\\s*(?:${skillHeaders.map(esc).join("|")})\\s*:\\s*(.+)$`, "i");

  const isBullet = (s) => /^\\s*(?:[-–—•·*]|\\d+\.)\\s+/.test(s);
  const normalizeBullet = (s) => s.replace(/^\\s*(?:[-–—•·*]|\\d+\.)\\s+/, "").trim();

  const cleanToken = (s) =>
    s
      .replace(/^[•\-–—·*\s]+/, "")
      .replace(/[.,;:()\s]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const tokenizeSkillList = (s) => {
    const parts = s.split(/[ ,\|/•·]+/).map(cleanToken).filter(Boolean);
    return parts.filter((t) => t.split(/\s+/).length <= 4 && !/[.!?]$/.test(t));
  };

  const looksLikeRequirementLine = (s) => {
    const t = s.trim();
    if (!t) return false;
    if (t.length > 220) return false;
    if (/\.\s*[A-Z]/.test(t)) return false;
    return true;
  };

  const lines = rawDesc.split("\n");
  const descOut = [];
  const foundReqs = [];
  const foundSkills = [];

  let inReqBlock = false;
  let inSkillsBlock = false;
  let lastPushed = "";

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.replace(/\*\*/g, "");

    if (reqHeaderRe.test(line)) {
      inReqBlock = true;
      inSkillsBlock = false;
      continue;
    }
    if (skillHeaderRe.test(line)) {
      inSkillsBlock = true;
      inReqBlock = false;
      continue;
    }

    const mInline = line.match(skillInlineRe);
    if (mInline && mInline[1]) {
      foundSkills.push(...tokenizeSkillList(mInline[1]));
      continue;
    }

    if (inReqBlock) {
      if (isBullet(line)) {
        foundReqs.push(normalizeBullet(line));
        continue;
      }
      if (skillHeaderRe.test(line)) {
        inReqBlock = false;
        inSkillsBlock = true;
        continue;
      }
      if (line.trim() === "") {
        inReqBlock = false;
        continue;
      }
      if (looksLikeRequirementLine(line)) {
        foundReqs.push(cleanToken(line));
        continue;
      }
      inReqBlock = false;
    }

    if (inSkillsBlock) {
      if (isBullet(line)) {
        foundSkills.push(cleanToken(normalizeBullet(line)));
        continue;
      }
      if (line.trim() === "") {
        inSkillsBlock = false;
        continue;
      }
      const maybeList = tokenizeSkillList(line);
      if (maybeList.length >= 2) {
        foundSkills.push(...maybeList);
        continue;
      }
      inSkillsBlock = false;
    }

    const trimmed = raw.trimEnd();
    if (trimmed !== lastPushed) {
      descOut.push(trimmed);
      lastPushed = trimmed;
    }
  }

  const cleanDescription = descOut.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  const canon = (s) => s.replace(/\s+/g, " ").replace(/[.,;:)\]\s]+$/g, "").toLowerCase().trim();
  const pretty = (s) => s.replace(/\s+/g, " ").replace(/[.,;:)\]\s]+$/g, "").trim();

  const reqMap = new Map();
  [...existingReqs, ...foundReqs]
    .filter(Boolean)
    .forEach((s) => {
      const key = canon(String(s));
      if (!key) return;
      if (!reqMap.has(key)) reqMap.set(key, pretty(String(s)));
    });

  const skillMap = new Map();
  [...existingSkills, ...foundSkills]
    .filter(Boolean)
    .forEach((s) => {
      const key = canon(String(s));
      if (!key) return;
      if (!skillMap.has(key)) skillMap.set(key, pretty(String(s)));
    });

  return {
    cleanDescription,
    requirements: Array.from(reqMap.values()),
    skills: Array.from(skillMap.values()),
  };
}

/**
 * Fallback UI helper for missing locations — tries to read "Location: ..." from text.
 */
export function displayLocation(job) {
  const loc = (job?.location || "").trim();
  if (loc) return loc;
  const source = (job?.description || "") + "\n" + (job?.company_name || "");
  const m = source.match(/(?:^|\n)\s*Location\s*:\s*([^\n]+)\n?/i);
  return m && m[1] ? m[1].trim() : "Not specified";
}
