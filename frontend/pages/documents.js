import { useMemo, useState } from "react";
import DocumentsToolbar from "../features/documents/components/DocumentsToolbar.jsx";
import DocumentCard from "../features/documents/components/DocumentCard";
import UploadModal from "../features/documents/components/UploadModal";
import AnalysisModal from "../features/documents/components/AnalysisModal";
import CoverLetterModal from "../features/documents/components/CoverLetterModal";
import JobPickerModal from "../features/documents/components/JobPickerModal";
import DocxPreviewNotice from "../features/documents/components/DocxPreviewNotice";
import { DOCUMENT_TYPES, DOCUMENT_STATUS } from "../features/documents/utils/constants";
import { getDocName } from "../features/documents/utils/helpers";
import PageContainer from "../components/layout/PageContainer";
import PageHeader from "../components/layout/PageHeader";

import useDocuments from "../features/documents/hooks/useDocuments";
import useJobs from "../features/documents/hooks/useJobs";
import useResumes from "../features/documents/hooks/useResumes";
import useAnalysis from "../features/documents/hooks/useAnalysis";
import useCoverLetter from "../features/documents/hooks/useCoverLetter";
import useToast from "../features/documents/hooks/useToast";
import LoadingOverlay from "../features/documents/components/LoadingOverlay";


export default function DocumentsView() {
  const toast = useToast();

  const [jobPickerOpen, setJobPickerOpen] = useState(false);
  const [docForJob, setDocForJob] = useState(null);

  // data
  const {
    docs,
    querying,
    query,
    setQuery,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    refresh,
    openUpload,
    setOpenUpload,
    uploading,
    uploadDocument,
    changeStatus,
    removeDocument,
    previewDoc,
    downloadDoc,
  } = useDocuments();

  const { jobs, loading: loadingJobs } = useJobs();
  const resumes = useResumes(docs);

  // analysis
  const {
    analyzing,
    analysisModalOpen,
    setAnalysisModalOpen,
    currentAnalysis,
    analyzeResume,
    analyzeResumeWithJob,
    exportWord,
    exportPDF,
  } = useAnalysis();

  // cover letter
  const {
    clOpen,
    setClOpen,
    clForm,
    setClForm,
    isGenerating,
    generated,
    setGenerated,
    generate,
    saveAsDocument,
  } = useCoverLetter({ jobs, resumes, onSaved: refresh });

  const jobsCount = jobs.length;

  const visibleDocs = useMemo(() => {
    // This array is already filtered/sorted in the hook, but we keep this
    // in case you later switch to server-side filtering.
    return docs;
  }, [docs]);

  return (
    <PageContainer>
      <PageHeader title="Documents" subtitle="Manage resumes, cover letters and exports" />
      <DocumentsToolbar
        query={query}
        onQueryChange={setQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onOpenUpload={() => setOpenUpload(true)}
        onOpenCoverLetter={() => setClOpen(true)}
      />

      {/* Notices */}
      <DocxPreviewNotice />

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
        {visibleDocs.map((d) => (
          <DocumentCard
            key={d.id}
            document={d}
            documentTypes={DOCUMENT_TYPES}
            statusOptions={DOCUMENT_STATUS}
            analyzing={analyzing && d.type === "resume"}
            jobsCount={jobsCount}
            onAnalyze={() => analyzeResume(d)}
            onAnalyzeWithJob={() => {
              if (!jobsCount) {
                toast.info("Add a job first to analyze against.");
                return;
              }
              // OPEN the picker instead of auto-picking:
              setDocForJob(d);
              setJobPickerOpen(true);
            }}
            onPreview={(doc) => previewDoc(doc)}
            onDownload={(doc) => downloadDoc(doc)}
            onDelete={async (doc) => {
              await removeDocument(doc);
              toast.success(`Deleted "${getDocName(doc)}"`);
            }}
            onChangeStatus={(id, value) => changeStatus(id, value)}
          />
        ))}
      </div>

      {/* Empty state */}
      {!querying && visibleDocs.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          No documents found. Try adjusting filters or upload a new file.
        </div>
      )}

      {/* Modals */}
      <UploadModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        onSubmit={async (form) => {
          try {
            await uploadDocument(form);
            setOpenUpload(false);
            toast.success("Upload complete");
          } catch (e) {
            toast.error(e?.message || "Upload failed");
          }
        }}
        uploading={uploading}
        documentTypes={DOCUMENT_TYPES}
        defaultType="resume"
      />

      {analysisModalOpen && (
        <AnalysisModal
          open={true}
          analysis={currentAnalysis}
          documentName={
            docs.find((d) => d.id === currentAnalysis?.document_id)?.name ||
            "Document"
          }
          onClose={() => setAnalysisModalOpen(false)}
          onExportPDF={() => exportPDF(currentAnalysis, docs.find((d) => d.id === currentAnalysis?.document_id)?.name || "Document")}
          onExportWord={exportWord}
        />
      )}

      <CoverLetterModal
        open={clOpen}
        onClose={() => setClOpen(false)}
        jobs={jobs}
        resumes={resumes}
        form={clForm}
        onChangeForm={setClForm}
        onGenerate={generate}
        isGenerating={isGenerating}
        generatedCoverLetter={generated}
        onChangeGenerated={setGenerated}
        onSave={saveAsDocument}
      />

      <JobPickerModal
        open={jobPickerOpen}
        onClose={() => {
          setJobPickerOpen(false);
          setDocForJob(null);
        }}
        jobs={jobs}
        onSelect={(job) => {
          setJobPickerOpen(false);
          if (docForJob && job?.id) {
            analyzeResumeWithJob(docForJob, { jobId: job.id });
          }
          setDocForJob(null);
        }}
        title="Analyze Resume With…"
      />

      {/* Global loading overlay while analysis runs */}
      {analyzing && !analysisModalOpen && (
        <LoadingOverlay text="Analyzing your resume…" />
      )}


    </PageContainer>
  );
}
