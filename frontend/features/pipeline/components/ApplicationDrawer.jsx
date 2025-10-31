import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Button, Card, Select, Input } from '../../../components/ui';
import { useToast } from '../../../lib/toast';
import { api, apiFetch } from '../../../lib/api';
import { getReminders as getGoogleReminders, createReminder as createGoogleReminder } from '../../../services/googleCalendar';
import { DOC_TYPES, typeLabel, typeChipClass, ACCEPT_ATTR } from "../utils/docTypes";

export default function ApplicationDrawer({ application, onClose }) {
    const toast = useToast();
    const router = useRouter();

    // App ID (defensive across shapes)
    const appId = String(application?.id ?? application?.application_id ?? '');

    async function postAppAttachmentMultipart(file, documentType) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('document_type', documentType || 'other');
        return apiFetch(`/applications/${appId}/attachments`, { method: 'POST', body: fd });
    }

    async function postAppAttachmentFromDocument(documentId, documentType) {
        return apiFetch(`/applications/${appId}/attachments/from-document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                document_id: String(documentId),
                document_type: documentType || 'other',
            }),
        });
    }

    // Attachments
    const [attachments, setAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [attachingId, setAttachingId] = useState(null);
    const [pendingFile, setPendingFile] = useState(null);
    const [pendingType, setPendingType] = useState('resume');
    const [showTypeChooser, setShowTypeChooser] = useState(false);

    // Docs picker
    const [showDocsPicker, setShowDocsPicker] = useState(false);
    const [docs, setDocs] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(false);

    // Reminders
    const [allReminders, setAllReminders] = useState([]);
    const [showCreateReminder, setShowCreateReminder] = useState(false);
    const [creatingReminder, setCreatingReminder] = useState(false);
    const [newReminder, setNewReminder] = useState({
        title: 'Follow-up',
        type: 'Follow-up',
        due_date: '',
        add_meet_link: false,
        description: '',
    });

    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'files' | 'reminders'

    const companyName = application?.job?.company?.name || application?.job?.company_name || '';
    const jobTitle = application?.job?.title || application?.title || 'Application';
    const status = application?.status || 'Unknown';

    const [stages, setStages] = useState([]);

    const loadStages = useCallback(async () => {
        if (!appId) return setStages([]);
        try {
            const res = await apiFetch(`/applications/${appId}/stages`);
            const body = await res.json().catch(() => []);
            setStages(Array.isArray(body) ? body : []);
        } catch (e) {
            console.error('loadStages error', e);
            setStages([]);
        }
    }, [appId]);

    const deleteStage = useCallback(async (stageId) => {
        if (!appId || !stageId) return;
        const ok = window.confirm("Delete this stage from history?");
        if (!ok) return;

        try {
            const res = await apiFetch(`/applications/${appId}/stages/${stageId}`, { method: "DELETE" });
            if (!res.ok) throw new Error(await res.text());
            setStages((prev) => prev.filter((s) => String(s.id) !== String(stageId)));
            toast.success("Stage removed");
        } catch (e) {
            console.error("deleteStage error", e);
            toast.error("Failed to remove stage");
        }
    }, [appId, toast]);

    /* ------------------------------ Attachments ------------------------------ */
    const loadAttachments = useCallback(async () => {
        if (!appId) return setAttachments([]);
        try {
            const res = await apiFetch(`/applications/${appId}/attachments`);
            const body = await res.json().catch(() => null);
            const items = Array.isArray(body?.items) ? body.items : Array.isArray(body) ? body : [];
            setAttachments(items);
        } catch (e) {
            console.error('loadAttachments error', e);
            setAttachments([]);
        }
    }, [appId]);

    const handleUploadFile = async (file, chosenType) => {
        if (!appId || !file) return;
        try {
            setUploading(true);
            const res = await postAppAttachmentMultipart(file, chosenType);
            if (!res.ok) throw new Error(await res.text());
            toast.success('Attachment uploaded');
            await loadAttachments();
        } catch (e) {
            console.error('handleUploadFile error', e);
            toast.error('Upload failed');
        } finally {
            setUploading(false);
            setPendingFile(null);
            setShowTypeChooser(false);
            setPendingType('resume');
        }
    };

    const removeAttachment = async (attachmentId) => {
        if (!appId || !attachmentId) return;
        try {
            if (api.removeAttachment) {
                await api.removeAttachment(appId, attachmentId);
            } else {
                await apiFetch(`/applications/${appId}/attachments/${attachmentId}`, { method: 'DELETE' });
            }
            setAttachments((prev) => prev.filter((a) => String(a.id) !== String(attachmentId)));
            toast.success('Attachment removed');
        } catch (e) {
            console.error('removeAttachment error', e);
            toast.error('Failed to remove attachment');
        }
    };

    /* ------------------------------ Docs Picker ------------------------------ */
    const openDocsPicker = async () => {
        setShowDocsPicker(true);
        setLoadingDocs(true);
        try {
            const res = await api.getDocuments({ page: 1, page_size: 100 });
            setDocs(Array.isArray(res?.documents) ? res.documents : []);
        } catch (e) {
            console.error('openDocsPicker error', e);
            toast.error('Could not load documents');
            setDocs([]);
        } finally {
            setLoadingDocs(false);
        }
    };

    const useExistingDocument = async (docId) => {
        if (!docId || !appId) return;
        try {
            setAttachingId(docId);
            const picked = docs.find(d => String(d?.id) === String(docId));
            const chosenType = picked?.document_type || picked?.type || 'other';
            const res = await postAppAttachmentFromDocument(docId, chosenType);
            
            if (!res.ok) {
                let detail = null;
                try {
                    const json = await res.json();
                    detail = json?.detail || json?.error || JSON.stringify(json);
                } catch (e) {
                    try { detail = await res.text(); } catch { detail = null; }
                }

                if (res.status === 404) {
                    toast.error('Document missing from storage. Please re-upload the document and try again.');
                } else {
                    console.error('attachExistingDocument failed', res.status, detail);
                    toast.error('Failed to attach document');
                }
                setShowDocsPicker(false);
                return;
            }

            toast.success('Attached from Documents');
            setShowDocsPicker(false);
            await loadAttachments();
        } catch (e) {
            console.error('useExistingDocument error', e);
            toast.error('Failed to attach document');
        } finally {
            setAttachingId(null);
        }
    };

    /* -------------------------------- Reminders ------------------------------ */
    const loadReminders = useCallback(async () => {
        try {
            const list = await getGoogleReminders();
            setAllReminders(Array.isArray(list) ? list : []);
        } catch (e) {
            console.error('loadReminders error', e);
            setAllReminders([]);
        }
    }, []);

    const nextReminder = useMemo(() => {
        const id = appId;
        if (!id) return null;
        return (
            allReminders
                .filter((r) => String(r?.application_id) === id)
                .sort(
                    (a, b) =>
                        new Date(a?.due_date || a?.scheduled_at || 0) -
                        new Date(b?.due_date || b?.scheduled_at || 0)
                )[0] || null
        );
    }, [allReminders, appId]);

    const createReminderInline = async (e) => {
        e?.preventDefault?.();
        if (!appId) return;
        if (!newReminder.due_date) {
            toast.error('Pick a date & time');
            return;
        }
        try {
            setCreatingReminder(true);
            const hydratedTitle =
                newReminder.type &&
                    !newReminder.title.toLowerCase().includes(newReminder.type.toLowerCase())
                    ? `${newReminder.type}: ${newReminder.title}`
                    : newReminder.title;

            const payload = {
                application_id: appId,
                title: hydratedTitle,
                description: newReminder.description || '',
                due_date: new Date(newReminder.due_date).toISOString(),
                add_meet_link: !!newReminder.add_meet_link,
                email_notify: true,
                timezone_str: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            };

            await createGoogleReminder(payload);
            toast.success('Reminder created');
            setShowCreateReminder(false);
            setNewReminder({
                title: 'Follow-up',
                type: 'Follow-up',
                due_date: '',
                add_meet_link: false,
                description: '',
            });
            await loadReminders();
        } catch (e) {
            console.error('createReminderInline error', e);
            toast.error('Failed to create reminder');
        } finally {
            setCreatingReminder(false);
        }
    };

    /* -------------------------------- Lifecycle ------------------------------ */
    useEffect(() => {
        if (!appId) return;
        loadAttachments();
        loadReminders();
        loadStages();
    }, [appId]);

    /* --------------------------------- Render -------------------------------- */
    return (
        <div className="fixed inset-0 z-[9998] pointer-events-none" aria-modal="true" role="dialog">
            {/* Backdrop */}
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                aria-label="Close drawer backdrop"
            />

            {/* Drawer panel - WIDER */}
            <aside
                className="
                    absolute right-0 top-0 h-full
                    w-[700px] max-w-[90vw] max-h-screen
                    bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-900
                    border-l border-white/10 shadow-2xl
                    pointer-events-auto
                    animate-[slideIn_.3s_ease-out]
                "
            >
                <style jsx global>{`
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to   { transform: translateX(0);   opacity: 1; }
                    }
                `}</style>

                {/* Fixed Header */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-white/10">
                    <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 min-w-0 pr-4">
                                <h2 className="text-2xl font-bold text-white mb-1 truncate">
                                    {jobTitle}
                                </h2>
                                <p className="text-indigo-100 text-lg">{companyName || 'Unknown Company'}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="flex-shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                type="button"
                                aria-label="Close"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Quick Stats Row */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                                <div className="text-xs text-indigo-200 mb-1">Status</div>
                                <div className="text-white font-semibold truncate">{status}</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                                <div className="text-xs text-indigo-200 mb-1">Applied</div>
                                <div className="text-white font-semibold">
                                    {application?.applied_at
                                        ? new Date(application.applied_at).toLocaleDateString()
                                        : application?.created_at
                                            ? new Date(application.created_at).toLocaleDateString()
                                            : '—'}
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                                <div className="text-xs text-indigo-200 mb-1">Files</div>
                                <div className="text-white font-semibold">{attachments.length}</div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-t border-white/10">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`flex-1 px-6 py-3 text-sm font-medium transition-all ${
                                activeTab === 'overview'
                                    ? 'bg-slate-900 text-white border-b-2 border-indigo-400'
                                    : 'text-indigo-200 hover:bg-white/5'
                            }`}
                        >
                            📊 Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('files')}
                            className={`flex-1 px-6 py-3 text-sm font-medium transition-all ${
                                activeTab === 'files'
                                    ? 'bg-slate-900 text-white border-b-2 border-indigo-400'
                                    : 'text-indigo-200 hover:bg-white/5'
                            }`}
                        >
                            📎 Files {attachments.length > 0 && `(${attachments.length})`}
                        </button>
                        <button
                            onClick={() => setActiveTab('reminders')}
                            className={`flex-1 px-6 py-3 text-sm font-medium transition-all ${
                                activeTab === 'reminders'
                                    ? 'bg-slate-900 text-white border-b-2 border-indigo-400'
                                    : 'text-indigo-200 hover:bg-white/5'
                            }`}
                        >
                            🔔 Events
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto h-[calc(100%-240px)] px-6 py-6">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Timeline/Stage History */}
                            <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Application Timeline
                                </h3>

                                {stages.length === 0 ? (
                                    <div className="text-center py-8">
                                        <svg className="w-12 h-12 mx-auto text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-slate-400 text-sm">No timeline events yet</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-transparent"></div>
                                        <div className="space-y-4">
                                            {stages
                                                .slice()
                                                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                                .map((st, idx) => {
                                                    const when = new Date(st.created_at);
                                                    const whenStr = Number.isNaN(when.getTime()) ? "—" : when.toLocaleString();
                                                    return (
                                                        <div key={st.id} className="relative pl-10 group">
                                                            <div className={`absolute left-2 top-2 w-4 h-4 rounded-full border-2 ${
                                                                idx === 0 
                                                                    ? 'bg-indigo-500 border-indigo-400 ring-4 ring-indigo-500/20'
                                                                    : 'bg-slate-700 border-slate-600'
                                                            }`}></div>
                                                            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 hover:border-slate-600 transition-colors">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-white font-medium mb-1">{st.name}</div>
                                                                        <div className="text-xs text-slate-400">{whenStr}</div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => deleteStage(st.id)}
                                                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                                        title="Delete"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl p-5 border border-indigo-500/20">
                                <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => setActiveTab('files')}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                        Manage Files
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('reminders')}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                        Set Reminder
                                    </button>
                                    <button
                                        onClick={() => {
                                            const id = application?.job?.id || application?.job_id;
                                            if (!id) return toast.error('No job linked');
                                            router.push({ pathname: '/jobs', query: { job: String(id) } }, undefined, { shallow: true });
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        View Job Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FILES TAB */}
                    {activeTab === 'files' && (
                        <div className="space-y-6">
                            {/* Upload Section */}
                            <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    Add Files
                                </h3>
                                
                                <div className="flex gap-3">
                                    <label className="flex-1 flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-600 hover:border-indigo-500 rounded-lg cursor-pointer transition-colors bg-slate-900/30 hover:bg-indigo-500/5">
                                        <svg className="w-8 h-8 text-slate-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <span className="text-sm text-slate-300 font-medium">
                                            {uploading ? 'Uploading...' : 'Upload New File'}
                                        </span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept={ACCEPT_ATTR}
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (!f) return;
                                                setPendingFile(f);
                                                setPendingType('resume');
                                                setShowTypeChooser(true);
                                            }}
                                        />
                                    </label>

                                    <button
                                        onClick={openDocsPicker}
                                        className="flex-1 flex flex-col items-center justify-center h-24 border-2 border-slate-600 hover:border-purple-500 rounded-lg transition-colors bg-slate-900/30 hover:bg-purple-500/5"
                                    >
                                        <svg className="w-8 h-8 text-slate-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="text-sm text-slate-300 font-medium">From Library</span>
                                    </button>
                                </div>

                                {/* Type Chooser */}
                                {showTypeChooser && pendingFile && (
                                    <div className="mt-4 p-4 rounded-lg bg-slate-900/60 border border-slate-700">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-slate-200 font-medium">Choose file type</span>
                                            <button onClick={() => { setShowTypeChooser(false); setPendingFile(null); }} className="text-slate-400 hover:text-white">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <select
                                                value={pendingType}
                                                onChange={(e) => setPendingType(e.target.value)}
                                                className="flex-1 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 px-3 py-2"
                                            >
                                                {DOC_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
                                            </select>
                                            <Button onClick={() => handleUploadFile(pendingFile, pendingType)} disabled={uploading} className="bg-indigo-600 hover:bg-indigo-700">
                                                {uploading ? 'Uploading...' : 'Upload'}
                                            </Button>
                                        </div>
                                        <div className="text-xs text-slate-400 truncate">{pendingFile.name}</div>
                                    </div>
                                )}
                            </div>

                            {/* Files List */}
                            <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-lg font-semibold text-white mb-4">Your Files</h3>
                                
                                {attachments.length === 0 ? (
                                    <div className="text-center py-12">
                                        <svg className="w-16 h-16 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-slate-400 mb-1">No files attached yet</p>
                                        <p className="text-sm text-slate-500">Upload your resume, cover letter, or other documents</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {attachments.map((att) => {
                                            const dtype = att?.document_type || 'other';
                                            const filename = att?.filename || att?.name || 'Untitled';
                                            const id = att?.id;
                                            return (
                                                <div
                                                    key={id ?? filename}
                                                    className="group flex items-center gap-3 p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-900/70 transition-all"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                                                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-white font-medium truncate mb-1">{filename}</div>
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${typeChipClass(dtype)}`}>
                                                            {typeLabel(dtype)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {id && (
                                                            <a
                                                                href={`/api/applications/${appId}/attachments/${id}/download`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
                                                            >
                                                                Open
                                                            </a>
                                                        )}
                                                        {id && (
                                                            <button
                                                                onClick={() => removeAttachment(id)}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                                title="Remove"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Documents Picker Modal */}
                            {showDocsPicker && (
                                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                                    <div className="w-full max-w-2xl bg-slate-900 rounded-xl border border-slate-700 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
                                        <div className="p-6 border-b border-slate-700">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xl font-semibold text-white">Choose from Library</h3>
                                                <button onClick={() => setShowDocsPicker(false)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-6">
                                            {loadingDocs ? (
                                                <div className="flex items-center justify-center h-48">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                        <span className="text-slate-400">Loading documents...</span>
                                                    </div>
                                                </div>
                                            ) : docs.length === 0 ? (
                                                <div className="text-center py-12">
                                                    <svg className="w-16 h-16 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <p className="text-slate-400">No documents in your library</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {docs.map((d) => {
                                                        const dname = d?.name || d?.filename || 'Untitled';
                                                        const isAttaching = attachingId === d?.id;
                                                        return (
                                                            <button
                                                                key={d?.id ?? dname}
                                                                onClick={() => useExistingDocument(d?.id)}
                                                                disabled={isAttaching}
                                                                className="w-full flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all text-left disabled:opacity-50"
                                                            >
                                                                <span className="text-slate-200 truncate">{dname}</span>
                                                                <span className="ml-3 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium">
                                                                    {isAttaching ? 'Attaching...' : 'Attach'}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* REMINDERS TAB */}
                    {activeTab === 'reminders' && (
                        <div className="space-y-6">
                            {/* Upcoming Reminder */}
                            {nextReminder && !showCreateReminder && (
                                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-5 border border-amber-500/20">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-amber-200 mb-1">Next Event</div>
                                            <div className="text-white font-semibold mb-1">{nextReminder.title || nextReminder.name}</div>
                                            <div className="text-sm text-amber-300">
                                                {(() => {
                                                    const d = new Date(nextReminder.due_date || nextReminder.scheduled_at || 0);
                                                    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
                                                })()}
                                            </div>
                                        </div>
                                        <a href="/reminders" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors">
                                            View All
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Create Reminder */}
                            <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {showCreateReminder ? 'New Event' : 'Calendar Events'}
                                    </h3>
                                    {!showCreateReminder && (
                                        <Button onClick={() => setShowCreateReminder(true)} className="bg-indigo-600 hover:bg-indigo-700">
                                            Add Event
                                        </Button>
                                    )}
                                </div>

                                {!showCreateReminder && !nextReminder && (
                                    <div className="text-center py-12">
                                        <svg className="w-16 h-16 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                        <p className="text-slate-400 mb-1">No events scheduled</p>
                                        <p className="text-sm text-slate-500">Create a reminder for interviews, follow-ups, or deadlines</p>
                                    </div>
                                )}

                                {showCreateReminder && (
                                    <form className="space-y-4" onSubmit={createReminderInline}>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                                                <Select
                                                    value={newReminder.type}
                                                    onChange={(e) => setNewReminder((r) => ({ ...r, type: e.target.value }))}
                                                    className="w-full"
                                                >
                                                    <option value="Follow-up">Follow-up</option>
                                                    <option value="Interview">Interview</option>
                                                    <option value="Deadline">Deadline</option>
                                                    <option value="Custom">Custom</option>
                                                </Select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                                                <Input
                                                    value={newReminder.title}
                                                    onChange={(e) => setNewReminder((r) => ({ ...r, title: e.target.value }))}
                                                    placeholder="Event title"
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Date & Time</label>
                                            <Input
                                                type="datetime-local"
                                                value={newReminder.due_date}
                                                onChange={(e) => setNewReminder((r) => ({ ...r, due_date: e.target.value }))}
                                                className="w-full"
                                            />
                                        </div>

                                        <div>
                                            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!!newReminder.add_meet_link}
                                                    onChange={(e) => setNewReminder((r) => ({ ...r, add_meet_link: e.target.checked }))}
                                                    className="w-4 h-4 rounded border-slate-600 text-indigo-600"
                                                />
                                                Create Google Meet link
                                            </label>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                                            <textarea
                                                rows={3}
                                                className="w-full rounded-lg bg-slate-900/50 border border-slate-700 text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Add any notes or details..."
                                                value={newReminder.description}
                                                onChange={(e) => setNewReminder((r) => ({ ...r, description: e.target.value }))}
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <Button variant="outline" onClick={() => setShowCreateReminder(false)} type="button" className="flex-1">
                                                Cancel
                                            </Button>
                                            <Button disabled={creatingReminder} type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                                                {creatingReminder ? 'Creating...' : 'Create Event'}
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}
