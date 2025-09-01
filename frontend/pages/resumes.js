import { useEffect, useState, useRef } from "react";
import { api } from "../lib/api";
import { Button, Card, Input } from "../components/ui";
import { useToast } from '../lib/toast';

export default function ResumesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [setAsDefaultChecked, setSetAsDefaultChecked] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const fileInputRef = useRef(null);
  const toast = useToast();

  async function load() { 
    setLoading(true);
    try {
      const response = await api.listResumes();
      const data = response.items || response;
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load resumes");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) { 
      toast.error("Please choose a file");
      return; 
    }
    
    setUploading(true);
    try {
      await api.uploadResume(selectedFile.name, selectedFile, setAsDefaultChecked);
      setSelectedFile(null);
      setSetAsDefaultChecked(false);
      setShowUploadModal(false);
      await load();
      toast.success("Resume uploaded successfully!");
    } catch (err) { 
      toast.error(`Upload failed: ${err.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  const deleteResume = async (id) => {
    if (!confirm("Are you sure you want to delete this resume?")) return;
    
    try {
      await api.deleteResume(id);
      await load();
      toast.success("Resume deleted successfully!");
    } catch (err) {
      toast.error(`Delete failed: ${err.message || err}`);
    }
  };

  const setAsDefault = async (id) => {
    try {
      await api.setDefaultResume(id);
      await load();
      toast.success("Default resume updated!");
    } catch (err) {
      toast.error(`Failed to set default: ${err.message || err}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileType = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'PDF';
      case 'doc':
      case 'docx': return 'Word Document';
      case 'txt': return 'Text File';
      default: return 'Document';
    }
  };

  // Filter and sort resumes
  const filteredResumes = items.filter(resume => 
    resume.filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resume.label?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedResumes = [...filteredResumes].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.filename || '').localeCompare(b.filename || '');
      case 'size':
        return (b.file_size || 0) - (a.file_size || 0);
      case 'created_at':
      default:
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    }
  });

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
          <p className="text-gray-600 mt-1">Upload, organize, and manage your resume versions</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            <span className="mr-2">📁</span>
            Upload Resume
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{items.length}</div>
            <div className="text-sm text-blue-600">Total Resumes</div>
          </div>
        </Card>
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {items.filter(r => r.is_default).length || 1}
            </div>
            <div className="text-sm text-green-600">Default Resume</div>
          </div>
        </Card>
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(items.reduce((sum, r) => sum + (r.file_size || 0), 0) / 1024)} KB
            </div>
            <div className="text-sm text-purple-600">Total Size</div>
          </div>
        </Card>
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {items.filter(r => new Date(r.created_at) > new Date(Date.now() - 7*24*60*60*1000)).length}
            </div>
            <div className="text-sm text-orange-600">Recent Uploads</div>
          </div>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Input
                placeholder="Search resumes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="created_at">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">
            Showing {sortedResumes.length} of {items.length} resumes
          </div>
        </div>
      </Card>

      {/* Resume Grid */}
      {items.length === 0 ? (
        <Card className="text-center py-16">
          <div className="space-y-4">
            <div className="text-6xl">📄</div>
            <h3 className="text-xl font-semibold text-gray-900">No resumes yet</h3>
            <p className="text-gray-600">Upload your first resume to get started</p>
            <Button 
              onClick={() => setShowUploadModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Upload Resume
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedResumes.map((resume) => (
            <Card key={resume.id} className={`hover:shadow-lg transition-shadow duration-300 ${resume.is_default ? 'ring-2 ring-green-500 bg-green-50' : ''}`}>
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">{resume.filename}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatFileSize(resume.file_size)} • {getFileType(resume.filename)}
                    </p>
                  </div>
                  {resume.is_default && (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                      Default
                    </span>
                  )}
                </div>

                {/* Metadata */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span className="mr-2">📅</span>
                    Uploaded {new Date(resume.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">🔗</span>
                    <a 
                      href={resume.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 truncate"
                    >
                      View original file
                    </a>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(resume.file_url, '_blank')}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      Preview
                    </Button>
                    {!resume.is_default && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAsDefault(resume.id)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        Set Default
                      </Button>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteResume(resume.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Upload Resume</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Resume File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <div className="text-4xl">📁</div>
                    <p className="text-sm text-gray-600">
                      Click to select or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, DOC, or DOCX files only
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4"
                    variant="outline"
                  >
                    Choose File
                  </Button>
                </div>
                
                {selectedFile && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-600">{formatFileSize(selectedFile.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Set as Default */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="setAsDefault"
                  checked={setAsDefaultChecked}
                  onChange={(e) => setSetAsDefaultChecked(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="setAsDefault" className="ml-2 text-sm text-gray-700">
                  Set as default resume
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    'Upload Resume'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
