/**
 * AnalysisModal Component - Premium Redesign
 * AI Resume Analysis with stunning visuals and smooth UX
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Sparkles,
  Loader2,
  TrendingUp,
  AlertCircle,
  FileText,
  Briefcase,
  CheckCircle2,
  Zap,
  Target,
  Award,
  ArrowRight,
  Search,
  XCircle,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Progress } from "../../../components/ui/progress";
import { Badge } from "../../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  documentsApi,
  type Document,
  type DocumentAnalysis,
} from "../../../features/documents/api";
import { jobsApi, type Job } from "../../../features/jobs/api";
import { toast } from "sonner";
import { logger } from "../../../lib/logger";
interface AnalysisModalProps {  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  isRTL?: boolean;
}

type AnalysisType = "general" | "job-specific";

export function AnalysisModal({
  document,
  isOpen,
  onClose,
  isRTL = false,
}: AnalysisModalProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisType, setAnalysisType] =
    useState<AnalysisType>("general");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [analysis, setAnalysis] =
    useState<DocumentAnalysis | null>(null);

  useEffect(() => {
    if (isOpen && document) {
      loadJobs();
      setAnalysis(null);
      setAnalysisType("general");
      setSelectedJobId("");
    }
  }, [isOpen, document]);

  const loadJobs = async () => {
    try {
      const data = await jobsApi.listJobs({ page_size: 100 });
      setJobs(data.items || []);
    } catch (error) {
      logger.error("Failed to load jobs:", error);
    }
  };

  const performAnalysis = async () => {
    if (!document?.id) return;

    if (analysisType === "job-specific" && !selectedJobId) {
      toast.error(
        isRTL ? "נא לבחור משרה" : "Please select a job",
      );
      return;
    }

    setAnalyzing(true);
    try {
      const jobId =
        analysisType === "job-specific"
          ? selectedJobId
          : undefined;
      const result = await documentsApi.analyzeDocument(
        document.id!,
        jobId,
      );
      setAnalysis(result);
      toast.success(
        isRTL ? "הניתוח הושלם!" : "Analysis completed!",
      );
    } catch (error) {
      logger.error('Document analysis error:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(
        isRTL
          ? "שגיאה בניתוח המסמך"
          : `Failed to analyze document: ${msg}`,
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80)
      return "text-green-600 dark:text-green-400";
    if (score >= 60)
      return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80)
      return "from-green-500/10 to-emerald-500/10";
    if (score >= 60)
      return "from-yellow-500/10 to-amber-500/10";
    return "from-red-500/10 to-rose-500/10";
  };

  const selectedJob = jobs.find(
    (job) => String(job.id) === selectedJobId,
  );

  return (
    <AnimatePresence>
      {isOpen && document && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#383e4e] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-[#9F5F80]/20 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Premium Header */}
              <div
                className="relative bg-gradient-to-br from-[#9F5F80] via-[#8a4e6b] to-[#383e4e] p-6 md:p-8 text-white overflow-hidden flex-shrink-0"
                dir={isRTL ? "rtl" : "ltr"}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                      backgroundSize: "32px 32px",
                    }}
                  />
                </div>

                <div className="relative flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 md:p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                        <Sparkles className="h-5 w-5 md:h-7 md:w-7" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-3xl font-bold">
                          {isRTL
                            ? "ניתוח AI מתקדם"
                            : "Advanced AI Analysis"}
                        </h2>
                        <p className="text-white/80 text-xs md:text-sm mt-1">
                          {isRTL
                            ? "קבלו תובנות על המסמך שלכם"
                            : "Get deep insights on your document"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 md:mt-4">
                      <FileText className="h-3.5 w-3.5 md:h-4 md:w-4 text-white/60 flex-shrink-0" />
                      <p className="text-white/90 font-medium text-sm md:text-base truncate">
                        {document.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all flex-shrink-0"
                  >
                    <X className="h-5 w-5 md:h-6 md:w-6" />
                  </button>
                </div>
              </div>

              <div
                className="flex-1 overflow-y-auto overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div
                  className="p-4 md:p-8 space-y-6 md:space-y-8"
                  dir={isRTL ? "rtl" : "ltr"}
                >
                  {/* Analysis Type Selection */}
                  {!analysis && (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Target className="h-5 w-5 text-[#9F5F80]" />
                          <Label className="text-lg font-bold text-[#383e4e] dark:text-white">
                            {isRTL
                              ? "בחרו סוג ניתוח"
                              : "Choose Analysis Type"}
                          </Label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <motion.button
                            onClick={() =>
                              setAnalysisType("general")
                            }
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                              group relative p-6 rounded-xl border-2 transition-all overflow-hidden
                              ${
                                analysisType === "general"
                                  ? "border-[#9F5F80] bg-gradient-to-br from-[#9F5F80]/10 to-[#9F5F80]/5 shadow-lg shadow-[#9F5F80]/20"
                                  : "border-[#b6bac5]/20 hover:border-[#9F5F80]/40 bg-white dark:bg-[#383e4e]/30"
                              }
                            `}
                          >
                            {/* Gradient Overlay on Hover */}
                            <div
                              className={`absolute inset-0 bg-gradient-to-br from-[#9F5F80]/5 to-transparent transition-opacity ${analysisType === "general" ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`}
                            />

                            <div className="relative">
                              <div
                                className={`inline-flex p-4 rounded-xl mb-4 transition-all ${
                                  analysisType === "general"
                                    ? "bg-[#9F5F80] text-white shadow-lg"
                                    : "bg-gray-100 dark:bg-[#383e4e]/50 text-[#6c757d] group-hover:bg-[#9F5F80]/10"
                                }`}
                              >
                                <FileText className="h-8 w-8" />
                              </div>
                              <h3 className={`font-bold text-lg mb-2 text-[#383e4e] dark:text-white ${isRTL ? 'text-right' : ''}`}>
                                {isRTL
                                  ? "ניתוח כללי"
                                  : "General Analysis"}
                              </h3>
                              <p className={`text-sm text-[#6c757d] dark:text-[#b6bac5] leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                                {isRTL
                                  ? "קבלו ניתוח מקיף של המסמך כולל נקודות חוזק, הצעות לשיפור וציון כללי"
                                  : "Get a comprehensive analysis including strengths, improvements, and overall score"}
                              </p>
                              {analysisType === "general" && (
                                <div className={`mt-4 flex items-center gap-2 text-[#9F5F80] font-semibold text-sm ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                                  <CheckCircle2 className="h-4 w-4" />
                                  {isRTL ? "נבחר" : "Selected"}
                                </div>
                              )}
                            </div>
                          </motion.button>

                          <motion.button
                            onClick={() =>
                              setAnalysisType("job-specific")
                            }
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                              group relative p-6 rounded-xl border-2 transition-all overflow-hidden
                              ${
                                analysisType === "job-specific"
                                  ? "border-[#9F5F80] bg-gradient-to-br from-[#9F5F80]/10 to-[#9F5F80]/5 shadow-lg shadow-[#9F5F80]/20"
                                  : "border-[#b6bac5]/20 hover:border-[#9F5F80]/40 bg-white dark:bg-[#383e4e]/30"
                              }
                            `}
                          >
                            {/* Gradient Overlay on Hover */}
                            <div
                              className={`absolute inset-0 bg-gradient-to-br from-[#9F5F80]/5 to-transparent transition-opacity ${analysisType === "job-specific" ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`}
                            />

                            <div className="relative">
                              <div
                                className={`inline-flex p-4 rounded-xl mb-4 transition-all ${
                                  analysisType === "job-specific"
                                    ? "bg-[#9F5F80] text-white shadow-lg"
                                    : "bg-gray-100 dark:bg-[#383e4e]/50 text-[#6c757d] group-hover:bg-[#9F5F80]/10"
                                }`}
                              >
                                <Briefcase className="h-8 w-8" />
                              </div>
                              <h3 className={`font-bold text-lg mb-2 text-[#383e4e] dark:text-white ${isRTL ? 'text-right' : ''}`}>
                                {isRTL
                                  ? "ניתוח לפי משרה"
                                  : "Job-Specific Analysis"}
                              </h3>
                              <p className={`text-sm text-[#6c757d] dark:text-[#b6bac5] leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                                {isRTL
                                  ? "השוו את המסמך למשרה ספציפית וקבלו המלצות ממוקדות להתאמה"
                                  : "Compare your document against a specific job with tailored recommendations"}
                              </p>
                              {analysisType ===
                                "job-specific" && (
                                <div className={`mt-4 flex items-center gap-2 text-[#9F5F80] font-semibold text-sm ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                                  <CheckCircle2 className="h-4 w-4" />
                                  {isRTL ? "נבחר" : "Selected"}
                                </div>
                              )}
                            </div>
                          </motion.button>
                        </div>
                      </div>

                      {/* Job Selection for Job-Specific Analysis */}
                      {analysisType === "job-specific" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{
                            opacity: 1,
                            height: "auto",
                          }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          <Label className="text-base font-semibold text-[#383e4e] dark:text-white flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-[#9F5F80]" />
                            {isRTL
                              ? "בחרו משרה להשוואה *"
                              : "Select Job for Comparison *"}
                          </Label>
                          <Select
                            value={selectedJobId}
                            onValueChange={setSelectedJobId}
                          >
                            <SelectTrigger className="bg-white dark:bg-[#383e4e]/50 border-[#b6bac5]/30 h-12">
                              <SelectValue
                                placeholder={
                                  isRTL
                                    ? jobs.length > 0
                                      ? "בחרו משרה..."
                                      : "אין משרות שמורות"
                                    : jobs.length > 0
                                      ? "Select a job..."
                                      : "No saved jobs"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {jobs.length > 0 ? (
                                jobs.map((job) => (
                                  <SelectItem
                                    key={job.id}
                                    value={String(job.id)}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {job.title}
                                      </span>
                                      <span className="text-xs text-[#6c757d]">
                                        {job.company_name}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem
                                  value="none"
                                  disabled
                                >
                                  {isRTL
                                    ? "הוסיפו משרות תחילה"
                                    : "Add jobs first"}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>

                          {selectedJob && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl p-4"
                            >
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                  <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm text-[#383e4e] dark:text-white mb-1">
                                    {isRTL
                                      ? "המסמך ינותח מול:"
                                      : "Document will be analyzed against:"}
                                  </h4>
                                  <p className="text-sm text-[#383e4e] dark:text-white">
                                    <strong>
                                      {selectedJob.title}
                                    </strong>
                                  </p>
                                  <p className="text-xs text-[#6c757d] dark:text-[#b6bac5] mt-0.5">
                                    {selectedJob.company_name}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      )}

                      {/* Analyze Button */}
                      <div className="flex justify-end gap-3 pt-6 border-t border-[#b6bac5]/20">
                        <Button
                          variant="outline"
                          onClick={onClose}
                          className="px-6"
                        >
                          {isRTL ? "ביטול" : "Cancel"}
                        </Button>
                        <Button
                          onClick={performAnalysis}
                          disabled={
                            analyzing ||
                            (analysisType === "job-specific" &&
                              !selectedJobId)
                          }
                          className="bg-gradient-to-r from-[#9F5F80] to-[#383e4e] hover:from-[#8a4e6b] hover:to-[#2d3240] text-white px-8 shadow-lg hover:shadow-xl"
                        >
                          {analyzing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {isRTL
                                ? "מנתח..."
                                : "Analyzing..."}
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              {isRTL
                                ? "התחל ניתוח"
                                : "Start Analysis"}
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Loading State */}
                  {analyzing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-16"
                    >
                      <div className="relative inline-flex mb-6">
                        <div className="absolute inset-0 bg-[#9F5F80]/20 rounded-full animate-ping" />
                        <div className="relative p-6 bg-gradient-to-br from-[#9F5F80]/20 to-[#383e4e]/20 rounded-full border-2 border-[#9F5F80]/30">
                          <Sparkles className="h-12 w-12 text-[#9F5F80] animate-pulse" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-[#383e4e] dark:text-white mb-2">
                        {isRTL
                          ? "מנתח את המסמך שלך..."
                          : "Analyzing your document..."}
                      </h3>
                      <p className="text-[#6c757d] dark:text-[#b6bac5]">
                        {isRTL
                          ? "זה ייקח רק רגע"
                          : "This will just take a moment"}
                      </p>
                    </motion.div>
                  )}

                  {/* Analysis Results */}
                  {analysis && !analyzing && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      {/* Overall Score - Hero Section */}
                      <div
                        className={`relative bg-gradient-to-br ${getScoreBg(analysis.overall_score)} border-2 border-[#9F5F80]/20 rounded-2xl p-8 text-center overflow-hidden`}
                      >
                        <div className="absolute inset-0 opacity-5">
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                              backgroundSize: "24px 24px",
                            }}
                          />
                        </div>

                        <div className="relative">
                          <div className="inline-flex p-4 bg-white dark:bg-[#383e4e] rounded-full mb-4 shadow-lg">
                            <Award
                              className={`h-8 w-8 ${getScoreColor(analysis.overall_score)}`}
                            />
                          </div>
                          <p className="text-sm font-semibold text-[#6c757d] dark:text-[#b6bac5] uppercase tracking-wider mb-3">
                            {isRTL
                              ? "ציון כולל"
                              : "Overall Score"}
                          </p>
                          <div className="relative inline-block">
                            <p
                              className={`text-7xl md:text-8xl font-bold ${getScoreColor(analysis.overall_score)}`}
                            >
                              {analysis.overall_score}
                            </p>
                            <span className="text-3xl md:text-4xl text-[#6c757d] dark:text-[#b6bac5]">
                              /100
                            </span>
                          </div>
                          <p className="mt-4 text-sm text-[#6c757d] dark:text-[#b6bac5] max-w-md mx-auto">
                            {analysis.overall_score >= 80
                              ? isRTL
                                ? "מסמך מצוין! המשיכו את העבודה הטובה"
                                : "Excellent document! Keep up the great work"
                              : analysis.overall_score >= 60
                                ? isRTL
                                  ? "מסמך טוב עם מקום לשיפור"
                                  : "Good document with room for improvement"
                                : isRTL
                                  ? "יש הרבה מקום לשיפור"
                                  : "Significant room for improvement"}
                          </p>
                        </div>
                      </div>

                      {/* Categories */}
                      {analysis.categories &&
                        analysis.categories.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-6">
                              <TrendingUp className="h-6 w-6 text-[#9F5F80]" />
                              <h3 className="text-2xl font-bold text-[#383e4e] dark:text-white">
                                {isRTL
                                  ? "פירוט קטגוריות"
                                  : "Category Breakdown"}
                              </h3>
                            </div>
                            <div className="grid gap-4">
                              {analysis.categories.map(
                                (category, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{
                                      opacity: 0,
                                      x: -20,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      x: 0,
                                    }}
                                    transition={{
                                      delay: idx * 0.1,
                                    }}
                                    className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-xl p-6 hover:border-[#9F5F80]/30 hover:shadow-lg transition-all"
                                  >
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-lg font-bold text-[#383e4e] dark:text-white">
                                        {category.name}
                                      </h4>
                                      <Badge
                                        className={`${getScoreColor(category.score)} text-base font-bold px-3 py-1`}
                                      >
                                        {category.score}/100
                                      </Badge>
                                    </div>
                                    <Progress
                                      value={category.score}
                                      className="mb-4 h-3"
                                      style={{
                                        backgroundColor:
                                          "rgba(182, 186, 197, 0.2)",
                                      }}
                                    />
                                    <p className="text-sm text-[#6c757d] dark:text-[#b6bac5] mb-4 leading-relaxed">
                                      {category.details}
                                    </p>
                                    {category.suggestions &&
                                      category.suggestions
                                        .length > 0 && (
                                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-lg p-4">
                                          <h5 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                                            <Zap className="h-4 w-4" />
                                            {isRTL
                                              ? "טיפים לשיפור"
                                              : "Improvement Tips"}
                                          </h5>
                                          <ul className="space-y-2">
                                            {category.suggestions.map(
                                              (
                                                suggestion,
                                                sIdx,
                                              ) => (
                                                <li
                                                  key={sIdx}
                                                  className="flex items-start gap-2 text-sm text-[#6c757d] dark:text-[#b6bac5]"
                                                >
                                                  <ArrowRight className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                                  <span>
                                                    {suggestion}
                                                  </span>
                                                </li>
                                              ),
                                            )}
                                          </ul>
                                        </div>
                                      )}
                                  </motion.div>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                      {/* Strengths */}
                      {analysis.strengths &&
                        analysis.strengths.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-6">
                              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                              <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {isRTL
                                  ? "נקודות חוזק"
                                  : "Key Strengths"}
                              </h3>
                            </div>
                            <div className="grid gap-3">
                              {analysis.strengths.map(
                                (strength, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{
                                      opacity: 0,
                                      x: -20,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      x: 0,
                                    }}
                                    transition={{
                                      delay: idx * 0.05,
                                    }}
                                    className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700/30 rounded-xl"
                                  >
                                    <div className="p-1 bg-green-500 rounded-full mt-0.5">
                                      <CheckCircle2 className="h-4 w-4 text-white" />
                                    </div>
                                    <span className="text-[#383e4e] dark:text-white leading-relaxed">
                                      {strength}
                                    </span>
                                  </motion.div>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                      {/* Suggestions */}
                      {analysis.suggestions &&
                        analysis.suggestions.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-6">
                              <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                {isRTL
                                  ? "הצעות לשיפור"
                                  : "Improvement Suggestions"}
                              </h3>
                            </div>
                            <div className="grid gap-3">
                              {analysis.suggestions.map(
                                (suggestion, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{
                                      opacity: 0,
                                      x: -20,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      x: 0,
                                    }}
                                    transition={{
                                      delay: idx * 0.05,
                                    }}
                                    className="flex items-start gap-3 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl"
                                  >
                                    <div className="p-1 bg-amber-500 rounded-full mt-0.5">
                                      <Zap className="h-4 w-4 text-white" />
                                    </div>
                                    <span className="text-[#383e4e] dark:text-white leading-relaxed">
                                      {suggestion}
                                    </span>
                                  </motion.div>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                      {/* Job Match Summary (job-specific only) */}
                      {analysis.job_match_summary && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {isRTL ? "התאמה למשרה" : "Job Match"}
                            </h3>
                          </div>
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700/30 rounded-xl p-5">
                            <p className="text-[#383e4e] dark:text-white leading-relaxed">
                              {analysis.job_match_summary}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Section Quality (per-section scores) */}
                      {analysis.section_quality && Object.keys(analysis.section_quality).length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-6">
                            <BarChart3 className="h-6 w-6 text-[#9F5F80]" />
                            <h3 className="text-2xl font-bold text-[#383e4e] dark:text-white">
                              {isRTL ? "איכות מדורים" : "Section Quality"}
                            </h3>
                          </div>
                          <div className="grid gap-3">
                            {Object.entries(analysis.section_quality).map(([name, section]: [string, { score: number; improvement_needed: boolean; notes?: string }], idx) => (
                              <motion.div
                                key={name}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-xl p-4 hover:border-[#9F5F80]/30 transition-all"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-[#9F5F80]" />
                                    <h4 className="font-semibold text-[#383e4e] dark:text-white">{name}</h4>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {section.improvement_needed && (
                                      <Badge variant="outline" className="text-xs border-amber-400 text-amber-600 dark:text-amber-400">
                                        {isRTL ? "דרוש שיפור" : "Needs improvement"}
                                      </Badge>
                                    )}
                                    <Badge className={`${getScoreColor(section.score)} font-bold px-2 py-0.5`}>
                                      {Math.round(section.score)}/100
                                    </Badge>
                                  </div>
                                </div>
                                <Progress
                                  value={section.score}
                                  className="h-2 mb-2"
                                  style={{ backgroundColor: "rgba(182, 186, 197, 0.2)" }}
                                />
                                {section.notes && (
                                  <p className="text-sm text-[#6c757d] dark:text-[#b6bac5] mt-2">
                                    {section.notes}
                                  </p>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Keyword Analysis (job-specific) */}
                      {analysis.keyword_analysis && (analysis.keyword_analysis.keywords_found.length > 0 || analysis.keyword_analysis.keywords_missing.length > 0) && (
                        <div>
                          <div className="flex items-center gap-2 mb-6">
                            <Search className="h-6 w-6 text-[#9F5F80]" />
                            <h3 className="text-2xl font-bold text-[#383e4e] dark:text-white">
                              {isRTL ? "ניתוח מילות מפתח" : "Keyword Analysis"}
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Keywords Found */}
                            {analysis.keyword_analysis.keywords_found.length > 0 && (
                              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-700/30 rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4" />
                                  {isRTL ? "מילות מפתח שנמצאו" : "Keywords Found"}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {analysis.keyword_analysis.keywords_found.map((kw, idx) => (
                                    <Badge key={idx} variant="outline" className="border-green-400 text-green-700 dark:text-green-300 bg-green-100/50 dark:bg-green-900/20">
                                      {kw}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Keywords Missing */}
                            {analysis.keyword_analysis.keywords_missing.length > 0 && (
                              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700/30 rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
                                  <XCircle className="h-4 w-4" />
                                  {isRTL ? "מילות מפתח חסרות" : "Keywords Missing"}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {analysis.keyword_analysis.keywords_missing.map((kw, idx) => (
                                    <Badge key={idx} variant="outline" className="border-red-400 text-red-700 dark:text-red-300 bg-red-100/50 dark:bg-red-900/20">
                                      {kw}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Missing Skills */}
                      {analysis.missing_skills && analysis.missing_skills.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <XCircle className="h-6 w-6 text-red-500 dark:text-red-400" />
                            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">
                              {isRTL ? "כישורים חסרים" : "Missing Skills"}
                            </h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {analysis.missing_skills.map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="border-red-300 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-3 py-1">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Document Stats */}
                      {(analysis.word_count || analysis.action_verb_count) && (
                        <div className="flex flex-wrap gap-4">
                          {analysis.word_count && (
                            <div className="bg-gray-50 dark:bg-[#383e4e]/30 border border-[#b6bac5]/20 rounded-lg px-4 py-2">
                              <span className="text-xs text-[#6c757d] dark:text-[#b6bac5]">{isRTL ? "מילים" : "Words"}</span>
                              <p className="text-lg font-bold text-[#383e4e] dark:text-white">{analysis.word_count}</p>
                            </div>
                          )}
                          {analysis.action_verb_count != null && (
                            <div className="bg-gray-50 dark:bg-[#383e4e]/30 border border-[#b6bac5]/20 rounded-lg px-4 py-2">
                              <span className="text-xs text-[#6c757d] dark:text-[#b6bac5]">{isRTL ? "פעלי פעולה" : "Action Verbs"}</span>
                              <p className="text-lg font-bold text-[#383e4e] dark:text-white">{analysis.action_verb_count}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-6 border-t border-[#b6bac5]/20">
                        <Button
                          variant="outline"
                          onClick={() => setAnalysis(null)}
                          className="border-[#9F5F80]/30 hover:bg-[#9F5F80]/10 hover:border-[#9F5F80]/50"
                        >
                          {isRTL ? "נתחו שוב" : "Analyze Again"}
                        </Button>
                        <Button
                          onClick={onClose}
                          className="bg-gradient-to-r from-[#9F5F80] to-[#383e4e] hover:from-[#8a4e6b] hover:to-[#2d3240] text-white shadow-lg"
                        >
                          {isRTL ? "סגור" : "Close"}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AnalysisModal;