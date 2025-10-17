/**
 * Normalize API responses so the UI can always read:
 * - analysis.ats_score
 * - analysis.ai_detailed_analysis.{technical_skills,soft_skills,keywords,formatting,overall_suggestions}
 */
export function normalizeAnalysisResponse(resp = {}) {
  // Some responses return AI fields at the root; migrate them under ai_detailed_analysis
  if (resp && (resp.technical_skills || resp.keywords || resp.soft_skills || resp.formatting)) {
    resp.ai_detailed_analysis = {
      technical_skills: resp.technical_skills,
      keywords: resp.keywords,
      soft_skills: resp.soft_skills,
      formatting: resp.formatting,
      overall_suggestions: resp.overall_suggestions,
      ...(resp.ai_detailed_analysis || {}),
    };
  }
  return resp;
}
