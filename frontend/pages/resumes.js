import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button, Card, Input, Modal } from "../components/ui";
import { useToast } from '../lib/toast';

export default function ResumesPage() {
  const [label, setLabel] = useState("");
  const [file, setFile] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const toast = useToast();

  async function load() { 
    setLoading(true);
    try {
      const response = await api.listResumes();
      // Handle both paginated response (new) and direct array (old)
      const data = response.items || response;
      setItems(data);
    } catch (err) {
      toast.error("Failed to load resumes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    if (!file) { 
      toast.error("Please choose a file");
      return; 
    }
    
    setUploading(true);
    try {
      await api.uploadResume(label || file.name, file);
      setLabel(""); 
      setFile(null);
      setShowUploadModal(false);
      await load();
      toast.success("Resume uploaded successfully!");
    } catch (err) { 
      toast.error(`Upload failed: ${err.message || err}`);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setLabel(droppedFile.name.replace(/\.[^/.]+$/, "")); // Remove extension
      setShowUploadModal(true);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 text-lg">Loading resumes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resume Manager</h1>
          <p className="text-gray-600 mt-1">Upload and organize your resume versions</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <span className="mr-2">📄</span>
          Upload Resume
        </Button>
      </div>

      {/* Upload Modal */}
      <Modal 
        isOpen={showUploadModal} 
        onClose={() => {
          setShowUploadModal(false);
          setFile(null);
          setLabel("");
        }}
        title="Upload New Resume"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={uploading} disabled={!file}>
              {uploading ? "Uploading..." : "Upload Resume"}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Resume Label"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g., Software Engineer - Tech Companies"
            helperText="Give your resume a descriptive name"
          />
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Resume File
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : file 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {file ? (
                <div className="space-y-2">
                  <div className="text-4xl">📄</div>
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFile(null)}
                    type="button"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl">📁</div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Drop your resume here or{" "}
                      <label className="text-indigo-600 hover:text-indigo-500 cursor-pointer">
                        browse files
                        <input
                          type="file"
                          className="hidden"
                          onChange={e => {
                            const selectedFile = e.target.files?.[0];
                            if (selectedFile) {
                              setFile(selectedFile);
                              setLabel(selectedFile.name.replace(/\.[^/.]+$/, ""));
                            }
                          }}
                          accept=".pdf,.docx,.doc,.txt"
                        />
                      </label>
                    </p>
                    <p className="text-sm text-gray-500">PDF, DOCX, DOC, or TXT files only</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* Resumes Grid */}
      {items.length === 0 ? (
        <Card className="text-center py-16">
          <div className="space-y-6">
            <div className="text-6xl">📄</div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">No resumes yet</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Upload your first resume to start organizing your job application materials.
              </p>
            </div>
            <Button onClick={() => setShowUploadModal(true)} size="lg">
              <span className="mr-2">📄</span>
              Upload Your First Resume
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(items) && items.map((resume, index) => (
            <Card 
              key={resume.id} 
              className="hover:shadow-lg transition-all duration-300 animate-slideIn"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-3xl mb-2">📄</div>
                    <h3 className="font-semibold text-gray-900 truncate">
                      {resume.label}
                    </h3>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span className="mr-2">📁</span>
                    <span className="truncate">{resume.file_path}</span>
                  </div>
                  {resume.created_at && (
                    <div className="flex items-center">
                      <span className="mr-2">📅</span>
                      <span>
                        {new Date(resume.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <span className="mr-1">👁️</span>
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <span className="mr-1">📥</span>
                    Download
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      {Array.isArray(items) && items.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Resume Statistics</h3>
              <p className="text-sm text-gray-600 mt-1">
                You have {Array.isArray(items) ? items.length : 0} resume{(Array.isArray(items) ? items.length : 0) !== 1 ? 's' : ''} ready for applications
              </p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </Card>
      )}
    </div>
  );
}
