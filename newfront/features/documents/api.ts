/**
 * Documents API Module
 * Handles document management, analysis, and AI generation
 * 
 * Backend routes: /api/documents/*
 */

import { apiFetch, clearCache } from '../../lib/api/core';
import { logger } from '../../lib/logger';

// Types
export type DocumentType = 
  | 'resume'
  | 'cover_letter'
  | 'portfolio'
  | 'transcript'
  | 'certificate'
  | 'reference_letter'
  | 'other';

export type DocumentStatus = 'active' | 'archived' | 'draft';

export interface Document {
  id?: number | string;
  name: string;
  document_type: DocumentType;
  status?: DocumentStatus;
  file_path?: string;
  file_size?: number;
  created_at?: string;
  updated_at?: string;
  analysis?: DocumentAnalysis;
}

export interface DocumentAnalysis {
  overall_score: number;
  categories: AnalysisCategory[];
  suggestions: string[];
  strengths: string[];
  analyzed_at: string;
  // Rich data from backend
  section_quality?: Record<string, { score: number; improvement_needed: boolean; notes?: string }>;
  keyword_analysis?: { keywords_found: string[]; keywords_missing: string[]; keyword_density: Record<string, number> };
  job_match_summary?: string;
  missing_skills?: string[];
  word_count?: number;
  action_verb_count?: number;
  ai_detailed_analysis?: Record<string, unknown>;
}

export interface AnalysisCategory {
  name: string;
  score: number;
  details: string;
  suggestions: string[];
  strengths?: string[];
  weaknesses?: string[];
}

export interface CoverLetterRequest {
  job_id: string;
  resume_id?: string;
  tone?: 'professional' | 'enthusiastic' | 'confident' | 'creative';
  length?: 'short' | 'medium' | 'long';
  focus_areas?: string[];
  custom_intro?: string;
}

export interface DocumentsListResponse {
  documents: Document[];
  total: number;
}

/**
 * Map backend field names to frontend field names.
 * Backend returns `type` but we use `document_type`;
 * backend enum value `reference` maps to our `reference_letter`.
 */
function normalizeDocument(raw: Partial<Document> & Record<string, unknown>): Document {
  const docType = (raw.type ?? raw.document_type ?? 'other') as string;
  return {
    ...raw,
    name: raw.name ?? '',
    document_type: (docType === 'reference' ? 'reference_letter' : docType) as DocumentType,
  };
}

/** Map our frontend type to the backend enum value */
function toBackendType(t: DocumentType): string {
  return t === 'reference_letter' ? 'reference' : t;
}

/** Shape of an individual AI analysis section from the backend */
interface RawAiSection {
  strengths?: string[];
  weaknesses?: string[];
  missing_elements?: string[];
  relevant_skills?: string[];
  improvements?: Array<string | { suggestion: string; example_before?: string; example_after?: string; example?: string }>;
}

/** Shape of the ATS score object returned by the backend analysis endpoint */
interface RawAtsScore {
  overall_score?: number;
  formatting_score?: number;
  keyword_score?: number;
  readability_score?: number;
  technical_skills_score?: number;
  soft_skills_score?: number;
  suggestions?: string[];
}

/** Shape of the raw backend analysis response */
interface RawAnalysisResponse {
  overall_score?: number;
  ats_score?: RawAtsScore;
  ai_detailed_analysis?: Record<string, RawAiSection>;
  tech_analysis?: { tech_found?: string[]; tech_missing?: string[] };
  keyword_analysis?: { keywords_found?: string[]; keywords_missing?: string[]; keyword_density?: Record<string, number> };
  missing_skills?: { skills?: string[] } | string[];
  job_match_summary?: string | { summary?: string };
  suggested_improvements?: string[];
  missing_sections?: string[];
  section_quality?: Record<string, { score: number; improvement_needed: boolean; notes?: string }>;
  section_scores?: Record<string, { score: number; improvement_needed: boolean; notes?: string }>;
  word_count?: number;
  action_verb_count?: number;
}

/**
 * Normalize backend analysis response into our frontend DocumentAnalysis shape.
 *
 * Backend returns rich data including ats_score, ai_detailed_analysis (with per-section
 * strengths/weaknesses/improvements), section_quality (per-section scores), keyword_analysis,
 * job_match_summary, missing_skills, and more.
 *
 * We map all of it so the frontend modal can display the full AI analysis.
 */
function normalizeAnalysis(raw: RawAnalysisResponse): DocumentAnalysis {
  const ats: RawAtsScore = raw.ats_score || {};
  const ai: Record<string, RawAiSection> = raw.ai_detailed_analysis || {};
  const overall: number = ats.overall_score ?? raw.overall_score ?? 0;

  // Helper: extract improvement suggestions from an AI section
  // Falls back to deriving actionable tips from weaknesses/missing_elements when improvements is empty
  const extractSuggestions = (section: RawAiSection | undefined): string[] => {
    if (!section) return [];
    const suggestions: string[] = [];

    // 1. Primary: use the improvements array
    if (Array.isArray(section.improvements)) {
      for (const imp of section.improvements) {
        if (typeof imp === 'string') {
          suggestions.push(imp);
        } else if (imp?.suggestion) {
          let text = imp.suggestion;
          if (imp.example_before && imp.example_after) {
            text += ` (e.g., "${imp.example_before}" → "${imp.example_after}")`;
          } else if (imp.example) {
            text += ` (e.g., "${imp.example}")`;
          }
          suggestions.push(text);
        }
      }
    }

    // 2. Fallback: convert weaknesses into improvement suggestions
    if (suggestions.length === 0 && Array.isArray(section.weaknesses)) {
      for (const w of section.weaknesses) {
        if (typeof w === 'string' && w.trim()) {
          suggestions.push(w);
        }
      }
    }

    // 3. Fallback: convert missing_elements into suggestions
    if (suggestions.length === 0 && Array.isArray(section.missing_elements)) {
      for (const m of section.missing_elements) {
        if (typeof m === 'string' && m.trim()) {
          suggestions.push(`Consider adding: ${m}`);
        }
      }
    }

    return suggestions;
  };

  // Helper: build a meaningful details string from AI section data
  const buildDetails = (section: RawAiSection | undefined, fallbackGood: string, fallbackBad: string, score: number): string => {
    if (!section) return score >= 80 ? fallbackGood : fallbackBad;
    const parts: string[] = [];
    if (Array.isArray(section.strengths) && section.strengths.length > 0) {
      parts.push(section.strengths.join('. '));
    }
    if (Array.isArray(section.weaknesses) && section.weaknesses.length > 0) {
      parts.push(section.weaknesses.join('. '));
    }
    if (parts.length > 0) return parts.join(' — ');
    return score >= 80 ? fallbackGood : fallbackBad;
  };

  // Build categories from ats sub-scores enriched with AI details
  const categories: AnalysisCategory[] = [];

  if (ats.formatting_score != null) {
    const aiSection = ai.formatting;
    categories.push({
      name: 'Formatting',
      score: Math.round(ats.formatting_score),
      details: buildDetails(aiSection,
        'Your document formatting is well-suited for ATS parsing.',
        'Consider improving document formatting for better ATS compatibility.',
        ats.formatting_score),
      suggestions: extractSuggestions(aiSection),
      strengths: aiSection?.strengths || [],
      weaknesses: aiSection?.weaknesses || [],
    });
  }
  if (ats.keyword_score != null) {
    const aiSection = ai.keywords;
    categories.push({
      name: 'Keywords',
      score: Math.round(ats.keyword_score),
      details: buildDetails(aiSection,
        'Good keyword coverage detected in your document.',
        'Your document could benefit from more relevant keywords.',
        ats.keyword_score),
      suggestions: extractSuggestions(aiSection),
      strengths: aiSection?.strengths || [],
      weaknesses: aiSection?.weaknesses || [],
    });
  }
  if (ats.readability_score != null) {
    categories.push({
      name: 'Readability',
      score: Math.round(ats.readability_score),
      details: ats.readability_score >= 80
        ? 'Document readability is excellent.'
        : 'Consider simplifying language and improving structure.',
      suggestions: [],
    });
  }
  if (ats.technical_skills_score != null) {
    const aiSection = ai.technical_skills;
    categories.push({
      name: 'Technical Skills',
      score: Math.round(ats.technical_skills_score),
      details: buildDetails(aiSection,
        'Strong technical skills coverage in your document.',
        'Consider expanding the technical skills section.',
        ats.technical_skills_score),
      suggestions: extractSuggestions(aiSection),
      strengths: aiSection?.strengths || [],
      weaknesses: aiSection?.weaknesses || aiSection?.missing_elements || [],
    });
  }
  if (ats.soft_skills_score != null) {
    const aiSection = ai.soft_skills;
    categories.push({
      name: 'Soft Skills',
      score: Math.round(ats.soft_skills_score),
      details: buildDetails(
        aiSection ? { strengths: aiSection.relevant_skills, weaknesses: aiSection.missing_elements } : undefined,
        'Good soft skills representation.',
        'Consider adding more soft skills examples.',
        ats.soft_skills_score),
      suggestions: extractSuggestions(aiSection),
      strengths: aiSection?.relevant_skills || [],
      weaknesses: aiSection?.missing_elements || [],
    });
  }

  // Combine suggestions from multiple sources
  const allSuggestions: string[] = [
    ...(Array.isArray(raw.suggested_improvements) ? raw.suggested_improvements : []),
    ...(Array.isArray(ats.suggestions) ? ats.suggestions : []),
    ...(Array.isArray(ai.overall_suggestions) ? ai.overall_suggestions : []),
  ];

  // Missing sections as suggestions
  if (Array.isArray(raw.missing_sections)) {
    for (const section of raw.missing_sections) {
      allSuggestions.push(`Add a "${section}" section to your document`);
    }
  }

  // Build real strengths from AI data + high-scoring categories
  const strengths: string[] = [];
  // Add formatting strengths
  if (ai.formatting?.strengths) {
    for (const s of ai.formatting.strengths) strengths.push(s);
  }
  // Add keyword strengths
  if (ai.keywords?.strengths) {
    for (const s of ai.keywords.strengths) strengths.push(s);
  }
  // Add technical skill strengths
  if (ai.technical_skills?.strengths) {
    for (const s of ai.technical_skills.strengths) strengths.push(s);
  }
  // Add soft skill strengths
  if (ai.soft_skills?.relevant_skills && ai.soft_skills.relevant_skills.length > 0) {
    strengths.push(`Demonstrated soft skills: ${ai.soft_skills.relevant_skills.join(', ')}`);
  }
  // Fallback: derive from high-scoring categories if AI data is absent
  if (strengths.length === 0) {
    for (const cat of categories) {
      if (cat.score >= 80) {
        strengths.push(`Strong ${cat.name.toLowerCase()} (${cat.score}/100)`);
      }
    }
  }
  if (raw.word_count && raw.word_count >= 200) {
    strengths.push(`Good document length (${raw.word_count} words)`);
  }

  // Job match summary
  let jobMatchSummary: string | undefined;
  if (raw.job_match_summary) {
    jobMatchSummary = typeof raw.job_match_summary === 'string'
      ? raw.job_match_summary
      : raw.job_match_summary?.summary;
  }

  // Missing skills - merge from missing_skills.skills AND tech_analysis.tech_missing
  const techAnalysis = raw.tech_analysis || {};
  const missingSkillsData = raw.missing_skills;
  const missingSkillsRaw: string[] = Array.isArray(missingSkillsData)
    ? missingSkillsData
    : (missingSkillsData as { skills?: string[] } | undefined)?.skills || [];
  const techMissing: string[] = techAnalysis.tech_missing || [];
  const allMissingSkills = [...new Set([...missingSkillsRaw, ...techMissing])];
  const missingSkills = allMissingSkills.length > 0 ? allMissingSkills : undefined;

  // Keyword analysis - merge with tech_analysis data
  const techFound: string[] = techAnalysis.tech_found || [];
  let keywordAnalysis: { keywords_found: string[]; keywords_missing: string[]; keyword_density: Record<string, number> } | undefined;
  if (raw.keyword_analysis || techFound.length > 0 || techMissing.length > 0) {
    const kwFound = [...new Set([
      ...(raw.keyword_analysis?.keywords_found || []),
      ...techFound,
    ])];
    const kwMissing = [...new Set([
      ...(raw.keyword_analysis?.keywords_missing || []),
      ...techMissing,
    ])];
    // Only include keyword analysis if there's actually data to show
    if (kwFound.length > 0 || kwMissing.length > 0) {
      keywordAnalysis = {
        keywords_found: kwFound,
        keywords_missing: kwMissing,
        keyword_density: raw.keyword_analysis?.keyword_density || {},
      };
    }
  }

  // Section quality
  const sectionQuality = raw.section_quality || raw.section_scores || undefined;

  // De-duplicate suggestions
  const uniqueSuggestions = [...new Set(allSuggestions)];

  return {
    overall_score: Math.round(overall),
    categories,
    suggestions: uniqueSuggestions,
    strengths,
    analyzed_at: new Date().toISOString(),
    section_quality: sectionQuality,
    keyword_analysis: keywordAnalysis,
    job_match_summary: jobMatchSummary,
    missing_skills: missingSkills,
    word_count: raw.word_count,
    action_verb_count: raw.action_verb_count,
    ai_detailed_analysis: ai,
  };
}

// API Functions
export const documentsApi = {
  /**
   * List all documents with optional filters
   */
  async listDocuments(filters?: {
    type?: DocumentType;
    status?: DocumentStatus;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<DocumentsListResponse> {
    const params = new URLSearchParams();
    if (filters?.type) params.set('document_type', toBackendType(filters.type));
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.page_size) params.set('page_size', String(filters.page_size));

    const qs = params.toString();
    const response = await apiFetch(`/documents/${qs ? `?${qs}` : ''}`);
    const data = await response.json();
    return {
      ...data,
      documents: (data.documents || []).map(normalizeDocument),
    };
  },

  /**
   * Get resumes specifically
   */
  async getResumes(): Promise<Document[]> {
    const r = await apiFetch('/documents/?document_type=resume&page=1&page_size=200');
    const data = await r.json();
    const docs = Array.isArray(data?.documents) ? data.documents : [];
    return docs.map(normalizeDocument);
  },

  /**
   * List resumes in label format (for dropdowns)
   */
  async listResumes(): Promise<Array<{ id: number | string; label: string }>> {
    const docs = await documentsApi.getResumes();
    return docs.map((d: Document) => ({
      id: d.id!,
      label: d.name || 'Resume',
    }));
  },

  /**
   * Upload a new document
   */
  async uploadDocument(file: File, documentType: DocumentType, name?: string): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', toBackendType(documentType));
    if (name) formData.append('name', name);

    const response = await apiFetch('/documents/upload', {
      method: 'POST',
      body: formData,
      headers: {},  // let browser set multipart Content-Type with boundary
    });
    if (!response.ok) throw new Error(await response.text());
    clearCache(); // Invalidate cached document lists so reload shows the new doc
    return response.json();
  },

  /**
   * Get document details
   */
  async getDocument(id: number | string): Promise<Document> {
    const response = await apiFetch(`/documents/${id}`);
    const data = await response.json();
    return normalizeDocument(data);
  },

  /**
   * Download document (triggers browser download)
   */
  async downloadDocument(id: number | string): Promise<void> {
    const response = await apiFetch(`/documents/${id}/download`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Document file missing from storage. Please re-upload the document.');
      }
      const errorDetail = await response.text().catch(() => `HTTP ${response.status}`);
      throw new Error(errorDetail);
    }

    const cd = response.headers.get('content-disposition') || '';
    let filename = 'document';
    const starMatch = cd.match(/filename\*\s*=\s*[^']+''([^;]+)/i);
    const quoted = cd.match(/filename\s*=\s*"([^"]+)"/i);
    const unquoted = cd.match(/filename\s*=\s*([^;]+)/i);
    if (starMatch) filename = decodeURIComponent(starMatch[1]);
    else if (quoted) filename = quoted[1];
    else if (unquoted) filename = unquoted[1].trim();

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Preview document in new tab
   */
  async previewDocument(id: number | string): Promise<boolean> {
    const response = await apiFetch(`/documents/${id}/preview`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Document file missing from storage. Please re-upload the document.');
      }
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  },

  /**
   * Delete document
   */
  async deleteDocument(id: number | string): Promise<void> {
    await apiFetch(`/documents/${id}`, { method: 'DELETE' });
  },

  /**
   * Analyze document with AI (optional job context).
   * Backend returns a different shape — we normalize it into our DocumentAnalysis.
   */
  async analyzeDocument(documentId: number | string, jobId?: number | string): Promise<DocumentAnalysis> {
    const qs = jobId
      ? `?job_id=${encodeURIComponent(jobId)}&use_ai=true`
      : '?use_ai=true';
    const response = await apiFetch(`/documents/${documentId}/analyze${qs}`, {
      method: 'POST',
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      logger.error('Document analysis failed:', response.status, errBody);
      throw new Error(errBody?.detail?.[0]?.msg || errBody?.error?.message || `Analysis failed (${response.status})`);
    }
    const raw = await response.json();
    const normalized = normalizeAnalysis(raw);
    return normalized;
  },

  /**
   * Generate cover letter with AI
   * Backend endpoint: POST /documents/cover-letter/generate
   */
  async generateCoverLetter(request: CoverLetterRequest): Promise<string> {
    const response = await apiFetch('/documents/cover-letter/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      logger.error('Cover letter generation failed:', response.status, errBody);
      throw new Error(errBody?.detail?.[0]?.msg || errBody?.error?.message || `Generation failed (${response.status})`);
    }
    const data = await response.json();

    // Backend returns { success: true, cover_letter: "...", word_count, model_used, ... }
    if (typeof data === 'string') return data;
    if (data?.cover_letter) return data.cover_letter;
    if (data?.content) return data.content;
    if (data?.text) return data.text;
    // Fallback: stringify if still an object
    if (typeof data === 'object') {
      logger.warn('Unexpected cover letter response format:', data);
      return JSON.stringify(data);
    }
    return String(data);
  },

  /**
   * Optimize document content
   */
  async optimizeDocument(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await apiFetch('/documents/optimize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  /**
   * Set document status
   */
  async setDocumentStatus(id: number | string, newStatus: DocumentStatus): Promise<Document> {
    const response = await apiFetch(`/documents/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ new_status: newStatus }),
    });
    const data = await response.json();
    return normalizeDocument(data);
  },

  /**
   * Get document templates
   */
  async getDocumentTemplates(params?: { category?: string; document_type?: string }): Promise<unknown[]> {
    const qs = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    const response = await apiFetch(`/documents/templates/${qs ? `?${qs}` : ''}`);
    return response.json();
  },

  /**
   * Attach existing document to application
   */
  async attachExistingDocument(appId: number | string, documentId: number | string): Promise<{ id: string; filename: string }> {
    const response = await apiFetch(`/applications/${appId}/attachments/from-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: String(documentId) }),
    });
    return response.json();
  },

  /**
   * Update document
   */
  async updateDocument(id: number | string, data: Partial<Document>): Promise<Document> {
    const response = await apiFetch(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  },
};
