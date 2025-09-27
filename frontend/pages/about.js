import Head from "next/head";
import AppLayout from "../components/layout/AppLayout";
import PageContainer from "../components/layout/PageContainer";
import PageHeader from "../components/layout/PageHeader";


export default function About() {
  return (
    <AppLayout>
      <Head><title>About - Applytide</title></Head>
      <PageContainer>
        <PageHeader
          title="About Applytide"
          subtitle="Track every job application like a pro"
        />
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8">
          <div className="prose prose-invert max-w-none">
            <div className="prose prose-invert max-w-none">

              <h2 className="text-2xl font-bold text-white mt-8 mb-4">Our Mission</h2>
              <p className="text-slate-300 mb-6">
                We believe job searching should be organized, efficient, and empowering. Applytide was created to help
                job seekers take control of their career journey by providing powerful tools to track applications,
                manage interviews, and gain insights into their job search process.
              </p>

              <h2 className="text-2xl font-bold text-white mt-8 mb-4">What We Do</h2>
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-700/30 rounded-lg p-6">
                  <div className="text-blue-400 mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Application Tracking</h3>
                  <p className="text-slate-300 text-sm">
                    Keep track of every job application, from initial submission to final decision,
                    all in one organized dashboard.
                  </p>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-6">
                  <div className="text-cyan-400 mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Chrome Extension</h3>
                  <p className="text-slate-300 text-sm">
                    Extract job details instantly from any job board with our Chrome extension.
                    One click saves all the important information to your dashboard.
                  </p>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-6">
                  <div className="text-purple-400 mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Insights</h3>
                  <p className="text-slate-300 text-sm">
                    Get intelligent recommendations and insights to improve your job search strategy
                    and increase your success rate.
                  </p>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-6">
                  <div className="text-green-400 mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10m6-10v10m-6-4h6" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Document Management</h3>
                  <p className="text-slate-300 text-sm">
                    Organize and optimize your resumes, cover letters, and other job search documents
                    with our smart document tools.
                  </p>
                </div>

                <div className="bg-slate-700/30 rounded-lg p-6">
                  <div className="text-orange-400 mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 9a2 2 0 11-4 0 2 2 0 014 0zM8 7a2 2 0 012-2h4a2 2 0 012 2m0 0v2a2 2 0 11-4 0V7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Google Calendar Integration</h3>
                  <p className="text-slate-300 text-sm">
                    Connect your Google Calendar to create reminders and never miss an interview or
                    follow-up. All your job search events in one place.
                  </p>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mt-8 mb-4">Why Choose Applytide?</h2>
              <div className="text-slate-300 mb-6">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-3 mt-1">✓</span>
                    <span><strong>Comprehensive:</strong> Everything you need for your job search in one place</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-3 mt-1">✓</span>
                    <span><strong>Chrome Extension:</strong> One-click job extraction from any job board</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-3 mt-1">✓</span>
                    <span><strong>Privacy-Focused:</strong> Your data stays secure with minimal tracking</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-3 mt-1">✓</span>
                    <span><strong>Individual Developer:</strong> Built by a developer who understands job searching</span>
                  </li>
                </ul>
              </div>

              <h2 className="text-2xl font-bold text-white mt-8 mb-4">Get in Touch</h2>
              <p className="text-slate-300 mb-4">
                Have questions, feedback, or need support? We'd love to hear from you.
              </p>
              <div className="bg-slate-700/30 rounded-lg p-6">
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-blue-400 mb-2">
                      <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-white mb-1">General</h4>
                    <a href="mailto:contact@applytide.com" className="text-sm text-slate-300 hover:text-blue-400">
                      contact@applytide.com
                    </a>
                  </div>
                  <div>
                    <div className="text-green-400 mb-2">
                      <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.944l-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016L12 2.944z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-white mb-1">Support</h4>
                    <a href="mailto:support@applytide.com" className="text-sm text-slate-300 hover:text-green-400">
                      support@applytide.com
                    </a>
                  </div>
                  <div>
                    <div className="text-purple-400 mb-2">
                      <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-white mb-1">Billing</h4>
                    <a href="mailto:billing@applytide.com" className="text-sm text-slate-300 hover:text-purple-400">
                      billing@applytide.com
                    </a>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  );
}