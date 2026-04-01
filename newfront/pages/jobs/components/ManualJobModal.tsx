/**
 * ManualJobModal Component - Premium Redesign
 * Form to manually add or edit a job
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Loader2, Sparkles, Briefcase, Building2, MapPin, Globe } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { jobsApi, type JobPayload, type Job } from '../../../features/jobs/api';
import { toast } from 'sonner';
import { logger } from '../../../lib/logger';

interface ManualJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editJob?: Job | null;
  isRTL?: boolean;
}

const REMOTE_TYPES = [
  { value: 'remote', label: { en: 'Remote', he: 'עבודה מרחוק' }, icon: '🏠' },
  { value: 'hybrid', label: { en: 'Hybrid', he: 'היברידי' }, icon: '🔄' },
  { value: 'onsite', label: { en: 'On-site', he: 'במשרד' }, icon: '🏢' },
];

const JOB_TYPES = [
  { value: 'Full-time', label: { en: 'Full-time', he: 'משרה מלאה' } },
  { value: 'Part-time', label: { en: 'Part-time', he: 'משרה חלקית' } },
  { value: 'Contract', label: { en: 'Contract', he: 'חוזה' } },
  { value: 'Internship', label: { en: 'Internship', he: 'התמחות' } },
];

export function ManualJobModal({ isOpen, onClose, onSuccess, editJob = null, isRTL = false }: ManualJobModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<JobPayload>({
    title: '',
    company_name: '',
    location: '',
    description: '',
    requirements: [],
    skills: [],
    remote_type: '',
    job_type: '',
    source_url: '',
  });

  const [skillInput, setSkillInput] = useState('');
  const [requirementInput, setRequirementInput] = useState('');

  // Load job data when editing
  useEffect(() => {
    if (editJob) {
      setFormData({
        title: editJob.title || '',
        company_name: editJob.company_name || '',
        location: editJob.location || '',
        description: editJob.description || '',
        requirements: editJob.requirements || [],
        skills: editJob.skills || [],
        remote_type: editJob.remote_type || '',
        job_type: editJob.job_type || '',
        source_url: editJob.source_url || '',
      });
    } else {
      // Reset form when not editing
      setFormData({
        title: '',
        company_name: '',
        location: '',
        description: '',
        requirements: [],
        skills: [],
        remote_type: '',
        job_type: '',
        source_url: '',
      });
    }
  }, [editJob, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.company_name) {
      toast.error(
        isRTL
          ? 'נא למלא שם משרה ושם חברה'
          : 'Please fill in job title and company name'
      );
      return;
    }

    setLoading(true);

    try {
      if (editJob) {
        // Update existing job
        await jobsApi.updateJob(editJob.id as number, formData);
        toast.success(isRTL ? 'משרה עודכנה בהצלחה' : 'Job updated successfully');
      } else {
        // Create new job
        await jobsApi.createManualJob(formData);
        toast.success(isRTL ? 'משרה נוצרה בהצלחה' : 'Job created successfully');
      }
      onSuccess();
      // Reset form
      setFormData({
        title: '',
        company_name: '',
        location: '',
        description: '',
        requirements: [],
        skills: [],
        remote_type: '',
        job_type: '',
        source_url: '',
      });
      setSkillInput('');
      setRequirementInput('');
    } catch (error) {
      logger.error(`Failed to ${editJob ? 'update' : 'create'} job:`, error);
      toast.error(
        isRTL
          ? editJob
            ? 'שגיאה בעדכון משרה'
            : 'שגיאה ביצירת משרה'
          : editJob
          ? 'Failed to update job'
          : 'Failed to create job'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = () => {
    if (skillInput.trim()) {
      setFormData({
        ...formData,
        skills: [...(formData.skills || []), skillInput.trim()],
      });
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (index: number) => {
    setFormData({
      ...formData,
      skills: formData.skills?.filter((_, i) => i !== index) || [],
    });
  };

  const handleAddRequirement = () => {
    if (requirementInput.trim()) {
      setFormData({
        ...formData,
        requirements: [...(formData.requirements || []), requirementInput.trim()],
      });
      setRequirementInput('');
    }
  };

  const handleRemoveRequirement = (index: number) => {
    setFormData({
      ...formData,
      requirements: formData.requirements?.filter((_, i) => i !== index) || [],
    });
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleRequirementKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddRequirement();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="bg-white dark:bg-[#2a2f3d] rounded-3xl shadow-2xl max-w-3xl w-full h-[90vh] flex flex-col overflow-hidden border border-[#b6bac5]/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Premium Header */}
              <div
                className="relative bg-gradient-to-br from-[#9F5F80] via-[#8a5472] to-[#383e4e] p-8 text-white flex-shrink-0"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
                
                <button
                  onClick={onClose}
                  className={`absolute ${isRTL ? 'left-6' : 'right-6'} top-6 text-white/70 hover:text-white transition-all hover:rotate-90 duration-300 z-20`}
                >
                  <X className="h-6 w-6" />
                </button>

                <div className={`relative z-10 flex items-start gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                  <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-sm flex-shrink-0">
                    {editJob ? (
                      <Sparkles className="h-7 w-7" />
                    ) : (
                      <Briefcase className="h-7 w-7" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className={`text-3xl font-bold mb-2 ${isRTL ? 'text-right' : ''}`}>
                      {editJob
                        ? isRTL ? 'ערוך משרה' : 'Edit Job'
                        : isRTL ? 'הוסף משרה חדשה' : 'Add New Job'}
                    </h2>
                    <p className={`text-white/90 text-lg ${isRTL ? 'text-right' : ''}`}>
                      {editJob
                        ? isRTL ? 'עדכן את פרטי המשרה' : 'Update job details'
                        : isRTL ? 'מלא את פרטי המשרה שברצונך לעקוב אחריה' : 'Fill in the details of the job you want to track'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Content Area */}
              <ScrollArea className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} id="job-form">
                  <div className="p-8 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
                    {/* Job Title */}
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-base flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-[#9F5F80]" />
                        {isRTL ? 'שם המשרה' : 'Job Title'} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder={isRTL ? 'לדוגמה: מפתח Full Stack' : 'e.g. Full Stack Developer'}
                        required
                        className="h-12 text-base border-2 focus:border-[#9F5F80]"
                      />
                    </div>

                    {/* Company Name */}
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[#9F5F80]" />
                        {isRTL ? 'שם החברה' : 'Company Name'} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="company"
                        value={formData.company_name}
                        onChange={(e) =>
                          setFormData({ ...formData, company_name: e.target.value })
                        }
                        placeholder={isRTL ? 'לדוגמה: Google' : 'e.g. Google'}
                        required
                        className="h-12 text-base border-2 focus:border-[#9F5F80]"
                      />
                    </div>

                    {/* Location & Remote Type Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Location */}
                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-base flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#9F5F80]" />
                          {isRTL ? 'מיקום' : 'Location'}
                        </Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder={isRTL ? 'לדוגמה: תל אביב, ישראל' : 'e.g. Tel Aviv, Israel'}
                          className="h-12 text-base border-2 focus:border-[#9F5F80]"
                        />
                      </div>

                      {/* Remote Type */}
                      <div className={`space-y-2 ${isRTL ? 'rtl-select-wrapper' : ''}`}>
                        <Label htmlFor="remote-type" className="text-base">
                          {isRTL ? 'סוג עבודה' : 'Work Type'}
                        </Label>
                        <Select
                          value={formData.remote_type}
                          onValueChange={(value) =>
                            setFormData({ ...formData, remote_type: value })
                          }
                        >
                          <SelectTrigger id="remote-type" className="h-12 text-base border-2 focus:border-[#9F5F80]">
                            <SelectValue placeholder={isRTL ? 'בחר...' : 'Select...'} />
                          </SelectTrigger>
                          <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
                            {REMOTE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value} className="text-base">
                                {type.icon} {isRTL ? type.label.he : type.label.en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Job Type & Source URL Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Job Type */}
                      <div className={`space-y-2 ${isRTL ? 'rtl-select-wrapper' : ''}`}>
                        <Label htmlFor="job-type" className="text-base">
                          {isRTL ? 'סוג משרה' : 'Job Type'}
                        </Label>
                        <Select
                          value={formData.job_type}
                          onValueChange={(value) => setFormData({ ...formData, job_type: value })}
                        >
                          <SelectTrigger id="job-type" className="h-12 text-base border-2 focus:border-[#9F5F80]">
                            <SelectValue placeholder={isRTL ? 'בחר...' : 'Select...'} />
                          </SelectTrigger>
                          <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
                            {JOB_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value} className="text-base">
                                {isRTL ? type.label.he : type.label.en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Source URL */}
                      <div className="space-y-2">
                        <Label htmlFor="source-url" className="text-base flex items-center gap-2">
                          <Globe className="h-4 w-4 text-[#9F5F80]" />
                          {isRTL ? 'קישור למשרה' : 'Job URL'}
                        </Label>
                        <Input
                          id="source-url"
                          type="url"
                          value={formData.source_url}
                          onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                          placeholder="https://"
                          className="h-12 text-base border-2 focus:border-[#9F5F80]"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-base">
                        {isRTL ? 'תיאור המשרה' : 'Job Description'}
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder={
                          isRTL
                            ? 'תאר את המשרה, התפקיד והאחריות...'
                            : 'Describe the job, role, and responsibilities...'
                        }
                        rows={5}
                        className="text-base border-2 focus:border-[#9F5F80] resize-none"
                      />
                    </div>

                    {/* Requirements */}
                    <div className="space-y-3">
                      <Label htmlFor="requirements" className="text-base">
                        {isRTL ? 'דרישות המשרה' : 'Job Requirements'}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="requirements"
                          value={requirementInput}
                          onChange={(e) => setRequirementInput(e.target.value)}
                          onKeyDown={handleRequirementKeyDown}
                          placeholder={isRTL ? 'הוסף דרישה ולחץ Enter' : 'Add requirement and press Enter'}
                          className="h-11 text-base border-2 focus:border-[#9F5F80]"
                        />
                        <Button 
                          type="button" 
                          onClick={handleAddRequirement} 
                          variant="outline" 
                          className="h-11 px-4 border-2 hover:border-[#9F5F80] hover:bg-[#9F5F80]/5 flex-shrink-0"
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                      {formData.requirements && formData.requirements.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-4 bg-[#383e4e]/5 dark:bg-[#383e4e]/10 rounded-xl border-2 border-[#383e4e]/10">
                          {formData.requirements.map((requirement, idx) => (
                            <motion.span
                              key={idx}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="px-4 py-2 bg-white dark:bg-[#383e4e] text-[#383e4e] dark:text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm border border-[#b6bac5]/20"
                            >
                              {requirement}
                              <button
                                type="button"
                                onClick={() => handleRemoveRequirement(idx)}
                                className="hover:text-red-600 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </motion.span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    <div className="space-y-3">
                      <Label htmlFor="skills" className="text-base">
                        {isRTL ? 'כישורים נדרשים' : 'Required Skills'}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="skills"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={handleSkillKeyDown}
                          placeholder={isRTL ? 'הוסף כישור ולחץ Enter' : 'Add skill and press Enter'}
                          className="h-11 text-base border-2 focus:border-[#9F5F80]"
                        />
                        <Button 
                          type="button" 
                          onClick={handleAddSkill} 
                          variant="outline"
                          className="h-11 px-4 border-2 hover:border-[#9F5F80] hover:bg-[#9F5F80]/5 flex-shrink-0"
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                      {formData.skills && formData.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-4 bg-[#9F5F80]/5 dark:bg-[#9F5F80]/10 rounded-xl border-2 border-[#9F5F80]/10">
                          {formData.skills.map((skill, idx) => (
                            <motion.span
                              key={idx}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="px-4 py-2 bg-gradient-to-r from-[#9F5F80] to-[#8a5472] text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-md"
                            >
                              {skill}
                              <button
                                type="button"
                                onClick={() => handleRemoveSkill(idx)}
                                className="hover:bg-white/20 rounded transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </motion.span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Extra bottom padding for scroll */}
                    <div className="h-24" />
                  </div>
                </form>
              </ScrollArea>

              {/* Footer Actions - Fixed at bottom */}
              <div
                className="flex-shrink-0 p-6 bg-gradient-to-r from-gray-50 to-white dark:from-[#383e4e]/30 dark:to-[#2a2f3d] border-t-2 border-[#b6bac5]/10 flex gap-4"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose} 
                  className="flex-1 h-12 text-base border-2 hover:bg-gray-50"
                >
                  {isRTL ? 'ביטול' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  form="job-form"
                  disabled={loading}
                  className="flex-1 h-12 text-base bg-gradient-to-r from-[#9F5F80] to-[#8a5472] hover:from-[#8a5472] hover:to-[#7a4a63] shadow-lg hover:shadow-xl transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      {isRTL ? 'שומר...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      {editJob ? <Sparkles className="h-5 w-5 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
                      {editJob 
                        ? isRTL ? 'עדכן משרה' : 'Update Job'
                        : isRTL ? 'הוסף משרה' : 'Add Job'}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ManualJobModal;