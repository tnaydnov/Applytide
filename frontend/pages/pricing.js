import { useState } from 'react';
import { useRouter } from 'next/router';
import { Button, Card } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../lib/toast';
import PageContainer from "../components/layout/PageContainer";
import PageHeader from "../components/layout/PageHeader";

export default function PricingPage() {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const router = useRouter();
  const toast = useToast();

  const handleUpgrade = () => {
    toast.info('Premium plan is coming soon! We\'ll notify you when it\'s available.');
  };

  const handleContactSales = () => {
    toast.info('Enterprise features coming soon! Contact us at hello@applytide.com for early access.');
  };

  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for getting started with job applications',
      price: { monthly: 0, yearly: 0 },
      popular: false,
      features: [
        { name: 'Track up to 25 job applications', included: true },
        { name: 'Visual pipeline/kanban board management', included: true },
        { name: 'Chrome extension for job saving', included: true },
        { name: 'Unlimited reminders & scheduling', included: true },
        { name: 'Unlimited document storage', included: true },
        { name: 'AI cover letter generation (10/month)', included: true, badge: 'Limited' },
        { name: 'Analytics dashboard', included: true },
        { name: 'AI resume & job analysis (7/month)', included: true, badge: 'Limited' },
        { name: 'Google Calendar integration', included: true },
        { name: 'Interview scheduling', included: true },
        { name: 'Email notifications', included: true },
        { name: 'Unlimited applications', included: false },
        { name: 'Advanced analytics dashboard', included: false },
        { name: 'Unlimited AI features', included: false },
        { name: 'AI resume generation from scratch', included: false },
      ],
      cta: 'Current Plan',
      ctaAction: null
    },
    {
      name: 'Premium',
      description: 'Professional job search with AI-powered tools',
      price: { monthly: 'TBA', yearly: 'TBA' },
      popular: false,
      comingSoon: true,
      trialDays: null,
      features: [
        { name: 'Everything in Starter', included: true },
        { name: 'Unlimited job applications', included: true },
        { name: 'Advanced analytics dashboard', included: true, badge: 'Hot' },
        { name: 'Unlimited AI cover letter generation', included: true, badge: 'AI' },
        { name: 'Unlimited AI resume & job analysis', included: true, badge: 'AI' },
        { name: 'AI resume generation from scratch', included: true, badge: 'AI' },
        { name: 'AI resume optimization from job analysis', included: true, badge: 'AI' },
        { name: 'Smart email thread management & auto-tracking', included: true, badge: 'AI' },
        { name: 'Intelligent job search agent (auto-discovery)', included: true, badge: 'AI' },
        { name: 'Skills gap analysis with learning recommendations', included: true, badge: 'AI' },
        { name: 'Chrome extension auto-fill for applications', included: true },
        { name: 'File attachments to applications & events', included: true },
        { name: 'AI interview preparation tips', included: true, badge: 'AI' },
        { name: 'Company insights & research', included: true },
        { name: 'Export capabilities (CSV, PDF)', included: true }
      ],
      cta: 'Start 7-Day Free Trial',
      ctaAction: handleUpgrade
    }
  ];

  const formatPrice = (plan) => {
    if (plan.price === 'Custom') return 'Custom';
    if (plan.price.monthly === 'TBA') return 'Pricing TBA';
    
    const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
    if (price === 0) return 'Free';

    if (billingCycle === 'yearly') {
      const monthlyEquivalent = (price / 12).toFixed(0);
      return `$${monthlyEquivalent}/mo`;
    }
    return `$${price}/mo`;
  };

  const getYearlySavings = (plan) => {
    if (plan.price === 'Custom' || plan.price.monthly === 0 || plan.price.monthly === 'TBA') return null;
    const yearlyMonthly = plan.price.yearly / 12;
    const savings = ((plan.price.monthly - yearlyMonthly) / plan.price.monthly * 100).toFixed(0);
    return `Save ${savings}%`;
  };

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Success Plan</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Accelerate your job search with powerful tools designed for modern job seekers.
            From basic tracking to AI-powered optimization.
          </p>

          {/* Billing Toggle */}
          <div className="sticky top-16 z-20 flex items-center justify-center space-x-3 mb-6">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-400'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'text-white' : 'text-gray-400'}`}>
              Yearly
            </span>
            {billingCycle === 'yearly' && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-500/30">
                Save 30%
              </span>
            )}
          </div>
        </div>

        {/* Plans */}
        <div
          className="
    md:grid md:grid-cols-2 md:gap-6
    flex gap-4 overflow-x-auto snap-x snap-mandatory px-1
    pb-2 -mx-4 sm:mx-0 md:overflow-visible
  "
        >
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`
        relative glass-card p-6 md:p-8
        border ${plan.popular ? 'border-2 border-indigo-500' : 'border-white/10'}
        shadow-lg ${plan.popular ? 'shadow-indigo-500/20' : 'shadow-black/10'}
        rounded-2xl
        /* Mobile: show as wide slides with snap */
        min-w-[86%] sm:min-w-[75%] md:min-w-0 snap-center
      `}
            >
              {/* Fixed height badge container to keep cards aligned */}
              <div className="flex items-center justify-center gap-3 mb-3 h-8">
                {plan.comingSoon && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                    🚧 Coming soon
                  </span>
                )}
              </div>

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-gray-300 mb-4">{plan.description}</p>
                <div>
                  <span className="text-4xl font-bold text-white">{formatPrice(plan)}</span>
                  {plan.price !== 'Custom' && plan.price.monthly > 0 && plan.price.monthly !== 'TBA' && billingCycle === 'yearly' && (
                    <div className="text-sm text-green-400 mt-1">
                      {getYearlySavings(plan)} • Billed ${plan.price.yearly}/year
                    </div>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start">
                    <div className="mt-0.5">
                      {f.included ? (
                        <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <span className={`text-sm ${f.included ? 'text-gray-200' : 'text-gray-500'}`}>{f.name}</span>
                      {f.badge && (
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium
                  ${f.badge === 'AI' ? 'bg-purple-900/30 text-purple-300 border border-purple-500/30'
                            : f.badge === 'Hot' ? 'bg-red-900/30 text-red-300 border border-red-500/30'
                              : f.badge === 'Limited' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-500/30'
                                : 'bg-blue-900/30 text-blue-300 border border-blue-500/30'}`}>
                          {f.badge}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                onClick={plan.comingSoon ? undefined : plan.ctaAction}
                disabled={plan.comingSoon || (plan.name === 'Free' && user && !user.is_premium)}
                className={`w-full ${plan.comingSoon
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-60'
                  : plan.popular
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                  }`}
              >
                {plan.comingSoon ? '🚧 Coming Soon'
                  : (plan.name === 'Free' && user && !user.is_premium)
                    ? 'Current Plan'
                    : plan.cta}
              </Button>
            </Card>
          ))}
        </div>

        {/* Premium Features Showcase */}
        <div className="mt-32 mb-16">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-6">
              Why Choose <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Applytide Premium</span>?
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Transform your job search with cutting-edge AI technology and professional tools designed to give you an unfair advantage in today's competitive market.
            </p>
          </div>

          {/* Hero Feature - AI Powered */}
          <div className="mb-16 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 blur-3xl -z-10"></div>
            <Card className="p-12 glass-card border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold mb-6">
                    <span className="text-2xl mr-2">✨</span> AI-Powered Job Search
                  </div>
                  <h3 className="text-4xl font-bold text-white mb-6">Your Personal AI Career Assistant</h3>
                  <p className="text-xl text-gray-300 mb-8">
                    Leverage advanced artificial intelligence to automate your entire job search workflow. From finding opportunities to optimizing applications, our AI works 24/7 so you don't have to.
                  </p>
                  <div className="space-y-4">
                    {[
                      'Smart job discovery based on your profile',
                      'Auto-apply to relevant positions while you sleep',
                      'AI-generated cover letters tailored to each role',
                      'Resume optimization that beats ATS systems'
                    ].map((item, i) => (
                      <div key={i} className="flex items-start">
                        <svg className="w-6 h-6 text-green-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-lg text-gray-200">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 blur-2xl opacity-30"></div>
                  <div className="relative bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                    <div className="text-6xl mb-4 text-center">🤖</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
                        <span className="text-gray-300">Jobs Analyzed</span>
                        <span className="text-2xl font-bold text-white">1,247</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
                        <span className="text-gray-300">Applications Sent</span>
                        <span className="text-2xl font-bold text-white">83</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-green-900/30 rounded-lg border border-green-500/30">
                        <span className="text-gray-300">Interviews Booked</span>
                        <span className="text-2xl font-bold text-white">12</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Advanced Analytics */}
            <Card className="p-8 glass-card border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20">
              <div className="flex items-start mb-6">
                <div className="text-5xl mr-4">📊</div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Advanced Analytics Dashboard</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white">
                    🔥 HOT
                  </span>
                </div>
              </div>
              <p className="text-gray-300 mb-6 text-lg">
                Make data-driven decisions with comprehensive insights into your job search performance. Track success rates, identify patterns, and optimize your strategy.
              </p>
              <ul className="space-y-3">
                {[
                  'Response rate tracking & trends',
                  'Application funnel visualization',
                  'Time-to-interview analytics',
                  'Success pattern identification',
                  'Performance benchmarking'
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-200">
                    <span className="text-purple-400 mr-2">▸</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Resume Optimization */}
            <Card className="p-8 glass-card border border-white/10 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/20">
              <div className="flex items-start mb-6">
                <div className="text-5xl mr-4">📝</div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">AI Resume Generation & Optimization</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    🧠 AI
                  </span>
                </div>
              </div>
              <p className="text-gray-300 mb-6 text-lg">
                Create ATS-optimized resumes from scratch or enhance existing ones. Our AI ensures your resume matches job requirements and stands out to recruiters.
              </p>
              <ul className="space-y-3">
                {[
                  'Generate tailored resumes from your profile',
                  'ATS optimization for better visibility',
                  'Job-specific resume variants',
                  'Skills gap analysis & recommendations',
                  'Industry-standard formatting'
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-200">
                    <span className="text-indigo-400 mr-2">▸</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Smart Automation */}
            <Card className="p-8 glass-card border border-white/10 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-500/20">
              <div className="flex items-start mb-6">
                <div className="text-5xl mr-4">⚡</div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Intelligent Automation</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                    ⚡ POWER
                  </span>
                </div>
              </div>
              <p className="text-gray-300 mb-6 text-lg">
                Save hours every day with intelligent automation that handles repetitive tasks, leaving you free to focus on interview preparation and networking.
              </p>
              <ul className="space-y-3">
                {[
                  'Auto-fill applications with one click',
                  'Smart email tracking & categorization',
                  'Automatic job board monitoring',
                  'Interview scheduling automation',
                  'Follow-up reminder system'
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-200">
                    <span className="text-yellow-400 mr-2">▸</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Professional Tools */}
            <Card className="p-8 glass-card border border-white/10 hover:border-green-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/20">
              <div className="flex items-start mb-6">
                <div className="text-5xl mr-4">🎯</div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Professional Career Tools</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-teal-500 text-white">
                    💼 PRO
                  </span>
                </div>
              </div>
              <p className="text-gray-300 mb-6 text-lg">
                Access professional-grade tools and insights that give you a competitive edge in your job search and career development.
              </p>
              <ul className="space-y-3">
                {[
                  'Company research & insights',
                  'AI interview preparation tips',
                  'Professional email templates',
                  'Salary negotiation guidance',
                  'Export & reporting tools (CSV, PDF)'
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-200">
                    <span className="text-green-400 mr-2">▸</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
            {[
              { value: '10x', label: 'Faster Applications', icon: '🚀' },
              { value: '3x', label: 'More Interviews', icon: '📅' },
              { value: '85%', label: 'Time Saved', icon: '⏰' },
              { value: '24/7', label: 'AI Working', icon: '🤖' }
            ].map((stat, i) => (
              <Card key={i} className="p-6 glass-card border border-white/10 text-center hover:border-indigo-500/50 transition-all">
                <div className="text-4xl mb-2">{stat.icon}</div>
                <div className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-gray-300 font-medium">{stat.label}</div>
              </Card>
            ))}
          </div>

          {/* Final CTA */}
          <Card className="p-12 text-center bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-pink-900/40 border-2 border-indigo-500/30">
            <h3 className="text-4xl font-bold text-white mb-4">Ready to Transform Your Job Search?</h3>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join the waitlist now and be among the first to experience the future of job hunting. Early adopters get exclusive benefits and special pricing.
            </p>
            <Button
              onClick={handleUpgrade}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-12 py-4 text-lg font-semibold"
            >
              Join the Waitlist - Coming Early 2026
            </Button>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 p-12 rounded-2xl bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/20">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Accelerate Your Career?</h2>
          <p className="text-xl text-gray-300 mb-8">Join thousands of job seekers who are already using Applytide to land their dream jobs.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              // Logged in users see dashboard and premium coming soon
              <>
                <Button
                  disabled
                  className="bg-gray-600 text-gray-400 cursor-not-allowed opacity-60 px-8 py-3"
                >
                  🚧 Premium Coming Soon
                </Button>
              </>
            ) : (
              // Non-logged users see registration options
              <>
                <Button
                  onClick={() => router.push('/login')}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-8 py-3"
                >
                  Start Free Today
                </Button>
                <Button
                  disabled
                  className="bg-gray-600 text-gray-400 cursor-not-allowed opacity-60 px-8 py-3"
                >
                  🚧 Premium Coming Soon
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
