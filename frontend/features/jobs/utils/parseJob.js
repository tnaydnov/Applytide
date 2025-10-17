/**
 * Extracts a clean description, requirements and skills from a raw job object.
 * Also returns a light structure for UI rendering: blocks = [{type:'header'|'text'|'bullet', text}]
 */
export function parseJobForDisplay(job) {
  const rawDesc = (job?.description || "").replace(/\r/g, "");
  const existingReqs = Array.isArray(job?.requirements) ? [...job.requirements] : [];
  const existingSkills = Array.isArray(job?.skills) ? [...job.skills] : [];

  const reqHeaders = [
    // Core Requirements
    "requirements",
    "required",
    "minimum requirements",
    "minimum qualifications",
    "required qualifications",
    "basic qualifications",
    "essential requirements",
    "must have",
    "must-have",
    "must haves",
    "must-haves",
    "mandatory requirements",
    "required skills and experience",
    
    // Nice to Have
    "nice to have",
    "nice-to-have",
    "nice to haves",
    "nice-to-haves",
    "preferred",
    "preferred qualifications",
    "preferred requirements",
    "preferred skills",
    "bonus points",
    "bonus",
    "plus",
    "a plus",
    "extras",
    "ideal qualifications",
    
    // Qualifications
    "qualifications",
    "your qualifications",
    "candidate qualifications",
    "key qualifications",
    
    // About You
    "about you",
    "who you are",
    "who are you",
    "the ideal candidate",
    "ideal candidate",
    "you are",
    "you're",
    "you have",
    "you've got",
    "you should have",
    "you must have",
    "you will have",
    "you'll have",
    "you possess",
    "you bring",
    "what you bring",
    "what you bring to the table",
    
    // What You Need
    "what you'll need",
    "what you will need",
    "what you need",
    "what we need",
    "what we're looking for",
    "what we are looking for",
    "what we require",
    "we're looking for",
    "we are looking for",
    "we need",
    "looking for",
    
    // Experience/Background
    "experience",
    "required experience",
    "minimum experience",
    "preferred experience",
    "background",
    "your background",
    "education",
    "education and experience",
    "credentials",
    "your credentials",
    
    // Experience Level
    "seniority level",
    "level",
    "experience level",
    "career level",
    "position level",
    "junior level",
    "senior level",
    "mid level",
    "entry level",
  ];

  const skillHeaders = [
    // Core Skills
    "skills",
    "required skills",
    "key skills",
    "core skills",
    "essential skills",
    "necessary skills",
    "primary skills",
    
    // Preferred/Nice-to-Have Skills
    "preferred skills",
    "nice to have skills",
    "nice-to-have skills",
    "bonus skills",
    "additional skills",
    "desired skills",
    "ideal skills",
    
    // Technical Skills
    "technical skills",
    "technical requirements",
    "technical qualifications",
    "technical expertise",
    "technical proficiency",
    "technical knowledge",
    "technical background",
    "technical competencies",
    "technical capabilities",
    
    // Tech Stack
    "tech stack",
    "technology stack",
    "stack",
    "our stack",
    "our tech stack",
    "the stack",
    "technologies",
    "technologies we use",
    "our technologies",
    "technology",
    "tools",
    "tools we use",
    "our tools",
    "tools and technologies",
    "platforms",
    "systems",
    
    // Programming/Development
    "programming languages",
    "languages",
    "coding skills",
    "development skills",
    "software skills",
    
    // Competencies
    "competencies",
    "core competencies",
    "key competencies",
    "capabilities",
    "expertise",
    "proficiencies",
    "technical proficiencies",
    "abilities",
    "skill set",
    "skillset",
    "your skills",
  ];

  // Titles we want to emphasize in the description
  const displayHeaders = [
    // Company/Job Overview
    "about the job",
    "about the role",
    "about this role",
    "about this position",
    "the role",
    "the position",
    "the opportunity",
    "the job",
    "job description",
    "job overview",
    "role overview",
    "role description",
    "position description",
    "position overview",
    "role summary",
    "job summary",
    "position summary",
    "summary",
    "overview",
    
    // Company Information
    "company overview",
    "about the company",
    "about us",
    "about our company",
    "who we are",
    "our company",
    "our story",
    "our mission",
    "our vision",
    "the company",
    "company background",
    "company profile",
    "company description",
    "organization overview",
    "about the team",
    "the team",
    "our team",
    "meet the team",
    "who you'll work with",
    
    // Responsibilities
    "key responsibilities",
    "responsibilities",
    "your responsibilities",
    "main responsibilities",
    "core responsibilities",
    "day-to-day responsibilities",
    "what you'll do",
    "what you will do",
    "what you'll be doing",
    "your day-to-day",
    "daily responsibilities",
    "duties",
    "key duties",
    "role responsibilities",
    "your role",
    "your mission",
    "in this role you will",
    "you will",
    "day to day",
    "a day in the life",
    
    // Requirements/Qualifications
    "qualifications",
    "required qualifications",
    "minimum qualifications",
    "preferred qualifications",
    "requirements",
    "required skills",
    "what we're looking for",
    "what we are looking for",
    "who you are",
    "ideal candidate",
    "about you",
    "you have",
    "you bring",
    "what you bring",
    "what you'll need",
    "what you will need",
    "must have",
    "nice to have",
    "preferred",
    "experience",
    "required experience",
    
    // Skills/Technical
    "skills",
    "technical skills",
    "required skills",
    "preferred skills",
    "nice to have skills",
    "tech stack",
    "technology stack",
    "our stack",
    "stack",
    "technologies",
    "tools",
    "technical requirements",
    
    // Work Environment
    "work environment",
    "working environment",
    "our environment",
    "work location",
    "location",
    "where you'll work",
    "workplace",
    "remote work",
    "hybrid work",
    
    // Work Mode & Flexibility (Modern)
    "work arrangement",
    "work arrangements",
    "working arrangement",
    "flexible work",
    "flexibility",
    "work flexibility",
    "100% remote",
    "fully remote",
    "remote-first",
    "remote first",
    "work from home",
    "wfh",
    "work from anywhere",
    "wfa",
    "remote ok",
    "remote okay",
    "remote friendly",
    "remote-friendly",
    "distributed team",
    "distributed",
    "global team",
    "anywhere",
    "location independent",
    "hybrid",
    "hybrid work",
    "hybrid model",
    "flexible location",
    "flexible schedule",
    "flexible hours",
    "on-site",
    "onsite",
    "in-office",
    "office-based",
    
    // Soft Skills & Cultural Fit (Modern)
    "soft skills",
    "interpersonal skills",
    "communication",
    "communication skills",
    "leadership",
    "leadership skills",
    "collaboration",
    "collaborative",
    "team player",
    "teamwork",
    "problem solving",
    "problem-solving",
    "critical thinking",
    "analytical thinking",
    "adaptability",
    "ownership",
    "take ownership",
    "growth mindset",
    "learning mindset",
    "customer-focused",
    "customer focus",
    "user-focused",
    "attention to detail",
    "self-motivated",
    "proactive",
    "initiative",
    "time management",
    "organization",
    "organizational skills",
    "multitasking",
    "prioritization",
    
    // Team & Culture Signals (Modern)
    "startup environment",
    "startup",
    "fast-paced",
    "fast paced",
    "dynamic environment",
    "agile",
    "agile environment",
    "scrum",
    "cross-functional",
    "cross functional",
    "mentorship",
    "mentor",
    "pair programming",
    "code review",
    "code reviews",
    "collaborative environment",
    "inclusive",
    "inclusive culture",
    "diverse team",
    "diversity",
    "work-life balance",
    "work life balance",
    
    // Compensation & Equity (Modern)
    "compensation",
    "compensation package",
    "total compensation",
    "salary",
    "salary range",
    "compensation range",
    "pay",
    "pay range",
    "base salary",
    "equity",
    "stock options",
    "stock",
    "rsu",
    "rsus",
    "restricted stock units",
    "bonus",
    "annual bonus",
    "performance bonus",
    "signing bonus",
    "competitive salary",
    "competitive compensation",
    "competitive pay",
    
    // Job Type (Modern)
    "employment type",
    "job type",
    "position type",
    "full-time",
    "full time",
    "part-time",
    "part time",
    "contract",
    "contractor",
    "freelance",
    "temporary",
    "internship",
    "intern",
    "co-op",
    "apprenticeship",
    "permanent",
    "seasonal",
    
    // Culture/Benefits/Perks
    "culture",
    "our culture",
    "company culture",
    "team culture",
    "work culture",
    "values",
    "our values",
    "core values",
    "benefits",
    "our benefits",
    "what we offer",
    "we offer",
    "perks",
    "perks and benefits",
    "compensation",
    "compensation and benefits",
    "salary",
    "salary and benefits",
    "total compensation",
    "rewards",
    
    // Why Join
    "why join us",
    "why join us?",
    "why work here",
    "why work here?",
    "why work with us",
    "why work with us?",
    "why us",
    "why us?",
    "why join",
    "why join?",
    "why [company name]",
    "join us",
    "what makes us different",
    "what sets us apart",
    "why you'll love it here",
    "why you should join",
    "what's in it for you",
    "what's in it for you?",
    
    // Mission/Vision/Impact
    "mission",
    "our mission",
    "vision",
    "our vision",
    "impact",
    "our impact",
    "your impact",
    "making an impact",
    
    // Process/Next Steps
    "interview process",
    "hiring process",
    "application process",
    "next steps",
    "how to apply",
    "apply now",
    
    // Diversity/Equal Opportunity
    "diversity",
    "diversity and inclusion",
    "equal opportunity",
    "eeo statement",
    "commitment to diversity",
  ];

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const reqHeaderRe = new RegExp(`^\\s*(?:${reqHeaders.map(esc).join("|")})\\s*:?\\s*$`, "i");
  const skillHeaderRe = new RegExp(`^\\s*(?:${skillHeaders.map(esc).join("|")})\\s*:?\\s*$`, "i");
  const skillInlineRe = new RegExp(`^\\s*(?:${skillHeaders.map(esc).join("|")})\\s*:\\s*(.+)$`, "i");
  const displayHeaderRe = new RegExp(`^\\s*(?:${displayHeaders.map(esc).join("|")})\\s*:?\\s*$`, "i");

  const isBullet = (s) => /^\s*(?:[-–—•·*]|\d+\.)\s+/.test(s);
  const normalizeBullet = (s) => s.replace(/^\s*(?:[-–—•·*]|\d+\.)\s+/, "").trim();

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
      // keep the header line in description for styling if it's not literally "Requirements"
      // (We will still remove the *items* below from description.)
      if (!/^requirements$/i.test(line.trim())) {
        descOut.push(line.trim());
      }
      continue;
    }
    if (skillHeaderRe.test(line)) {
      inSkillsBlock = true;
      inReqBlock = false;
      descOut.push(line.trim()); // keep skill header as a visual section if present
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
        descOut.push(line.trim());
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

  // Build simple blocks for rendering with styled headers
  const blocks = [];
  cleanDescription.split("\n").forEach((ln) => {
    const t = ln.trim();
    if (!t) return;
    if (displayHeaderRe.test(t) || (/^[A-Z][A-Za-z0-9 '&/+-]{2,80}:?$/.test(t) && t.split(" ").length <= 8)) {
      blocks.push({ type: "header", text: t.replace(/:$/, "") });
    } else if (/^\s*•\s+/.test(ln)) {
      blocks.push({ type: "bullet", text: ln.replace(/^\s*•\s+/, "") });
    } else {
      blocks.push({ type: "text", text: ln });
    }
  });

  return {
    cleanDescription,
    requirements: Array.from(reqMap.values()),
    skills: Array.from(skillMap.values()),
    blocks,
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
