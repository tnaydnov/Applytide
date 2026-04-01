/**
 * CoverLetterGeneratorModal Component - Premium Redesign
 * Beautiful AI-powered cover letter generator
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Sparkles,
  Loader2,
  Download,
  FileText,
  Briefcase,
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
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
} from "../../../features/documents/api";
import { jobsApi, type Job } from "../../../features/jobs/api";
import { toast } from "sonner";
import { logger } from "../../../lib/logger";
interface CoverLetterGeneratorModalProps {  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isRTL?: boolean;
}

type CoverLetterLength = "short" | "medium" | "long";
type Step = "configure" | "generating" | "result";

export function CoverLetterGeneratorModal({
  isOpen,
  onClose,
  onSuccess,
  isRTL = false,
}: CoverLetterGeneratorModalProps) {
  const [step, setStep] = useState<Step>("configure");
  const [, setGenerating] = useState(false);
  const [resumes, setResumes] = useState<Document[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [length, setLength] =
    useState<CoverLetterLength>("medium");
  const [tone, setTone] = useState<
    "professional" | "enthusiastic" | "confident" | "creative"
  >("professional");
  const [generatedContent, setGeneratedContent] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadResumes();
      loadJobs();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setStep("configure");
    setSelectedResumeId("");
    setSelectedJobId("");
    setLength("medium");
    setTone("professional");
    setGeneratedContent("");
  };

  const loadResumes = async () => {
    try {
      const data = await documentsApi.listDocuments({
        type: "resume",
        status: "active",
      });
      setResumes(data.documents || []);
    } catch (error) {
      logger.error("Failed to load resumes:", error);
    }
  };

  const loadJobs = async () => {
    try {
      const data = await jobsApi.listJobs({ page_size: 100 });
      setJobs(data.items || []);
    } catch (error) {
      logger.error("Failed to load jobs:", error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedResumeId) {
      toast.error(
        isRTL
          ? "נא לבחור קורות חיים"
          : "Please select a resume",
      );
      return;
    }

    if (!selectedJobId) {
      toast.error(
        isRTL
          ? "נא לבחור משרה שמורה"
          : "Please select a saved job",
      );
      return;
    }

    setStep("generating");
    setGenerating(true);

    try {
      const result = await documentsApi.generateCoverLetter({
        job_id: selectedJobId,
        resume_id: selectedResumeId,
        tone,
        length,
      });

      // generateCoverLetter() always returns a string
      const content = result;

      setGeneratedContent(content);
      setStep("result");
      toast.success(
        isRTL
          ? "מכתב נוצר בהצלחה!"
          : "Cover letter generated successfully!",
      );
    } catch (error) {
      logger.error('Cover letter generation error:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(
        isRTL
          ? "שגיאה ביצירת מכתב"
          : `Failed to generate cover letter: ${msg}`,
      );
      setStep("configure");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    const text = typeof generatedContent === 'string' ? generatedContent : String(generatedContent || '');
    navigator.clipboard.writeText(text);
    toast.success(
      isRTL ? "הועתק ללוח!" : "Copied to clipboard!",
    );
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const text = typeof generatedContent === 'string' ? generatedContent : String(generatedContent || '');
    if (!text.trim()) return;
    setSaving(true);
    try {
      const selectedJob = jobs.find((j) => String(j.id) === selectedJobId);
      const fileName = selectedJob
        ? `Cover Letter - ${selectedJob.company_name || ''} - ${selectedJob.title || ''}.txt`
        : 'Cover Letter.txt';

      const blob = new Blob([text], { type: 'text/plain' });
      const file = new File([blob], fileName, { type: 'text/plain' });

      await documentsApi.uploadDocument(file, 'cover_letter', fileName);

      toast.success(
        isRTL
          ? "מכתב נשמר בהצלחה!"
          : "Cover letter saved successfully!",
      );
      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Failed to save cover letter:', error);
      toast.error(
        isRTL
          ? "שגיאה בשמירת מכתב"
          : "Failed to save cover letter",
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedJob = jobs.find(
    (job) => String(job.id) === selectedJobId,
  );

  const lengthOptions = [
    {
      value: "short",
      label: isRTL ? "קצר" : "Short",
      desc: isRTL ? "~200 מילים" : "~200 words",
      icon: Zap,
    },
    {
      value: "medium",
      label: isRTL ? "בינוני" : "Medium",
      desc: isRTL ? "~350 מילים" : "~350 words",
      icon: FileText,
    },
    {
      value: "long",
      label: isRTL ? "ארוך" : "Long",
      desc: isRTL ? "~500 מילים" : "~500 words",
      icon: Briefcase,
    },
  ];

  const toneOptions = [
    {
      value: "professional",
      label: isRTL ? "מקצועי" : "Professional",
      color: "#3b82f6",
    },
    {
      value: "enthusiastic",
      label: isRTL ? "נלהב" : "Enthusiastic",
      color: "#f59e0b",
    },
    {
      value: "confident",
      label: isRTL ? "בטוח" : "Confident",
      color: "#10b981",
    },
    {
      value: "creative",
      label: isRTL ? "יצירתי" : "Creative",
      color: "#8b5cf6",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[90]"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-[91] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
              }}
              className="bg-white dark:bg-[#2d3240] rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-[#b6bac5]/20 flex flex-col"
              onClick={(e) => e.stopPropagation()}
              dir={isRTL ? "rtl" : "ltr"}
            >
              {/* Premium Header */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#9F5F80] via-[#7d4a66] to-[#383e4e] p-6 md:p-8 flex-shrink-0">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#9F5F80]/20 rounded-full blur-2xl" />

                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-3 md:gap-4">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        delay: 0.2,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="p-3 md:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20"
                    >
                      <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    </motion.div>
                    <div>
                      <h2 className="text-xl md:text-3xl font-bold text-white mb-1">
                        {isRTL
                          ? "מחולל מכתבים נלווים ב-AI"
                          : "AI Cover Letter Generator"}
                      </h2>
                      <p className="text-white/80 text-xs md:text-sm">
                        {isRTL
                          ? "צרו מכתב מותאם אישית במספר שניות"
                          : "Create a personalized cover letter in seconds"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-white/80 hover:text-white hover:bg-white/10 flex-shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Progress Steps */}
                <div className="relative mt-6 md:mt-8 flex items-center justify-center gap-2">
                  {["configure", "generating", "result"].map(
                    (s, idx) => (
                      <React.Fragment key={s}>
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className={`
                            w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300
                            ${
                              step === s ||
                              (s === "configure" &&
                                step !== "configure") ||
                              (s === "generating" &&
                                step === "result")
                                ? "bg-white text-[#9F5F80] shadow-lg scale-110"
                                : "bg-white/20 text-white/60"
                            }`}
                          >
                            {s === "configure" && (
                              <FileText className="h-4 w-4 md:h-5 md:w-5" />
                            )}
                            {s === "generating" &&
                              (step === "generating" ? (
                                <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                              ))}
                            {s === "result" && (
                              <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
                            )}
                          </div>
                          <span className="text-xs text-white/80 font-medium hidden sm:block">
                            {s === "configure" &&
                              (isRTL ? "הגדרות" : "Configure")}
                            {s === "generating" &&
                              (isRTL ? "מייצר" : "Generating")}
                            {s === "result" &&
                              (isRTL ? "תוצאה" : "Result")}
                          </span>
                        </div>
                        {idx < 2 && (
                          <div
                            className={`w-12 md:w-16 h-0.5 ${step === "result" || (step === "generating" && idx === 0) ? "bg-white" : "bg-white/20"}`}
                          />
                        )}
                      </React.Fragment>
                    ),
                  )}
                </div>
              </div>

              {/* Content */}
              <div
                className="flex-1 overflow-y-auto overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div className="p-4 md:p-8">
                  <AnimatePresence mode="wait">
                    {/* Configure Step */}
                    {step === "configure" && (
                      <motion.div
                        key="configure"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                      >
                        {/* Resume Selection */}
                        <div className="space-y-3">
                          <Label className="text-[#383e4e] dark:text-white font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#9F5F80]" />
                            {isRTL
                              ? "בחרו קורות חיים *"
                              : "Select Resume *"}
                          </Label>
                          <Select
                            value={selectedResumeId}
                            onValueChange={setSelectedResumeId}
                          >
                            <SelectTrigger className="h-12 bg-gray-50 dark:bg-[#383e4e]/50 border-[#b6bac5]/30 hover:border-[#9F5F80] transition-colors">
                              <SelectValue
                                placeholder={
                                  isRTL
                                    ? resumes.length > 0
                                      ? "בחרו קורות חיים..."
                                      : "אין קורות חיים זמינו"
                                    : resumes.length > 0
                                      ? "Select resume..."
                                      : "No resumes available"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {resumes.length > 0 ? (
                                resumes.map((resume) => (
                                  <SelectItem
                                    key={resume.id}
                                    value={String(resume.id)}
                                  >
                                    {resume.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem
                                  value="none"
                                  disabled
                                >
                                  {isRTL
                                    ? "העלו קורות חיים תחילה"
                                    : "Upload a resume first"}
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Job Selection */}
                        <div className="space-y-3">
                          <Label className="text-[#383e4e] dark:text-white font-semibold flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-[#9F5F80]" />
                            {isRTL
                              ? "בחרו משרה שמורה *"
                              : "Select Saved Job *"}
                          </Label>
                          <Select
                            value={selectedJobId}
                            onValueChange={setSelectedJobId}
                          >
                            <SelectTrigger className="h-12 bg-gray-50 dark:bg-[#383e4e]/50 border-[#b6bac5]/30 hover:border-[#9F5F80] transition-colors">
                              <SelectValue
                                placeholder={
                                  isRTL
                                    ? jobs.length > 0
                                      ? "בחרו משרה שמורה..."
                                      : "אין משרות שמורות"
                                    : jobs.length > 0
                                      ? "Select a saved job..."
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
                                    {job.title} -{" "}
                                    {job.company_name}
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
                          {jobs.length === 0 && (
                            <motion.div
                              initial={{
                                opacity: 0,
                                height: 0,
                              }}
                              animate={{
                                opacity: 1,
                                height: "auto",
                              }}
                              className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg"
                            >
                              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-amber-800 dark:text-amber-200">
                                {isRTL
                                  ? "עליכם להוסיף משרות למערכת תחילה כדי ליצור מכתבים נלווים מותאמים"
                                  : "You need to add jobs to the system first to generate tailored cover letters"}
                              </p>
                            </motion.div>
                          )}
                        </div>

                        {/* Selected Job Preview */}
                        {selectedJob && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-[#383e4e] dark:text-white mb-2">
                                  {selectedJob.title}
                                </h4>
                                <div className="space-y-1 text-sm text-[#6c757d] dark:text-[#b6bac5]">
                                  <p>
                                    <strong>
                                      {isRTL
                                        ? "חברה:"
                                        : "Company:"}
                                    </strong>{" "}
                                    {selectedJob.company_name}
                                  </p>
                                  {selectedJob.location && (
                                    <p>
                                      <strong>
                                        {isRTL
                                          ? "מיקום:"
                                          : "Location:"}
                                      </strong>{" "}
                                      {selectedJob.location}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Length Selection */}
                        <div className="space-y-3">
                          <Label className="text-[#383e4e] dark:text-white font-semibold">
                            {isRTL
                              ? "אורך המכתב"
                              : "Letter Length"}
                          </Label>
                          <div className="grid grid-cols-3 gap-3">
                            {lengthOptions.map((option) => (
                              <button
                                key={option.value}
                                onClick={() =>
                                  setLength(
                                    option.value as CoverLetterLength,
                                  )
                                }
                                className={`
                                  p-4 rounded-xl border-2 transition-all duration-200 text-center
                                  ${
                                    length === option.value
                                      ? "border-[#9F5F80] bg-[#9F5F80]/10 shadow-md"
                                      : "border-[#b6bac5]/30 hover:border-[#9F5F80]/50 bg-gray-50 dark:bg-[#383e4e]/30"
                                  }
                                `}
                              >
                                <option.icon
                                  className={`h-5 w-5 mx-auto mb-2 ${length === option.value ? "text-[#9F5F80]" : "text-[#6c757d]"}`}
                                />
                                <div className="font-semibold text-sm text-[#383e4e] dark:text-white">
                                  {option.label}
                                </div>
                                <div className="text-xs text-[#6c757d] dark:text-[#b6bac5] mt-1">
                                  {option.desc}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tone Selection */}
                        <div className="space-y-3">
                          <Label className="text-[#383e4e] dark:text-white font-semibold">
                            {isRTL
                              ? "טון הכתיבה"
                              : "Writing Tone"}
                          </Label>
                          <div className="grid grid-cols-3 gap-3">
                            {toneOptions.map((option) => (
                              <button
                                key={option.value}
                                onClick={() =>
                                  setTone(
                                    option.value as typeof tone,
                                  )
                                }
                                className={`
                                  p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-end
                                  ${
                                    tone === option.value
                                      ? "border-[#9F5F80] bg-[#9F5F80]/10 shadow-md"
                                      : "border-[#b6bac5]/30 hover:border-[#9F5F80]/50 bg-gray-50 dark:bg-[#383e4e]/30"
                                  }
                                `}
                              >
                                <div
                                  className="w-3 h-3 rounded-full mb-2 mr-auto"
                                  style={{
                                    backgroundColor:
                                      option.color,
                                  }}
                                />
                                <div className="font-semibold text-sm text-[#383e4e] dark:text-white w-full text-right">
                                  {option.label}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Generate Button */}
                        <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#b6bac5]/20">
                          <Button
                            variant="outline"
                            onClick={onClose}
                            size="lg"
                            className="min-w-[120px]"
                          >
                            {isRTL ? "ביטול" : "Cancel"}
                          </Button>
                          <Button
                            onClick={handleGenerate}
                            disabled={
                              !selectedResumeId ||
                              !selectedJobId
                            }
                            size="lg"
                            className="min-w-[180px] bg-gradient-to-r from-[#9F5F80] to-[#383e4e] hover:from-[#8a4e6b] hover:to-[#2d3240] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            <Sparkles className="h-5 w-5 mr-2" />
                            {isRTL
                              ? "צור מכתב"
                              : "Generate Letter"}
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {/* Generating Step */}
                    {step === "generating" && (
                      <motion.div
                        key="generating"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-20 text-center"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="inline-flex p-6 bg-gradient-to-br from-[#9F5F80]/20 to-[#383e4e]/20 rounded-full mb-6"
                        >
                          <Sparkles className="h-16 w-16 text-[#9F5F80]" />
                        </motion.div>
                        <h3 className="text-2xl font-bold text-[#383e4e] dark:text-white mb-3">
                          {isRTL
                            ? "מייצר את המכתב שלך..."
                            : "Generating your letter..."}
                        </h3>
                        <p className="text-[#6c757d] dark:text-[#b6bac5]">
                          {isRTL
                            ? "נא להמתין, זה לוקח רק כמה שניות"
                            : "Please wait, this will only take a few seconds"}
                        </p>
                      </motion.div>
                    )}

                    {/* Result Step */}
                    {step === "result" && (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-[#383e4e] dark:text-white font-semibold flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                              {isRTL
                                ? "מכתב שנוצר"
                                : "Generated Cover Letter"}
                            </Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCopy}
                              className="border-[#9F5F80] text-[#9F5F80] hover:bg-[#9F5F80] hover:text-white"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              {isRTL ? "העתק" : "Copy"}
                            </Button>
                          </div>
                          <Textarea
                            value={generatedContent}
                            onChange={(e) =>
                              setGeneratedContent(
                                e.target.value,
                              )
                            }
                            className="min-h-[400px] bg-gray-50 dark:bg-[#383e4e]/50 border-[#b6bac5]/30 focus:border-[#9F5F80] font-mono text-sm"
                            placeholder={
                              isRTL
                                ? "תוכן המכתב יופיע כאן..."
                                : "Letter content will appear here..."
                            }
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-6 border-t border-[#b6bac5]/20">
                          <Button
                            variant="outline"
                            onClick={resetForm}
                            size="lg"
                            className="min-w-[160px]"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {isRTL
                              ? "צור מכתב חדש"
                              : "New Letter"}
                          </Button>
                          <Button
                            onClick={handleSave}
                            disabled={saving}
                            size="lg"
                            className="min-w-[160px] bg-gradient-to-r from-[#9F5F80] to-[#383e4e] hover:from-[#8a4e6b] hover:to-[#2d3240] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            <Download className="h-5 w-5 mr-2" />
                            {saving
                              ? (isRTL ? "שומר..." : "Saving...")
                              : (isRTL ? "שמור מכתב" : "Save Letter")}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CoverLetterGeneratorModal;