import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { Button } from "../components/ui";
import PageContainer from "../components/layout/PageContainer";
import { 
  FaSearch, 
  FaClipboardList, 
  FaFileAlt, 
  FaBell, 
  FaChartLine, 
  FaTrophy,
  FaChrome,
  FaRobot,
  FaCheck,
  FaArrowRight,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaDownload,
  FaUpload,
  FaCalendar,
  FaFilter,
  FaSortAmountDown,
  FaCog,
  FaMagic,
  FaLinkedin,
  FaGoogle,
  FaPaperPlane,
  FaColumns,
  FaTh,
  FaStar,
  FaLink,
  FaExclamationTriangle,
  FaCheckCircle,
  FaMousePointer,
  FaKeyboard
} from "react-icons/fa";

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedFeature, setExpandedFeature] = useState(null);

  // Mark that user has seen this page (to hide NEW badge)
  useEffect(() => {
    localStorage.setItem('hasSeenHowItWorks', 'true');
    // Dispatch custom event to update badge immediately
    window.dispatchEvent(new Event('howItWorksVisited'));
  }, []);

  return (
    <>
      <Head>
        <title>How It Works - Complete Guide | Applytide</title>
        <meta name="description" content="Master Applytide - Complete guide to every feature, button, and workflow. Learn the optimal order to use each tool for maximum job search success." />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-4000"></div>
        </div>

        <PageContainer>
          {/* Epic Hero Section */}
          <div className="relative text-center mb-20 animate-fade-in-up">
            <div className="inline-block mb-6">
              <span className="px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-full text-indigo-300 text-sm font-semibold">
                🎓 Complete Guide
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                Master Your Job Search
              </span>
              <br />
              <span className="text-slate-300">Like a Pro</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-300 max-w-4xl mx-auto mb-8 leading-relaxed">
              Every feature explained. Every button documented. Every workflow optimized.
              <br />
              <span className="text-indigo-400 font-semibold">This is your complete guide to Applytide.</span>
            </p>
            
            <div className="flex gap-4 justify-center flex-wrap mb-12">
              <Link href="/login">
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all">
                  Start Your Journey →
                </Button>
              </Link>
              <a href="#getting-started">
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-4 text-lg font-semibold">
                  Jump to Guide ↓
                </Button>
              </a>
            </div>

            {/* Quick Navigation Tabs */}
            <div className="flex gap-2 justify-center flex-wrap">
              {[
                { id: 'overview', label: '📋 Overview' },
                { id: 'chrome', label: '🔌 Chrome Extension' },
                { id: 'jobs', label: '💼 Jobs Page' },
                { id: 'pipeline', label: '🎯 Pipeline' },
                { id: 'documents', label: '📄 Documents' },
                { id: 'reminders', label: '⏰ Reminders' },
                { id: 'analytics', label: '📊 Analytics' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    document.getElementById(tab.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Understanding Section - CRITICAL */}
          <div id="overview" className="mb-24 scroll-mt-24">
            <SectionHeader 
              icon={<FaExclamationTriangle />}
              title="First Things First: What is Applytide?"
              subtitle="Understanding this is crucial before you start"
            />
            
            <div className="glass-card glass-violet p-8 md:p-12 mb-8 border-2 border-amber-500/30">
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-red-400 flex items-center gap-3">
                    <span className="text-3xl">❌</span> Applytide is NOT
                  </h3>
                  <div className="space-y-4">
                    <NotItem text="A job board (like LinkedIn or Indeed)" />
                    <NotItem text="An auto-apply bot that applies for you" />
                    <NotItem text="A replacement for job search sites" />
                    <NotItem text="A place to find new job postings" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-green-400 flex items-center gap-3">
                    <span className="text-3xl">✅</span> Applytide IS
                  </h3>
                  <div className="space-y-4">
                    <IsItem text="A tracking system for YOUR applications" />
                    <IsItem text="A tool you use AFTER you apply manually" />
                    <IsItem text="Your personal job search command center" />
                    <IsItem text="A way to stay organized during your search" />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 rounded-xl border-2 border-indigo-500/30">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">💡</div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">The Perfect Analogy:</h4>
                    <p className="text-slate-200 text-lg leading-relaxed">
                      <strong className="text-indigo-300">LinkedIn/Indeed</strong> = Your car (takes you to jobs)<br />
                      <strong className="text-purple-300">Applytide</strong> = Your GPS & trip log (tracks where you've been)
                    </p>
                    <p className="text-slate-300 mt-3">
                      You still drive the car yourself (apply manually), but Applytide keeps perfect records 
                      of every trip, reminds you when to follow up, and shows you patterns in your journey.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* The Complete Workflow */}
          <div id="getting-started" className="mb-24 scroll-mt-24">
            <SectionHeader 
              icon={<FaArrowRight />}
              title="The Optimal Workflow"
              subtitle="Follow this order for maximum effectiveness"
            />

            <WorkflowTimeline />
          </div>

          {/* CHROME EXTENSION - Detailed Guide */}
          <div id="chrome" className="mb-24 scroll-mt-24">
            <SectionHeader 
              icon={<FaChrome />}
              title="Chrome Extension: Your Job Collector"
              subtitle="Save jobs in seconds from any website"
            />

            <FeatureExplainer
              title="What It Does"
              description="Captures job postings from LinkedIn, Indeed, Glassdoor, or ANY website and saves them to your Jobs page"
              color="blue"
            >
              <DetailedSteps steps={[
                {
                  title: "Install the Extension",
                  description: "Add Applytide extension from Chrome Web Store",
                  icon: <FaChrome />
                },
                {
                  title: "Navigate to a Job Posting",
                  description: "Go to LinkedIn, Indeed, or any job board and open a job",
                  icon: <FaMousePointer />
                },
                {
                  title: "Click the Extension Icon",
                  description: "Click the Applytide icon in your browser toolbar",
                  icon: <FaMousePointer />
                },
                {
                  title: "Auto-Extract or Paste",
                  description: "Extension automatically extracts job details OR you can paste the job description manually",
                  icon: <FaMagic />
                }
              ]} />

              <div className="mt-6 p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                <p className="text-amber-200 font-semibold flex items-center gap-2">
                  <FaExclamationTriangle /> Important: This does NOT apply to the job for you!
                </p>
                <p className="text-slate-300 mt-2">
                  It only saves the job details so you can track it AFTER you apply manually on the actual site.
                </p>
              </div>
            </FeatureExplainer>
          </div>

          {/* JOBS PAGE - Complete Guide */}
          <div id="jobs" className="mb-24 scroll-mt-24">
            <SectionHeader 
              icon={<FaSearch />}
              title="Jobs Page: Your Opportunity Hub"
              subtitle="Where all saved jobs live - before you apply"
            />

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <PageFeature
                icon={<FaPlus />}
                title="Add New Job (Manual)"
                color="indigo"
                buttons={[
                  { label: "Create Job Manually", description: "Opens form to add job details by hand" }
                ]}
                useCase="When you find a job that the extension can't capture, or you want to add it directly"
              />

              <PageFeature
                icon={<FaFilter />}
                title="Search & Filter"
                color="purple"
                buttons={[
                  { label: "Search bar", description: "Search by title, company, or keywords" },
                  { label: "Sort dropdown", description: "Sort by date, company, salary, etc." },
                  { label: "Location filter", description: "Filter by city or remote" },
                  { label: "Clear Filters", description: "Reset all filters" }
                ]}
                useCase="When you need to find a specific job in your list"
              />

              <PageFeature
                icon={<FaEye />}
                title="View Job Details"
                color="cyan"
                buttons={[
                  { label: "Click any job card", description: "Opens detailed modal with full description" },
                  { label: "Edit button", description: "Modify job details" },
                  { label: "Delete button", description: "Remove job from your list" }
                ]}
                useCase="When you want to review the full job description before applying"
              />

              <PageFeature
                icon={<FaPaperPlane />}
                title="Apply to Job"
                color="emerald"
                buttons={[
                  { label: "Apply button", description: "Opens application modal" }
                ]}
                useCase="AFTER you've applied to the job in real life - this logs it in Applytide"
                important={true}
              />
            </div>

            <DetailedWorkflow
              title="Complete Jobs Page Workflow"
              steps={[
                {
                  step: "1",
                  action: "Save jobs using Chrome extension or manual entry",
                  result: "Jobs appear on this page"
                },
                {
                  step: "2",
                  action: "Browse and review saved jobs",
                  result: "Read descriptions, compare opportunities"
                },
                {
                  step: "3",
                  action: "When ready, go to actual site (LinkedIn/company website)",
                  result: "Apply on THEIR website (not in Applytide)"
                },
                {
                  step: "4",
                  action: "Come back to Applytide and click 'Apply' button",
                  result: "Opens modal to log your application"
                },
                {
                  step: "5",
                  action: "Select documents to attach (optional)",
                  result: "Links your resume/cover letter to this application"
                },
                {
                  step: "6",
                  action: "Select source (LinkedIn, Indeed, etc.)",
                  result: "Helps you track which platforms work best"
                },
                {
                  step: "7",
                  action: "Click 'Create Application'",
                  result: "Application moves to Pipeline page"
                }
              ]}
            />
          </div>

          {/* PIPELINE PAGE - The Heart of Applytide */}
          <div id="pipeline" className="mb-24 scroll-mt-24">
            <SectionHeader 
              icon={<FaColumns />}
              title="Pipeline: Track Your Application Journey"
              subtitle="The most important page - where you update application status"
            />

            <div className="glass-card glass-rose p-6 mb-8 border-2 border-rose-500/30">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🎯</div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">This is Where the Magic Happens</h3>
                  <p className="text-slate-300 text-lg">
                    This page is YOUR responsibility to keep updated. Every time something happens with your 
                    real-world applications (interview scheduled, rejection received, offer made), you come 
                    here and update the status. Think of it as your personal CRM for job hunting.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <PageFeature
                icon={<FaColumns />}
                title="Board View vs Cards View"
                color="indigo"
                buttons={[
                  { label: "Board button", description: "Kanban-style columns (Applied → Interview → Offer)" },
                  { label: "Cards button", description: "Grid layout showing all applications" }
                ]}
                useCase="Choose your preferred visualization style"
              />

              <PageFeature
                icon={<FaEdit />}
                title="Update Application Status"
                color="purple"
                buttons={[
                  { label: "Drag & drop (Board view)", description: "Drag cards between columns" },
                  { label: "Status dropdown", description: "Change status manually" }
                ]}
                useCase="When your application moves to next stage (interview, rejection, etc.)"
                important={true}
              />

              <PageFeature
                icon={<FaCog />}
                title="Customize Pipeline"
                color="cyan"
                buttons={[
                  { label: "Customize Pipeline", description: "Add/remove/reorder stages" }
                ]}
                useCase="Personalize stages to match your workflow"
              />

              <PageFeature
                icon={<FaFilter />}
                title="Search & Filter Applications"
                color="amber"
                buttons={[
                  { label: "Search bar", description: "Find applications by company/title" },
                  { label: "Filter dropdown", description: "Show only recent, specific status, etc." },
                  { label: "Sort dropdown", description: "Sort by date or company" },
                  { label: "Show Archived checkbox", description: "Include archived applications" }
                ]}
                useCase="Find specific applications quickly"
              />

              <PageFeature
                icon={<FaEye />}
                title="Application Drawer"
                color="emerald"
                buttons={[
                  { label: "Click any application card", description: "Opens detailed side panel" }
                ]}
                useCase="View full details, attached documents, notes, and timeline"
              />

              <PageFeature
                icon={<FaBell />}
                title="Application Actions"
                color="rose"
                buttons={[
                  { label: "Add Reminder", description: "Set follow-up reminders" },
                  { label: "Attach Documents", description: "Link resumes/cover letters" },
                  { label: "Add Notes", description: "Track interview feedback" },
                  { label: "Archive", description: "Hide from main view" },
                  { label: "Delete", description: "Permanently remove" }
                ]}
                useCase="Manage individual applications"
              />
            </div>

            <DetailedWorkflow
              title="Daily Pipeline Workflow"
              steps={[
                {
                  step: "Morning",
                  action: "Check Pipeline for today's reminders",
                  result: "See which applications need follow-up"
                },
                {
                  step: "Email Check",
                  action: "Got an interview email? Update status to 'Interview'",
                  result: "Application moves to interview column"
                },
                {
                  step: "Set Reminder",
                  action: "Click application → Add Reminder → Set interview date/time",
                  result: "You'll get notified before interview"
                },
                {
                  step: "Got Rejection?",
                  action: "Update status to 'Rejected'",
                  result: "Tracks rejection rate in analytics"
                },
                {
                  step: "Follow-up Time",
                  action: "If no response after 1 week, add note about follow-up",
                  result: "Keep track of communication"
                },
                {
                  step: "Offer Received!",
                  action: "Update status to 'Offer'",
                  result: "Celebration time! 🎉"
                }
              ]}
            />
          </div>

          {/* DOCUMENTS PAGE */}
          <div id="documents" className="mb-24 scroll-mt-24">
            <SectionHeader 
              icon={<FaFileAlt />}
              title="Documents: Optimize Before You Apply"
              subtitle="Analyze resumes, generate cover letters, store everything"
            />

            <div className="glass-card glass-amber p-6 mb-8 border-2 border-amber-500/30">
              <div className="flex items-start gap-4">
                <div className="text-4xl">⚡</div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Pro Tip: Use This BEFORE Applying</h3>
                  <p className="text-slate-300 text-lg">
                    Upload your resume here first, analyze it against specific jobs, generate tailored cover 
                    letters, then download and use them when applying on the actual job sites.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <PageFeature
                icon={<FaUpload />}
                title="Upload Document"
                color="indigo"
                buttons={[
                  { label: "Upload Document", description: "Opens upload modal" }
                ]}
                useCase="Add resumes, cover letters, portfolios, certificates"
              />

              <PageFeature
                icon={<FaRobot />}
                title="AI Resume Analysis"
                color="purple"
                buttons={[
                  { label: "Analyze", description: "AI checks ATS compatibility, formatting, keywords" },
                  { label: "Analyze with Job", description: "Compare resume to specific job description" }
                ]}
                useCase="Before applying - see how well your resume matches the job"
                important={true}
              />

              <PageFeature
                icon={<FaMagic />}
                title="Generate Cover Letter"
                color="cyan"
                buttons={[
                  { label: "Generate Cover Letter", description: "Opens AI cover letter generator" }
                ]}
                useCase="Create tailored cover letters for specific jobs"
                important={true}
              />

              <PageFeature
                icon={<FaDownload />}
                title="Document Actions"
                color="emerald"
                buttons={[
                  { label: "Preview", description: "View document in browser" },
                  { label: "Download", description: "Download to your computer" },
                  { label: "Delete", description: "Remove document" },
                  { label: "Change Status", description: "Mark as Active, Draft, or Archived" }
                ]}
                useCase="Manage your document library"
              />
            </div>

            <DetailedWorkflow
              title="Complete Documents Workflow"
              steps={[
                {
                  step: "1",
                  action: "Upload your master resume",
                  result: "Resume stored in Documents page"
                },
                {
                  step: "2",
                  action: "Find an interesting job on Jobs page",
                  result: "Note the job ID or details"
                },
                {
                  step: "3",
                  action: "Go to Documents → Click 'Analyze with Job'",
                  result: "AI analyzes match percentage and gives improvement tips"
                },
                {
                  step: "4",
                  action: "Update resume based on feedback (externally)",
                  result: "Better ATS compatibility"
                },
                {
                  step: "5",
                  action: "Click 'Generate Cover Letter' → Select job + resume",
                  result: "AI writes tailored cover letter"
                },
                {
                  step: "6",
                  action: "Edit generated cover letter → Save as Document",
                  result: "Cover letter saved for future use"
                },
                {
                  step: "7",
                  action: "Download both resume and cover letter",
                  result: "Use them when applying on actual job site"
                },
                {
                  step: "8",
                  action: "After applying, go to Jobs page → Click Apply → Attach these documents",
                  result: "Application logged with linked documents"
                }
              ]}
            />
          </div>

          {/* REMINDERS PAGE */}
          <div id="reminders" className="mb-24 scroll-mt-24">
            <SectionHeader 
              icon={<FaBell />}
              title="Reminders: Never Miss a Follow-up"
              subtitle="Track deadlines, interviews, follow-ups"
            />

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <PageFeature
                icon={<FaPlus />}
                title="Create Reminder"
                color="indigo"
                buttons={[
                  { label: "New Reminder", description: "Opens reminder creation modal" }
                ]}
                useCase="Set reminders for interviews, follow-ups, deadlines"
              />

              <PageFeature
                icon={<FaCalendar />}
                title="Calendar View"
                color="purple"
                buttons={[
                  { label: "My Reminders tab", description: "List view of all reminders" },
                  { label: "Calendar tab", description: "Month/Week/Day calendar view" },
                  { label: "Import tab", description: "Import events from Google Calendar" }
                ]}
                useCase="Visualize your schedule"
              />

              <PageFeature
                icon={<FaGoogle />}
                title="Google Calendar Sync"
                color="cyan"
                buttons={[
                  { label: "Connect Google Calendar", description: "Link your Google account (in Profile)" },
                  { label: "Import Events", description: "Pull interview invites from Gmail" }
                ]}
                useCase="Sync interview invites automatically"
              />

              <PageFeature
                icon={<FaFilter />}
                title="Filter & Sort"
                color="amber"
                buttons={[
                  { label: "Filter dropdown", description: "Show upcoming, overdue, completed" },
                  { label: "Sort dropdown", description: "Sort by date, priority, etc." }
                ]}
                useCase="Focus on what matters now"
              />
            </div>

            <DetailedWorkflow
              title="Reminders Workflow"
              steps={[
                {
                  step: "1",
                  action: "Create application in Pipeline",
                  result: "Application logged"
                },
                {
                  step: "2",
                  action: "Click application → Add Reminder → Set 'Follow up in 7 days'",
                  result: "Reminder created"
                },
                {
                  step: "3",
                  action: "Got interview email? Update application status",
                  result: "Status changes to Interview"
                },
                {
                  step: "4",
                  action: "Add another reminder for interview date",
                  result: "Get notified day before"
                },
                {
                  step: "5",
                  action: "Check Reminders page daily",
                  result: "See what's due today"
                },
                {
                  step: "6",
                  action: "Mark reminders as completed after taking action",
                  result: "Stay organized"
                }
              ]}
            />
          </div>

          {/* ANALYTICS PAGE */}
          <div id="analytics" className="mb-24 scroll-mt-24">
            <SectionHeader 
              icon={<FaChartLine />}
              title="Analytics: Track Your Progress"
              subtitle="Available after you have application data"
            />

            <div className="glass-card glass-emerald p-6 mb-8 border-2 border-emerald-500/30">
              <div className="flex items-start gap-4">
                <div className="text-4xl">📊</div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">This Comes Later</h3>
                  <p className="text-slate-300 text-lg">
                    After you've used Applytide for a while (tracked 10+ applications), come here to see 
                    patterns: response rates, best application sources, success metrics, and trends over time.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <PageFeature
                icon={<FaChartLine />}
                title="Overview Tab"
                color="indigo"
                buttons={[]}
                useCase="See total applications, response rate, interview rate, offers"
              />

              <PageFeature
                icon={<FaTh />}
                title="Applications Tab"
                color="purple"
                buttons={[]}
                useCase="Applications over time, status distribution, funnel analysis"
              />

              <PageFeature
                icon={<FaStar />}
                title="Sources Tab"
                color="cyan"
                buttons={[]}
                useCase="Which job boards give you best results"
              />

              <PageFeature
                icon={<FaChartLine />}
                title="Timeline Tab"
                color="emerald"
                buttons={[]}
                useCase="See application journey from submission to offer"
              />
            </div>
          </div>

          {/* PRO TIPS Section */}
          <div className="mb-24">
            <SectionHeader 
              icon={<FaTrophy />}
              title="Pro Tips for Success"
              subtitle="Advanced strategies from power users"
            />

            <div className="grid md:grid-cols-2 gap-6">
              <ProTip
                title="Daily Routine"
                icon={<FaCalendar />}
                tips={[
                  "Morning: Check Pipeline for today's reminders",
                  "Apply to 2-3 jobs, log them immediately",
                  "Evening: Update statuses from emails received",
                  "Weekly: Analyze which sources work best"
                ]}
              />

              <ProTip
                title="Document Strategy"
                icon={<FaFileAlt />}
                tips={[
                  "Keep 2-3 versions of your resume",
                  "Analyze BEFORE applying to each job",
                  "Generate unique cover letter for each",
                  "Download and use externally"
                ]}
              />

              <ProTip
                title="Pipeline Management"
                icon={<FaColumns />}
                tips={[
                  "Update status same day you get responses",
                  "Add detailed notes after interviews",
                  "Set follow-up reminders for 1 week out",
                  "Archive rejections monthly"
                ]}
              />

              <ProTip
                title="Chrome Extension"
                icon={<FaChrome />}
                tips={[
                  "Save every interesting job immediately",
                  "Review weekly, delete not interested",
                  "Paste full description for better analysis",
                  "Use it on ANY job board, not just LinkedIn"
                ]}
              />
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-24">
            <SectionHeader 
              icon={<FaCheckCircle />}
              title="Common Questions"
              subtitle="Quick answers to what users ask most"
            />

            <div className="space-y-4">
              <FAQItem
                question="Do I need to apply through Applytide?"
                answer="NO! Applytide does NOT apply for you. You still apply manually on LinkedIn/Indeed/company websites. Applytide is only for TRACKING those applications after you submit them."
              />
              
              <FAQItem
                question="What's the difference between Jobs page and Pipeline page?"
                answer="Jobs page = Jobs you've SAVED but haven't applied to yet. Pipeline page = Jobs you HAVE applied to and are actively tracking. Think: Jobs = Wishlist, Pipeline = Active Deals."
              />
              
              <FAQItem
                question="When should I use the Documents page?"
                answer="BEFORE applying. Upload your resume, analyze it against specific jobs, generate cover letters, then download them to use when applying on actual job sites."
              />
              
              <FAQItem
                question="How often should I update my Pipeline?"
                answer="Daily is best! Every time you get an email (interview invite, rejection, etc.), come to Pipeline and update that application's status. Also check daily for follow-up reminders."
              />
              
              <FAQItem
                question="What if the Chrome extension doesn't work on a site?"
                answer="Use the manual paste option in the extension, or go to Jobs page and click 'Create Job Manually' to add it by hand."
              />
              
              <FAQItem
                question="Can I use this without the Chrome extension?"
                answer="Yes! You can manually add jobs on the Jobs page. The extension just makes it faster."
              />
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center py-16 glass-card bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border-2 border-indigo-500/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5"></div>
            <div className="relative z-10">
              <div className="text-6xl mb-6">🚀</div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Ready to Get Organized?
              </h2>
              <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                You now know exactly how every feature works. Time to put it into action!
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Link href="/login">
                  <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-10 py-4 text-xl font-bold shadow-2xl hover:shadow-indigo-500/50 transform hover:scale-105 transition-all">
                    Start Your Journey →
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 px-10 py-4 text-xl font-semibold">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </PageContainer>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }

        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .scroll-mt-24 {
          scroll-margin-top: 6rem;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}

// Helper Components
function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="text-center mb-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mb-4 text-2xl">
        {icon}
      </div>
      <h2 className="text-4xl md:text-5xl font-bold text-white mb-3">{title}</h2>
      <p className="text-xl text-slate-400">{subtitle}</p>
    </div>
  );
}

function NotItem({ text }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-red-900/10 border border-red-500/20 rounded-lg">
      <div className="text-red-400 mt-1">❌</div>
      <p className="text-slate-300">{text}</p>
    </div>
  );
}

function IsItem({ text }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-green-900/10 border border-green-500/20 rounded-lg">
      <FaCheck className="text-green-400 mt-1 flex-shrink-0" />
      <p className="text-slate-300">{text}</p>
    </div>
  );
}

function WorkflowTimeline() {
  const steps = [
    {
      num: "1",
      title: "Install Chrome Extension",
      desc: "Add it to your browser (one time setup)",
      color: "indigo"
    },
    {
      num: "2",
      title: "Save Jobs",
      desc: "Browse job sites, save interesting roles",
      color: "purple"
    },
    {
      num: "3", 
      title: "Optimize Documents",
      desc: "Upload resume, analyze fit, generate cover letters",
      color: "cyan"
    },
    {
      num: "4",
      title: "Apply Externally",
      desc: "Go to actual job site and apply there (not in Applytide!)",
      color: "amber"
    },
    {
      num: "5",
      title: "Log Application",
      desc: "Return to Applytide, mark job as 'Applied'",
      color: "emerald"
    },
    {
      num: "6",
      title: "Update Pipeline",
      desc: "As things happen (interviews, rejections), update status daily",
      color: "rose"
    },
    {
      num: "7",
      title: "Track Analytics",
      desc: "After 10+ applications, check analytics for insights",
      color: "violet"
    }
  ];

  const colorMap = {
    indigo: "from-indigo-500 to-indigo-600",
    purple: "from-purple-500 to-purple-600",
    cyan: "from-cyan-500 to-cyan-600",
    amber: "from-amber-500 to-amber-600",
    emerald: "from-emerald-500 to-emerald-600",
    rose: "from-rose-500 to-rose-600",
    violet: "from-violet-500 to-violet-600"
  };

  return (
    <div className="relative">
      {steps.map((step, idx) => (
        <div key={step.num} className="flex items-start gap-6 mb-8">
          <div className={`flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-r ${colorMap[step.color]} flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
            {step.num}
          </div>
          <div className="flex-1 glass-card bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-white/10 p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
            <p className="text-slate-300">{step.desc}</p>
          </div>
          {idx < steps.length - 1 && (
            <div className="absolute left-8 top-20 w-0.5 h-8 bg-gradient-to-b from-white/20 to-transparent"></div>
          )}
        </div>
      ))}
    </div>
  );
}

function FeatureExplainer({ title, description, color, children }) {
  const colorMap = {
    blue: "border-blue-500/30 bg-blue-900/10",
    purple: "border-purple-500/30 bg-purple-900/10",
    indigo: "border-indigo-500/30 bg-indigo-900/10",
    cyan: "border-cyan-500/30 bg-cyan-900/10",
    amber: "border-amber-500/30 bg-amber-900/10",
    emerald: "border-emerald-500/30 bg-emerald-900/10",
  };

  return (
    <div className={`glass-card ${colorMap[color]} border-2 p-8 rounded-xl mb-8`}>
      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-300 text-lg mb-6">{description}</p>
      {children}
    </div>
  );
}

function DetailedSteps({ steps }) {
  return (
    <div className="space-y-4">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-lg border border-white/5">
          <div className="flex-shrink-0 w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
            {step.icon}
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1">{step.title}</h4>
            <p className="text-slate-400 text-sm">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PageFeature({ icon, title, color, buttons, useCase, important }) {
  const colorMap = {
    indigo: { border: "border-indigo-500/30", bg: "bg-indigo-900/10", text: "text-indigo-400" },
    purple: { border: "border-purple-500/30", bg: "bg-purple-900/10", text: "text-purple-400" },
    cyan: { border: "border-cyan-500/30", bg: "bg-cyan-900/10", text: "text-cyan-400" },
    amber: { border: "border-amber-500/30", bg: "bg-amber-900/10", text: "text-amber-400" },
    emerald: { border: "border-emerald-500/30", bg: "bg-emerald-900/10", text: "text-emerald-400" },
    rose: { border: "border-rose-500/30", bg: "bg-rose-900/10", text: "text-rose-400" },
  };

  const colors = colorMap[color];

  return (
    <div className={`glass-card ${colors.border} ${colors.bg} border-2 p-6 rounded-xl ${important ? 'ring-2 ring-yellow-500/30' : ''}`}>
      {important && (
        <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-300 text-sm font-semibold">
          <FaStar /> KEY FEATURE
        </div>
      )}
      
      <div className="flex items-center gap-3 mb-4">
        <div className={`text-2xl ${colors.text}`}>{icon}</div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>

      {buttons && buttons.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-sm font-semibold text-slate-400 mb-2">Available buttons/actions:</p>
          {buttons.map((btn, idx) => (
            <div key={idx} className="flex items-start gap-2 pl-4 border-l-2 border-white/10">
              <FaMousePointer className="text-slate-500 mt-1 flex-shrink-0 text-xs" />
              <div>
                <span className="font-mono text-sm text-indigo-300">{btn.label}</span>
                <p className="text-slate-400 text-sm">{btn.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 bg-slate-800/50 rounded-lg border border-white/5">
        <p className="text-sm font-semibold text-slate-300 mb-1">💡 Use Case:</p>
        <p className="text-slate-400 text-sm">{useCase}</p>
      </div>
    </div>
  );
}

function DetailedWorkflow({ title, steps }) {
  return (
    <div className="glass-card glass-violet border-2 border-purple-500/30 p-8 rounded-xl">
      <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <FaKeyboard className="text-purple-400" />
        {title}
      </h3>
      
      <div className="space-y-3">
        {steps.map((item, idx) => (
          <div key={idx} className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-lg border border-white/5 hover:border-purple-500/30 transition-all">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold text-sm">
              {item.step}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white mb-1">{item.action}</p>
              <p className="text-slate-400 text-sm flex items-center gap-2">
                <FaArrowRight className="text-purple-400" />
                {item.result}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProTip({ title, icon, tips }) {
  return (
    <div className="glass-card bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 p-6 rounded-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl text-indigo-400">{icon}</div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>
      <ul className="space-y-3">
        {tips.map((tip, idx) => (
          <li key={idx} className="flex items-start gap-3 text-slate-300">
            <FaCheck className="text-green-400 mt-1 flex-shrink-0" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="glass-card border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
      >
        <h3 className="text-lg font-semibold text-white pr-4">{question}</h3>
        <div className={`text-indigo-400 text-2xl transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ↓
        </div>
      </button>
      
      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-white/5">
          <p className="text-slate-300 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}
