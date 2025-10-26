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
    "meet the team", "who you'll work with",
    
    // Responsibilities
    "key responsibilities", "responsibilities", "your responsibilities",
    "main responsibilities", "core responsibilities", "day-to-day responsibilities",
    "what you'll do", "what you will do", "what you'll be doing",
    "your day-to-day", "daily responsibilities", "duties", "key duties",
    "role responsibilities", "your role", "your mission",
    "in this role you will", "you will", "day to day", "a day in the life",
    
    // Requirements/Qualifications
    "qualifications", "required qualifications", "minimum qualifications",
    "preferred qualifications", "requirements", "required skills",
    "what we're looking for", "what we are looking for",
    "who you are", "ideal candidate", "about you",
    "you have", "you bring", "what you bring", "what you bring to the table",
    "what you'll need", "what you will need", "what we need",
    "must have", "experience", "required experience",
    
    // Nice to Have / Bonus
    "nice to have", "nice-to-have", "nice to haves", "nice-to-haves",
    "preferred", "preferred qualifications", "preferred requirements", "preferred skills",
    "bonus points", "bonus", "plus", "a plus", "extras", "ideal qualifications",
    
    // Skills/Technical
    "skills", "technical skills", "required skills", "preferred skills",
    "nice to have skills", "tech stack", "technology stack", "our stack", "stack",
    "technologies", "tools", "technical requirements",
    
    // Work Environment
    "work environment", "working environment", "our environment",
    "work location", "location", "where you'll work", "workplace",
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
    "what sets us apart", "why you'll love it here", "why you should join",
    
    // Mission/Vision/Impact
    "mission", "our mission", "vision", "our vision",
    "impact", "our impact", "your impact", "making an impact",
    
    // Process/Next Steps
    "interview process", "hiring process", "application process",
    "next steps", "how to apply", "apply now",
    
    // Diversity/Equal Opportunity
    "diversity", "diversity and inclusion", "equal opportunity",
    "eeo statement", "commitment to diversity",
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
