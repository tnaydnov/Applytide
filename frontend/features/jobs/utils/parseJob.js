/**
 * Parses job for display - trusts LLM completely for data.
 * Only formats description into blocks for UI rendering.
 * Does NOT extract requirements or skills - uses LLM data directly.
 */
export function parseJobForDisplay(job) {
  const rawDesc = (job?.description || "").replace(/\r/g, "");
  
  // Use LLM's requirements and skills directly - NO EXTRACTION
  const requirements = Array.isArray(job?.requirements) ? job.requirements : [];
  const skills = Array.isArray(job?.skills) ? job.skills : [];

  // Comprehensive list of headers to style in the description
  const displayHeaders = [
    // Company/Job Overview
    "about the job", "about the role", "about this role", "about this position",
    "the role", "the position", "the opportunity", "the job",
    "job description", "job overview", "role overview", "role description",
    "position description", "position overview", "role summary", "job summary",
    "position summary", "summary", "overview",
    
    // Company Information
    "company overview", "about the company", "about us", "about our company",
    "who we are", "our company", "our story", "our mission", "our vision",
    "the company", "company background", "company profile", "company description",
    "organization overview", "about the team", "the team", "our team",
    "meet the team", "who you'll work with", "who you’ll work with",
    "team overview", "team description", "team profile", "team background",
    
    // Responsibilities
    "key responsibilities", "responsibilities", "your responsibilities",
    "main responsibilities", "core responsibilities", "day-to-day responsibilities",
    "what you'll do", "what you will do", "what you'll be doing",
    "What You’ll Do", "what you’ll be doing", // fancy apostrophe variations
    "your day-to-day", "daily responsibilities", "duties", "key duties",
    "role responsibilities", "your role", "your mission",
    "in this role you will", "you will", "day to day", "a day in the life",
    "job responsibilities", "your chain of impact", "your impact chain", "your scope",
    "what will you do", "what will you be doing", "what are you going to do",

    
    // Requirements/Qualifications
    "qualifications", "required qualifications", "minimum qualifications",
    "preferred qualifications", "requirements", "required skills",
    "what we're looking for", "what we’re looking for", "what we are looking for",
    "who you are", "ideal candidate", "about you",
    "you have", "you bring", "what you bring", "what you bring to the table",
    "what you'll need", "what you’ll need", "what you will need", "what we need",
    "must have", "experience", "required experience",
    "your chain of strengths", "your strengths", "what makes you great",
    "what you should have", "you should have", "what we expect",
    "minimum requirements", "basic qualifications",
    "core qualifications", "key qualifications",

    
    // Nice to Have / Bonus
    "nice to have", "nice-to-have", "nice to haves", "nice-to-haves",
    "preferred", "preferred qualifications", "preferred requirements", "preferred skills",
    "bonus points", "bonus", "plus", "a plus", "extras", "ideal qualifications", "advantage", "advantages",
    "desirable skills", "additional skills", "additional qualifications",
    "would be great", "would be a plus", "would be an advantage",
    "helpful skills", "helpful qualifications",
    "extra skills", "extra qualifications",
    "not required but helpful", "not required but preferred",
    "not required but a plus", "not required but an advantage",

    // Skills/Technical
    "skills", "technical skills", "required skills", "preferred skills",
    "nice to have skills", "tech stack", "technology stack", "our stack", "stack",
    "technologies", "tools", "technical requirements",
    
    // Work Environment
    "work environment", "working environment", "our environment",
    "work location", "location", "where you'll work", "where you’ll work", "workplace",
    "remote work", "hybrid work", "work arrangement", "flexible work",
    "flexibility", "work flexibility",
    
    // Culture/Benefits/Perks
    "culture", "our culture", "company culture", "values", "our values",
    "benefits", "our benefits", "what we offer", "we offer", "perks",
    "perks and benefits", "compensation", "compensation and benefits",
    "compensation package", "salary", "total compensation",
    
    // Why Join
    "why join us", "why join us?", "why work here", "why work here?",
    "why work with us", "why work with us?", "why us", "why us?",
    "why join", "why join?", "join us", "what makes us different",
    "what sets us apart", "why you'll love it here", "why you’ll love it here", "why you should join",
    "why join our team", "what's in it for you", "what you get", "what you'll get",
    "your journey", "your career growth", "growth opportunities",
    
    // Mission/Vision/Impact
    "mission", "our mission", "vision", "our vision",
    "impact", "our impact", "your impact", "making an impact",
    "what we believe", "what we stand for", "our purpose", "the challenge",
    "the problem", "the solution", "what drives us",
    
    // Process/Next Steps
    "interview process", "hiring process", "application process",
    "next steps", "how to apply", "apply now",
    
    // Diversity/Equal Opportunity
    "diversity", "diversity and inclusion", "equal opportunity",
    "eeo statement", "commitment to diversity",

    // Success Metrics/Expectations
    "success in this role", "what success looks like", "success metrics",
    "expectations", "how you'll succeed",
    "measuring success", "key performance indicators", "kpis",

    // Career & Development
    "career development", "professional development", "learning opportunities",
    "training", "mentorship", "growth path", "advancement opportunities",

    // Projects & Initiatives
    "key projects", "current projects", "what you'll work on",
    "initiatives", "priorities", "focus areas",
  ];

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const displayHeaderRe = new RegExp(`^\\s*(?:${displayHeaders.map(esc).join("|")})\\s*:?\\s*$`, "i");

  // Build blocks for UI rendering - NO DATA EXTRACTION
  const blocks = [];
  for (const ln of rawDesc.split("\n")) {
    const t = ln.trim();
    if (!t) continue;
    
    if (displayHeaderRe.test(t)) {
      blocks.push({ type: "header", text: t.replace(/:$/, "") });
    } else if (/^\s*•\s+/.test(ln)) {
      blocks.push({ type: "bullet", text: ln.replace(/^\s*•\s+/, "") });
    } else {
      blocks.push({ type: "text", text: ln });
    }
  }

  const cleanDescription = rawDesc.replace(/\n{3,}/g, "\n\n").trim();

  return {
    cleanDescription,
    requirements, // Direct from LLM - no extraction
    skills,       // Direct from LLM - no extraction
    blocks,       // For UI styling only
  };
}

export function displayLocation(job) {
  const loc = (job?.location || "").trim();
  if (loc) return loc;
  const source = (job?.description || "") + "\n" + (job?.company_name || "");
  const m = source.match(/(?:^|\n)\s*Location\s*:\s*([^\n]+)\n?/i);
  return m && m[1] ? m[1].trim() : "Not specified";
}
