// job-extractor.js — Universal extractor injected on all pages (MV3-safe)
// Runs only in top frame; uses a safe runtime wrapper (no page-world dependency)



(() => {
  if (window.top !== window) return;

  // --- Safe runtime wrapper (Chrome/Firefox)
  const runtime = (() => {
    try { if (typeof chrome !== "undefined" && chrome?.runtime?.id) return chrome.runtime; } catch {}
    try { if (typeof browser !== "undefined" && browser?.runtime) return browser.runtime; } catch {}
    return null;
  })();

  // --- Auto-capture Applytide tokens when we're on the app domain
  const APPLYTIDE_APP_HOSTS = ["localhost:3000", "app.applytide.com"]; // add prod host if different
  if (APPLYTIDE_APP_HOSTS.includes(location.host) && runtime) {
    const checkTokens = () => {
      try {
        const raw =
          localStorage.getItem("token") ||
          localStorage.getItem("tokens") ||
          localStorage.getItem("auth") ||
          localStorage.getItem("access_token");

        let access = null, refresh = null;
        if (raw) {
          try {
            const o = JSON.parse(raw);
            access = o.access_token || o.access || null;
            refresh = o.refresh_token || o.refresh || null;
          } catch {
            access = raw; // raw string token
          }
        }
        if (access) {
          runtime.sendMessage({ type: "APPLYTIDE_SET_TOKEN", token: access, refresh_token: refresh || "" });
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    // initial + hook into setItem to catch future logins
    checkTokens();
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (k, v) {
      originalSetItem.apply(this, arguments);
      if (k === "token" || k === "tokens" || k === "auth") setTimeout(checkTokens, 80);
    };
  }

  function sendToBackground(message) {
    return new Promise((resolve, reject) => {
      if (!runtime?.sendMessage) {
        return reject(new Error(
          "Applytide extension runtime is not available in this context. " +
          "Make sure the extension is installed, enabled, and allowed on this site; then refresh."
        ));
      }
      try {
        runtime.sendMessage(message, (response) => {
          const lastErr = (typeof chrome !== "undefined" && chrome?.runtime?.lastError)
            ? chrome.runtime.lastError.message
            : null;
          if (lastErr) return reject(new Error(lastErr));
          resolve(response);
        });
      } catch (e) { reject(e); }
    });
  }

  window.applytideBridge = {
    saveJob: (payload) => sendToBackground({ type: "APPLYTIDE_SAVE_JOB", payload }),
    setToken: (token)   => sendToBackground({ type: "APPLYTIDE_SET_TOKEN", token }),
    getToken: ()        => sendToBackground({ type: "APPLYTIDE_GET_TOKEN" })
  };

  // --- Utilities
  const clean = (s) => (s || "").replace(/\u00A0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\s+/g, " ").trim();
  const text  = (el) => clean(el?.textContent || "");
  const sel   = (r, q) => r.querySelector(q);
  const selAll= (r, q) => Array.from(r.querySelectorAll(q));
  const host  = () => { try { return new URL(location.href).hostname; } catch { return location.hostname || ""; } };
  const getMeta = (name) => {
    const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return clean(el?.getAttribute("content") || "");
  };
  // small async helpers
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const tryClick = (el) => { try { el?.click?.(); } catch {} };


  // --- Salary parsing
  function parseSalary(raw) {
    if (!raw) return {};
    const s = raw.replace(/[,€£$]/g, m => m === "," ? "" : m).toLowerCase();
    const kfix = s.replace(/(\d+(?:\.\d+)?)\s*k\b/g, (_, n) => String(Math.round(parseFloat(n) * 1000)));
    const m =
      kfix.match(/(\d{2,7})(?:\s*[-–—]\s*| to )(\d{2,7})/) ||
      kfix.match(/(?:up to|upto)\s*(\d{2,7})/) ||
      kfix.match(/(\d{2,7})\s*\+/);
    let salary_min, salary_max;
    if (m) {
      if (m.length >= 3 && m[1] && m[2]) {
        salary_min = parseInt(m[1], 10);
        salary_max = parseInt(m[2], 10);
      } else {
        salary_min = null;
        salary_max = parseInt(m[m.length - 1], 10);
      }
    } else {
      const one = kfix.match(/(\d{2,7})/);
      if (one) salary_min = parseInt(one[1], 10);
    }
    return { salary_min, salary_max };
  }

  // --- Remote / Job type heuristics
  function detectRemoteType(str) {
    const s = (str || "").toLowerCase();
    if (/remote[\s\-]?first|fully\s*remote|100%\s*remote|work\s*from\s*home/.test(s)) return "Remote";
    if (/\bon[-\s]?site\b|\bonsite\b/.test(s)) return "On-site";
    if (/hybrid|some\s*days\s*remote|partial\s*remote/.test(s)) return "Hybrid";
    if (/remote/.test(s)) return "Remote";
    return "";
  }
  function detectJobType(str) {
    const s = (str || "").toLowerCase();
    if (/full[-\s]?time|permanent/.test(s)) return "Full-time";
    if (/part[-\s]?time/.test(s)) return "Part-time";
    if (/\bcontract|contractor|temporary|temp\b/.test(s)) return "Contract";
    if (/intern|internship|co[-\s]?op/.test(s)) return "Internship";
    return "";
  }

  // --- JSON-LD (fallback for many ATS)
  function extractJSONLD() {
    const scripts = selAll(document, 'script[type="application/ld+json"]');
    let jobs = [];
    for (const s of scripts) {
      const jsonText = s.textContent || s.innerText || "";
      if (!jsonText) continue;
      try {
        const data = JSON.parse(jsonText.trim());
        const arr   = Array.isArray(data) ? data : [data];
        for (const item of arr) {
          const nodes = item?.["@graph"] && Array.isArray(item["@graph"]) ? item["@graph"] : [item];
          for (const node of nodes) {
            const types = [].concat(node?.["@type"] || []);
            if (types.map(String).join(",").toLowerCase().includes("jobposting")) jobs.push(node);
          }
        }
      } catch {}
    }
    if (!jobs.length) return null;

    const job = jobs.sort((a,b) => JSON.stringify(b).length - JSON.stringify(a).length)[0];
    const title = clean(job.title || job.name);
    const description = clean(
      (typeof job.description === "string" ? job.description : "") ||
      (typeof job.responsibilities === "string" ? job.responsibilities : "")
    );
    let company_name = clean(
      (job.hiringOrganization && (job.hiringOrganization.name || job.hiringOrganization.legalName)) ||
      (job.employer && (job.employer.name || job.employer.legalName)) || ""
    );
    let location = "";
    if (job.jobLocationType && /remote/i.test(job.jobLocationType)) {
      location = "Remote";
    } else if (job.jobLocation) {
      const jl = Array.isArray(job.jobLocation) ? job.jobLocation[0] : job.jobLocation;
      const addr = jl?.address || jl?.addressLocality || jl;
      if (typeof addr === "string") location = clean(addr);
      else {
        const parts = [addr?.addressLocality, addr?.addressRegion, addr?.postalCode, addr?.addressCountry].filter(Boolean);
        location = clean(parts.join(", "));
      }
    }
    const employmentType = Array.isArray(job.employmentType) ? job.employmentType.join(" ") : (job.employmentType || "");
    const remote_type = detectRemoteType([job.jobLocationType, description].join(" "));
    const job_type    = detectJobType(employmentType) || detectJobType(description);

    let salary_min = null, salary_max = null;
    const baseSalary = job.baseSalary || job.salary;
    if (baseSalary && typeof baseSalary === "object") {
      const value = baseSalary.value || {};
      const min = value.minValue ?? value.value;
      const max = value.maxValue ?? value.value;
      salary_min = typeof min === "number" ? Math.round(min) : parseInt(min || "", 10) || null;
      salary_max = typeof max === "number" ? Math.round(max) : parseInt(max || "", 10) || null;
    } else {
      const parsed = parseSalary(description || "");
      salary_min = parsed.salary_min ?? null;
      salary_max = parsed.salary_max ?? null;
    }

    return { title, company_name, location, remote_type, job_type, salary_min, salary_max, description };
  }

  // --- LinkedIn (strong recipe)
  async function expandLinkedInDescription(root = document) {
    const selectors = [
      'button.show-more-less-html__button',
      '.inline-show-more-text__button',
      'button[aria-label*="more" i]',
      'button[aria-expanded="false"]',
      'button[data-control-name="show_more"]'
    ];

    // Click a few times—LinkedIn hydrates in waves
    for (let i = 0; i < 3; i++) {
      selectors.forEach(sel => {
        selAll(root, sel).forEach(b => {
          const t = (b.textContent || "").toLowerCase();
          if (/more|see more|show more/.test(t) || b.getAttribute('aria-expanded') === 'false') {
            tryClick(b);
          }
        });
      });
      await sleep(150);
    }
  }


  function firstWithin(root, ...selectors){
    if(!root) return null;
    for(const q of selectors){
      const el = root.querySelector(q);
      if(el && clean(el.textContent)) return el;
    }
    return null;
  }

  async function extractLinkedIn() {
    if (!/(^|\.)linkedin\.com$/i.test(host())) return null;

    const detailRoot =
      document.querySelector('.jobs-search__job-details--container, .two-pane-serp-page__detail-view, .jobs-details, .jobs-unified-top-card')?.closest('section,div,main') ||
      document.querySelector('main') || document.body;

    await expandLinkedInDescription(detailRoot);

    const titleEl = (
      sel(detailRoot, '.jobs-unified-top-card__job-title') ||
      sel(detailRoot, 'h1.top-card-layout__title') ||
      sel(detailRoot, 'h1.t-24') ||
      sel(detailRoot, 'h1')
    );

    const companyEl = (
      sel(detailRoot, '.jobs-unified-top-card__company-name a') ||
      sel(detailRoot, '.topcard__org-name-link') ||
      sel(detailRoot, '.top-card-layout__entity-info a') ||
      sel(detailRoot, 'a[href*="/company/"]')
    );

    const locationEl = (
      sel(detailRoot, 'span.jobs-unified-top-card__bullet') ||
      sel(detailRoot, '.top-card-layout__first-subline span') ||
      sel(detailRoot, '.topcard__flavor--bullet')
    );

    // try hydrated description, retry after expanding
    const descSelectors = [
      'div.show-more-less-html__markup',
      '.jobs-description-content__text',
      '.jobs-unified-description__content',
      '.jobs-box__html-content',
      'article.jobs-description__container'
    ];

    let descEl = descSelectors.map(q => sel(detailRoot, q)).find(Boolean);
    if (!descEl || !clean(descEl.innerText || "").length) {
      await expandLinkedInDescription(detailRoot);
      await sleep(150);
      descEl = descSelectors.map(q => sel(detailRoot, q)).find(Boolean);
    }

    let title        = clean(text(titleEl));
    let company_name = clean(text(companyEl));
    const location   = clean(text(locationEl));
    const description= clean(descEl?.innerText || "");

    // read chips for work type / job type
    const chipsText = selAll(detailRoot, ".jobs-unified-top-card__workplace-type, .jobs-unified-top-card__job-insight, .top-card-layout__cta-container span, .topcard__flavor")
      .map(text).join(" | ");

    let remote_type = "";
    if (/hybrid/i.test(chipsText)) remote_type = "Hybrid";
    else if (/on[-\s]?site|onsite/i.test(chipsText)) remote_type = "On-site";
    else if (/remote/i.test(chipsText)) remote_type = "Remote";

    let job_type = "";
    if (/full[-\s]?time/i.test(chipsText)) job_type = "Full-time";
    else if (/part[-\s]?time/i.test(chipsText)) job_type = "Part-time";
    else if (/\bcontract|temporary|temp\b/i.test(chipsText)) job_type = "Contract";
    else if (/intern/i.test(chipsText)) job_type = "Internship";

    // fallbacks from OG tags if needed
    if (!title || !company_name) {
      const og = getMeta("og:title"); // "Software Engineer – Foo | LinkedIn"
      if (og) {
        const [t, c] = og.replace(/\|.*$/, '').split(" - ").map(clean);
        if (!title && t) title = t;
        if (!company_name && c) company_name = c;
      }
    }

    if (!title && !description) return null;
    return { title, company_name, location, remote_type, job_type, description };
  }


  // --- ATS recipes (kept)
  const ATS = [
    { host: /boards\.greenhouse\.io$/, title: ["h1.app-title",".opening .title",".content h1"], company: [".company-name"], location: [".location"], description: [".content .opening",".content .application h2 ~ div",".content .section-wrapper"] },
    { host: /jobs\.lever\.co$/,        title: ["h2.posting-headline","h1"], company: ["a.posting-company"], location: ["div.posting-categories > div:nth-child(1)"], description: ["div.posting-description"] },
    { host: /myworkdayjobs\.com$/,     title: ['h1[data-automation-id="jobPostingHeader"]',"h1","h2"], location: ['[data-automation-id="jobPostingLocations"], .css-1wh2kri'], description: ['[data-automation-id="jobPostingDescription"]',"article","main"] },
    { host: /jobs\.ashbyhq\.com$/,     title: ["h1",".JobPosting h1"], description: [".content","article"] },
    { host: /careers\.smartrecruiters\.com$/, title: [".job-title","h1"], description: ["#job-description",".job-description"] },
    { host: /workable\.com$/,          title: ["h1[data-ui='job-title']","h1"], location: ["p[data-ui='job-location']"], description: ["section[data-ui='job-description']"] },
    { host: /icims\.com$/,             title: [".job-title","h1"], description: [".iCIMS_JobContent","#job-content"] },
    { host: /taleo\.net$/,             title: ["h1","h2"], description: ["#requisitionDescriptionInterface\\.ID1577\\.row1","#requisitionDescriptionInterface\\.descRequisition"] },
    { host: /personio\.(de|com)$/,     title: ["h1","h2"], description: ["section","article"] },
    { host: /bamboohr\.com$/,          title: ["h1","h2"], description: ["#content",".job"] }
  ];

  function firstTextBySelectors(root, arr) {
    for (const q of arr || []) {
      const el = sel(root, q);
      if (el) return text(el);
    }
    return "";
  }
  function firstHTMLBySelectors(root, arr) {
    for (const q of arr || []) {
      const el = sel(root, q);
      if (el) return el.innerText || el.textContent || "";
    }
    return "";
  }
  function extractByATS() {
    const h = host();
    const match = ATS.find(r => r.host.test(h));
    if (!match) return null;
    const title = firstTextBySelectors(document, match.title);
    const company_name = firstTextBySelectors(document, match.company) || clean(getMeta("og:site_name"));
    const location = firstTextBySelectors(document, match.location);
    const description = firstHTMLBySelectors(document, match.description);
    if (!title && !description) return null;
    return { title, company_name, location, description };
  }

  // --- Generic DOM extraction (backup)
  function genericDOMExtract() {
    const title = text(sel(document, 'h1, h1 [data-test="job-title"], .job-title, .posting-headline, [data-job-title="true"]')) ||
                  clean(document.title.replace(/\s*\|\s*.+$/, ""));
    let company_name = text(sel(document, '.company, .employer, [data-company], .posting-company')) ||
                       clean(getMeta("og:site_name"));
    const location = text(sel(document, '.location, [data-location], [itemprop="addressLocality"]'));

    const candidates = selAll(document, "main, article, section, .content, .description, [data-test='job-description'], [itemprop='description']")
      .map(el => {
        const t = (el.innerText || "").trim();
        const score =
          (t.match(/•|- |\u2022/g) || []).length * 3 +
          (/\b(requirements?|qualifications?|skills?|responsibilities|what you'll do)\b/i.test(t) ? 10 : 0) +
          Math.min(t.length / 900, 8);
        return { t, score };
      })
      .sort((a,b) => b.score - a.score);

    const description = clean(candidates[0]?.t || "");
    if (!title && !description) return null;
    return { title, company_name, location, description };
  }

  // ============================================================
  // Smart sectioning + dictionary-free skills extraction
  // ============================================================
  const START_RE = [
    /requirements?:/i,
    /qualifications?:/i,
    /who you are:?/i,
    /must[-\s]?have:?/i,
    /nice[-\s]?to[-\s]?have:?/i,
    /preferred:?/i,
    /highly desired:?/i,
    /what you bring:?/i,
    /what we expect:?/i,
    /desired profile:?/i,
    /skills?:/i
  ];

  const STOP_RE = /^(?:\s*)(responsibilities:|the role:|what you'll do:|what you will do:|what you'll be doing:|benefits?:|perks?:|compensation:|salary:|about (?:us|the role|the company):)/im;


  const STOPWORDS = new Set([
    "and","or","the","a","an","to","of","in","on","for","with","as","by","at","from","into","over","under",
    "you","we","our","your","their","his","her","its","is","are","be","being","been","have","has","had",
    "this","that","these","those","etc","ability","ability to","experience","experience with","years","year",
    "using","use","knowledge","knowledge of","familiarity","familiarity with","proficiency","proficient",
    "expertise","expert","strong","solid","good","excellent","great","plus","nice","nice to have","must","required",
    "preferred","including","such as"
  ]);

  function toBulletsBlock(s) {
    // turn common bullets into newlines, then split
    let txt = (s || "")
      .replace(/\r/g, "")
      .replace(/[•\u2022·]+/g, "\n• ")
      .replace(/\t/g, "  ");

    // primary split by lines; strip bullet leaders
    let lines = txt.split("\n")
      .map(x => x.replace(/^[\s•\-\u2022\*\u25AA\d]+[.)]?\s*/g, "").trim())
      .filter(Boolean);

    // if a line is too long, split on sentence/semicolon boundaries
    const out = [];
    for (const line of lines) {
      if (line.length > 220 && /[.;]\s+/.test(line)) {
        line.split(/(?<=\.)\s+(?=[A-Z])|;\s+/)
          .map(p => p.trim())
          .filter(Boolean)
          .forEach(p => out.push(p));
      } else {
        out.push(line);
      }
    }
    return out;
  }

  // Grab lines that follow a given heading up to the next STOP_RE
  function findSection(desc, startRegex) {
    const d = "\n" + (desc || "") + "\n";
    const m = d.toLowerCase().search(startRegex);
    if (m === -1) return [];
    let tail = d.slice(m);
    // drop the heading line itself
    tail = tail.replace(/^[^\n]*\n/, "");
    // cut at the next section boundary
    const stopIdx = tail.search(STOP_RE);
    const chunk = stopIdx === -1 ? tail : tail.slice(0, stopIdx);
    return toBulletsBlock(chunk);
  }

  // Extracts skill phrases by cues, without a fixed dictionary
  function extractSkillsSmart(fullText, candidateLines) {
    const textForSkills = (candidateLines && candidateLines.length ? candidateLines.join("\n") : fullText) || "";
    const skills = [];

    // tiny whitelist of common tech terms (lowercased canonicals)
    const CANON = {
      "python":"Python","java":"Java","golang":"Go","go":"Go","javascript":"JavaScript","typescript":"TypeScript",
      "node":"Node.js","node.js":"Node.js","react":"React","react.js":"React",
      "aws":"AWS","gcp":"GCP","azure":"Azure","kubernetes":"Kubernetes","docker":"Docker",
      "kafka":"Kafka","kinesis":"Kinesis","sns":"SNS","sqs":"SQS",
      "dynamodb":"DynamoDB","mongo":"MongoDB","mongodb":"MongoDB","elasticsearch":"Elasticsearch",
      "mysql":"MySQL","postgres":"PostgreSQL","postgresql":"PostgreSQL","nosql":"NoSQL",
      "rest":"REST","restful":"REST","graphql":"GraphQL","microservices":"Microservices",
      "ci/cd":"CI/CD","ci":"CI","cd":"CD","linux":"Linux","terraform":"Terraform","jenkins":"Jenkins","git":"Git",
      "redis":"Redis","rabbitmq":"RabbitMQ"
    };

    // 1) cue-based phrases
    const CUE = /(?:experience|proficien(?:t|cy)|knowledge|familiarity|hands[-\s]?on|expert(?:ise)?|background|understanding|certified|skills?)\s+(?:with|in|of|using|on|for)\s+([^.\n;]+)/ig;
    let m;
    while ((m = CUE.exec(textForSkills)) !== null) {
      (m[1] || "").split(/[,/]| \bor\b | \band\b /i).forEach(tok => skills.push(tok.trim()));
    }

    // 2) acronyms/tool-ish tokens
    (textForSkills.match(/\b[A-Z][A-Z0-9\+\.#\-]{2,6}\b/g) || []).forEach(tok => skills.push(tok));

    // 3) vendor+product bigrams (but short)
    (textForSkills.match(/\b[A-Z][a-z0-9\+\.\-]{2,}(?: [A-Z][a-z0-9\+\.\-]{2,})?\b/g) || [])
      .filter(ph => ph.length <= 26)
      .forEach(ph => skills.push(ph));

    // normalize + filter
    const BAD = new Set([
      "about","learn","beautiful","passionate","smart","international","firm","company","team",
      "location","israel","tel aviv","new york","san francisco","atlanta"
    ]);

    const out = [];
    const seen = new Set();

    const norm = (s) => s.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
    const keep = (s) => {
      const lc = s.toLowerCase();

      if (!s || lc.length < 2) return false;
      if (BAD.has(lc)) return false;
      if (/^(and|or|the|a|an|with|using|of|for|to)$/i.test(lc)) return false;
      if (/^(about|benefits?|perks?|responsibilities?)\b/i.test(lc)) return false;

      // strong positives
      if (CANON[lc]) return true;
      if (/[.#+/]/.test(s)) return true;               // Node.js, CI/CD, C++, C#
      if (/(DB|SQL|JS)$/i.test(s)) return true;         // DynamoDB, PostgreSQL, NodeJS
      if (/^[A-Z0-9]{2,6}$/.test(s)) return true;       // AWS, SQS, SNS, ERP, CAD
      if (/^[A-Z][a-z]+\s[A-Z][a-z]+$/.test(s)) return /Cloud|Services|Analytics/.test(s); // narrow bigrams

      return false;
    };

    for (let k of skills.map(norm)) {
      if (!keep(k)) continue;
      const lc = k.toLowerCase();
      if (CANON[lc]) k = CANON[lc];
      if (!seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); out.push(k); }
    }

    return out.slice(0, 50);
  }



  function splitSections(description) {
    const d = description || "";

    // find first requirements-like heading to split desc/reqs
    let firstReqIdx = -1;
    for (const re of START_RE) {
      const idx = (d.toLowerCase()).search(re);
      if (idx !== -1 && (firstReqIdx === -1 || idx < firstReqIdx)) firstReqIdx = idx;
    }

    // everything BEFORE the first requirements heading = description body
    const descriptionMain = firstReqIdx > -1 ? d.slice(0, firstReqIdx).trim() : d.trim();

    // collect requirement blocks from every matching heading
    let reqs = [];
    for (const re of START_RE) {
      const lines = findSection(d, re);
      if (lines.length) reqs = reqs.concat(lines);
    }

    // fallback: if we found nothing, look for bullet-ish requirement cues
    if (!reqs.length) {
      reqs = toBulletsBlock(d).filter(line =>
        /\b(years? of experience|experience with|proficien|knowledge of|familiarity|ability to|degree|certif|license)\b/i.test(line)
      );
    }

    // filter out obvious non-requirement noise
    const BAD_REQ = /^(location:|about\b|learn more\b|what you'll get\b|benefits?\b|perks?\b|responsibilities?\b)/i;
    reqs = reqs
      .map(x => x.replace(/\s+/g, " ").trim())
      .filter(x => x.length >= 3 && x.length <= 400 && !BAD_REQ.test(x) && !/\bhttps?:\/\//i.test(x));

    // dedupe while preserving order
    const seen = new Set();
    reqs = reqs.filter(x => (x = x.trim().toLowerCase(), !seen.has(x) && seen.add(x)));

    // smarter skills: mine mostly from requirements (less fluff)
    const skills = extractSkillsSmart([descriptionMain, reqs.join("\n")].join("\n"), reqs);

    return { descriptionMain, requirements: reqs, skills };
  }

  // --- Should we show the button?
  function looksLikeJobPage() {
    const href = location.href.toLowerCase();
    if (/(linkedin\.com\/jobs\/|job|jobs|career|apply|hiring|workdayjobs|greenhouse|lever|smartrecruiters|ashbyhq|bamboohr|icims|taleo)/.test(href)) return true;
    if (document.querySelector('script[type="application/ld+json"]')) return true;
    const applyBtn = document.querySelector('a,button');
    if (applyBtn && /apply/i.test(applyBtn.textContent || "")) return true;
    return false;
  }

  // --- Build payload for backend
  function buildPayload(core) {
    const { title, company_name, location, remote_type, job_type, salary_min, salary_max, description } = core;

    // split description into: descriptionMain + requirements + skills
    const sections = splitSections(description || "");
    let cleanDescription = sections.descriptionMain;

    // remove leading "About the job/role/us" if present
    cleanDescription = cleanDescription.replace(/^\s*about (?:the job|the role|us)\s*[:\-–]\s*/i, "").trim();

    const source_url = document.location?.href || window.location?.href || "";
    const allText = [title, company_name, location, description].join(" ");
    const rt  = remote_type || detectRemoteType(allText);
    const jt  = job_type || detectJobType(allText);
    const sal = (!salary_min && !salary_max) ? parseSalary(description || "") : { salary_min, salary_max };

    return {
      title: title || "",
      company_name: company_name || "",
      location: location || "",
      remote_type: rt || "",
      job_type: jt || "",
      salary_min: sal.salary_min ?? null,
      salary_max: sal.salary_max ?? null,
      source_url,
      description: cleanDescription,        // responsibilities stay here
      requirements: sections.requirements,  // ONLY reqs/quals
      skills: sections.skills
    };
  }


  // --- Injection & click handler
  function ensureButton() {
    if (!looksLikeJobPage()) return;
    let btn = document.getElementById("applytide-button");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "applytide-button";
      btn.className = "applytide-save-button";
      btn.textContent = "Save to Applytide";
      btn.addEventListener("mouseenter", () => btn.classList.add("applytide-button-hover"));
      btn.addEventListener("mouseleave", () => btn.classList.remove("applytide-button-hover"));
      document.documentElement.appendChild(btn);
      btn.addEventListener("click", onSave);
    }
  }

  async function onSave(ev) {
    const btn = ev.currentTarget;
    if (btn.dataset.busy === "1") return;
    btn.dataset.busy = "1";
    btn.classList.add("applytide-button-loading");
    btn.textContent = "Extracting…";
    try {
      // Prefer site recipe → JSON-LD → ATS → generic
      let core = await extractLinkedIn() || extractJSONLD() || extractByATS() || genericDOMExtract();
      if (!core) throw new Error("Couldn't detect job on this page.");
      const payload = buildPayload(core);
      btn.textContent = "Saving…";
      const res = await sendToBackground({ type: "APPLYTIDE_SAVE_JOB", payload });
      if (res?.success) {
        btn.textContent = "Saved!";
        btn.classList.remove("applytide-button-loading");
        btn.classList.add("applytide-button-success");
      } else {
        throw new Error(res?.error || "Save failed");
      }
    } catch (e) {
      btn.textContent = "Error – See Console";
      btn.classList.remove("applytide-button-loading");
      btn.classList.add("applytide-button-error");
      console.error("[Applytide] save failed:", e);
      setTimeout(() => {
        btn.textContent = "Save to Applytide";
        btn.classList.remove("applytide-button-error");
      }, 4000);
    } finally {
      btn.dataset.busy = "0";
    }
  }

  // --- Observe SPA changes
  let lastHref = location.href;
  const refresh = () => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      document.getElementById("applytide-button")?.remove();
    }
    ensureButton();
  };
  const mo = new MutationObserver(() => refresh());
  mo.observe(document.documentElement, { subtree: true, childList: true });
  if (document.readyState === "complete" || document.readyState === "interactive") ensureButton();
  else window.addEventListener("DOMContentLoaded", ensureButton, { once: true });
  window.addEventListener("applytide:refresh", refresh);
})();
