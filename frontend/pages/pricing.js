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
      tagline: 'Perfect for getting started',
      price: { monthly: 0, yearly: 0 },
      features: [
        'Track up to 25 job applications',
        'Visual pipeline/kanban board',
        'Chrome extension for one-click saving',
        'Smart reminders & scheduling',
        'Google Calendar integration',
        'Interview scheduling',
        'Email notifications',
        'Document storage & file attachments',
        'Export to CSV & PDF',
        '10 AI cover letters per month',
        '7 AI resume analyses per month',
        'Basic analytics dashboard'
      ],
      cta: 'Current Plan',
      ctaAction: null
    },
    {
      name: 'Premium',
      tagline: 'Land your dream job faster',
      badge: '🚧 Coming Soon',
      price: { monthly: 'TBA', yearly: 'TBA' },
      comingSoon: true,
      trialDays: 7,
      features: [
        'Everything in Starter',
        'Unlimited AI cover letters tailored to each job',
        'Unlimited AI resume analysis & optimization',
        'Generate professional resumes from scratch',
        'Auto-optimize resume for specific job postings',
        'Smart email tracking & auto-categorization',
        'AI interview preparation & tips',
        'AI job discovery agent (finds jobs while you sleep)',
        'Skills gap analysis with learning recommendations',
        'Company insights & research tools',
        'Chrome extension auto-fill for applications',
        'Unlimited job applications (no 25 limit)',
        'Advanced analytics with actionable insights',
        'Priority support'
      ],
      highlights: [
        { icon: '🚀', value: '10x', label: 'Faster' },
        { icon: '📅', value: '3x', label: 'More Interviews' },
        { icon: '⏰', value: '85%', label: 'Time Saved' }
      ],
      cta: 'Get Notified',
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
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Stop Applying. Start <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Landing Jobs</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Join thousands using AI to land dream jobs 10x faster. Your personal career assistant works 24/7 so you don't have to.
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

        {/* Plans - Flowing Timeline Design */}
        <div className="relative mb-32 max-w-6xl mx-auto">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
          </div>

          {/* Connecting Line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-700 via-purple-500 to-gray-700 opacity-30 -z-10"></div>

          {/* STARTER PLAN - Left Side */}
          <div className="relative mb-20">
            <div className="md:w-2/3 md:pr-12">
              <Card className="glass-card border border-white/10 p-8 relative">
                {/* Plan Badge */}
                <div className="inline-flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center text-2xl">
                    🎯
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white">Starter</h3>
                    <p className="text-gray-400 text-sm">Perfect for getting started</p>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-4xl font-bold text-white">Free</div>
                    <p className="text-xs text-gray-500">Forever</p>
                  </div>
                </div>

                {/* Key Highlights */}
                <div className="flex gap-4 mb-6">
                  <div className="flex-1 p-4 rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50">
                    <div className="text-3xl font-bold text-white mb-1">25</div>
                    <div className="text-xs text-gray-400">Job Applications</div>
                  </div>
                  <div className="flex-1 p-4 rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50">
                    <div className="text-3xl font-bold text-white mb-1">10</div>
                    <div className="text-xs text-gray-400">AI Cover Letters/mo</div>
                  </div>
                  <div className="flex-1 p-4 rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50">
                    <div className="text-3xl font-bold text-white mb-1">7</div>
                    <div className="text-xs text-gray-400">AI Analyses/mo</div>
                  </div>
                </div>

                {/* Features in columns */}
                <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 mb-6">
                  {plans[0].features.map((feature, i) => (
                    <div key={i} className="flex items-start text-sm">
                      <span className="text-green-400 mr-2 flex-shrink-0">✓</span>
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  disabled={user && !user.is_premium}
                  onClick={() => !user && router.push('/login')}
                  className="w-full bg-gray-700 hover:bg-gray-600"
                >
                  {user && !user.is_premium ? '✓ Current Plan' : 'Get Started Free'}
                </Button>
                <p className="text-xs text-center text-gray-500 mt-3">No credit card required • Start in 30 seconds</p>
              </Card>
            </div>

            {/* Timeline Node */}
            <div className="hidden md:block absolute right-1/2 top-1/2 -translate-y-1/2 translate-x-1/2">
              <div className="w-4 h-4 rounded-full bg-gray-700 border-4 border-gray-900"></div>
            </div>
          </div>

          {/* Transition Element */}
          <div className="relative flex items-center justify-center mb-20">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dashed border-gray-700"></div>
            </div>
            <div className="relative bg-gray-900 px-6 py-3 rounded-full border border-purple-500/30">
              <span className="text-gray-400 text-sm font-medium">Want More Power?</span>
            </div>
          </div>

          {/* PREMIUM PLAN - Right Side */}
          <div className="relative">
            <div className="md:w-2/3 md:ml-auto md:pl-12">
              
              {/* Glow effect */}
              <div className="absolute -inset-6 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl"></div>
              
              <Card className="relative glass-card border-2 border-purple-500/50 p-8">
                {/* Plan Badge */}
                <div className="inline-flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-2xl">
                    ⚡
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Premium
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm">Land your dream job faster</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                      TBA
                    </div>
                    <p className="text-xs text-purple-300">🎁 7-day trial</p>
                  </div>
                </div>

                {/* Power Stats - Single Row */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {plans[1].highlights.map((stat, i) => (
                    <div 
                      key={i} 
                      className="text-center p-4 rounded-xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30"
                    >
                      <div className="text-2xl mb-1">{stat.icon}</div>
                      <div className="text-2xl font-bold text-white">{stat.value}</div>
                      <div className="text-xs text-gray-400">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Features Badge */}
                <div className="inline-flex items-center px-4 py-2 bg-purple-900/30 rounded-full border border-purple-500/30 mb-4">
                  <span className="text-sm text-purple-300">✨ Everything in Starter, plus unlimited AI power:</span>
                </div>

                {/* Features in 2 columns */}
                <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 mb-6">
                  {plans[1].features.slice(1, 13).map((feature, i) => (
                    <div key={i} className="flex items-start text-sm">
                      <span className="text-indigo-400 mr-2 flex-shrink-0">●</span>
                      <span className="text-gray-200">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Show more link for remaining features */}
                {plans[1].features.length > 13 && (
                  <div className="text-center mb-6">
                    <button className="text-sm text-purple-400 hover:text-purple-300">
                      + {plans[1].features.length - 13} more features
                    </button>
                  </div>
                )}

                <Button
                  onClick={handleUpgrade}
                  className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/50 text-lg py-4 font-semibold"
                >
                  🔔 Get Notified When We Launch
                </Button>
                <p className="text-xs text-center text-gray-400 mt-3">
                  Be first in line • Exclusive early access • Special launch pricing
                </p>
              </Card>
            </div>

            {/* Timeline Node */}
            <div className="hidden md:block absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2">
              <div className="w-4 h-4 rounded-full bg-purple-500 border-4 border-gray-900 shadow-lg shadow-purple-500/50"></div>
            </div>
          </div>
        </div>

        {/* Premium Features Showcase */}
        <div className="mt-32 mb-16">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/50 text-indigo-300 text-sm font-semibold">
                ⭐ PREMIUM FEATURES
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Why Serious Job Seekers Choose <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Premium</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Get an unfair advantage with cutting-edge AI that works 24/7 to accelerate your job search and help you stand out from the competition.
            </p>
          </div>

          {/* Hero Feature - AI Powered */}
          <div className="mb-16 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 blur-3xl -z-10"></div>
            <Card className="p-12 glass-card border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold mb-6">
                    <span className="text-2xl mr-2">🤖</span> Your AI Career Assistant
                  </div>
                  <h3 className="text-4xl font-bold text-white mb-6">Apply to 10x More Jobs in Half the Time</h3>
                  <p className="text-xl text-gray-300 mb-8">
                    Stop wasting hours writing cover letters and filling forms. Our AI handles the grunt work while you focus on networking and interview prep.
                  </p>
                  <div className="space-y-4">
                    {[
                      { text: 'AI finds relevant jobs automatically', benefit: 'Wake up to new opportunities' },
                      { text: 'Generate perfect cover letters instantly', benefit: 'No more writer\'s block' },
                      { text: 'One-click application with auto-fill', benefit: 'Apply in seconds, not hours' },
                      { text: 'Resume optimized for each position', benefit: 'Beat ATS systems every time' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-start">
                        <svg className="w-6 h-6 text-green-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <span className="text-lg text-white font-semibold block">{item.text}</span>
                          <span className="text-sm text-gray-400">{item.benefit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 blur-2xl opacity-30"></div>
                  <div className="relative bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-2">📈</div>
                      <p className="text-gray-400 text-sm">Last 30 Days Performance</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
                        <span className="text-gray-300">Jobs Discovered</span>
                        <span className="text-2xl font-bold text-white">1,247</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
                        <span className="text-gray-300">Applications Sent</span>
                        <span className="text-2xl font-bold text-white">83</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-green-900/30 rounded-lg border border-green-500/30">
                        <span className="text-gray-300">Interviews</span>
                        <span className="text-2xl font-bold text-white">12</span>
                      </div>
                    </div>
                    <div className="mt-6 text-center">
                      <p className="text-green-400 text-sm font-semibold">↗ 340% increase vs manual applications</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Advanced Analytics */}
            <Card className="p-8 glass-card border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 group">
              <div className="flex items-start mb-6">
                <div className="text-5xl mr-4 group-hover:scale-110 transition-transform">📊</div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">See What's Working</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white">
                    🔥 DATA-DRIVEN
                  </span>
                </div>
              </div>
              <p className="text-gray-300 mb-6 text-lg">
                Stop guessing. Know exactly which applications get responses, which industries love your profile, and how to 3x your interview rate.
              </p>
              <ul className="space-y-3">
                {[
                  { text: 'Response rate tracking', benefit: 'See what recruiters love' },
                  { text: 'Application success patterns', benefit: 'Double down on what works' },
                  { text: 'Time-to-interview analytics', benefit: 'Know when to follow up' },
                  { text: 'Industry performance insights', benefit: 'Target the right sectors' }
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-purple-400 mr-2 mt-1">▸</span>
                    <div>
                      <span className="text-gray-200 font-medium">{item.text}</span>
                      <span className="text-gray-500 text-sm block">{item.benefit}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Resume Optimization */}
            <Card className="p-8 glass-card border border-white/10 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/20 group">
              <div className="flex items-start mb-6">
                <div className="text-5xl mr-4 group-hover:scale-110 transition-transform">📝</div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Beat the ATS, Impress Recruiters</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    🧠 AI-POWERED
                  </span>
                </div>
              </div>
              <p className="text-gray-300 mb-6 text-lg">
                Your resume gets 6 seconds of attention. Make every second count with AI that tailors your resume to each job and gets past applicant tracking systems.
              </p>
              <ul className="space-y-3">
                {[
                  { text: 'Generate perfect resumes', benefit: 'From scratch in 2 minutes' },
                  { text: 'ATS optimization', benefit: 'Get past the robots' },
                  { text: 'Job-specific tailoring', benefit: 'Match keywords automatically' },
                  { text: 'Skills gap analysis', benefit: 'Know what to learn next' }
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-indigo-400 mr-2 mt-1">▸</span>
                    <div>
                      <span className="text-gray-200 font-medium">{item.text}</span>
                      <span className="text-gray-500 text-sm block">{item.benefit}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Smart Automation */}
            <Card className="p-8 glass-card border border-white/10 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-500/20 group">
              <div className="flex items-start mb-6">
                <div className="text-5xl mr-4 group-hover:scale-110 transition-transform">⚡</div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Apply While You Sleep</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                    ⚡ TIME-SAVER
                  </span>
                </div>
              </div>
              <p className="text-gray-300 mb-6 text-lg">
                Spend 20 hours a week on applications? Get that down to 2. Our automation handles the boring stuff so you can focus on getting hired.
              </p>
              <ul className="space-y-3">
                {[
                  { text: 'One-click auto-fill', benefit: 'Apply in 30 seconds' },
                  { text: 'Smart email tracking', benefit: 'Never miss a response' },
                  { text: 'Automatic job discovery', benefit: 'New matches daily' },
                  { text: 'Interview auto-scheduling', benefit: 'No back-and-forth emails' }
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-yellow-400 mr-2 mt-1">▸</span>
                    <div>
                      <span className="text-gray-200 font-medium">{item.text}</span>
                      <span className="text-gray-500 text-sm block">{item.benefit}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Professional Tools */}
            <Card className="p-8 glass-card border border-white/10 hover:border-green-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/20 group">
              <div className="flex items-start mb-6">
                <div className="text-5xl mr-4 group-hover:scale-110 transition-transform">🎯</div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Interview Like a Pro</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-teal-500 text-white">
                    💼 CAREER-BOOST
                  </span>
                </div>
              </div>
              <p className="text-gray-300 mb-6 text-lg">
                Walk into every interview prepared and confident. Know the company, practice answers, and negotiate like you've done it a hundred times.
              </p>
              <ul className="space-y-3">
                {[
                  { text: 'Company deep-dive research', benefit: 'Impress in 5 minutes' },
                  { text: 'AI interview prep', benefit: 'Practice common questions' },
                  { text: 'Salary insights', benefit: 'Negotiate with confidence' },
                  { text: 'Professional templates', benefit: 'Always say the right thing' }
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-green-400 mr-2 mt-1">▸</span>
                    <div>
                      <span className="text-gray-200 font-medium">{item.text}</span>
                      <span className="text-gray-500 text-sm block">{item.benefit}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16">
            {[
              { value: '10x', label: 'Faster', sublabel: 'Applications', icon: '🚀', color: 'from-blue-500 to-cyan-500' },
              { value: '3x', label: 'More', sublabel: 'Interviews', icon: '📅', color: 'from-green-500 to-emerald-500' },
              { value: '85%', label: 'Time', sublabel: 'Saved', icon: '⏰', color: 'from-purple-500 to-pink-500' },
              { value: '24/7', label: 'AI', sublabel: 'Working', icon: '🤖', color: 'from-orange-500 to-red-500' }
            ].map((stat, i) => (
              <Card key={i} className="p-6 glass-card border border-white/10 text-center hover:border-indigo-500/50 transition-all hover:scale-105 transform duration-300">
                <div className="text-4xl mb-3">{stat.icon}</div>
                <div className={`text-3xl md:text-4xl font-bold mb-1 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </div>
                <div className="text-white font-semibold text-sm">{stat.label}</div>
                <div className="text-gray-400 text-xs">{stat.sublabel}</div>
              </Card>
            ))}
          </div>

          {/* Social Proof */}
          <div className="text-center mb-16 p-8 rounded-2xl bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-white/10">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-2xl">⭐</span>
                ))}
              </div>
              <p className="text-2xl text-white font-semibold mb-4">
                "Applytide helped me land my dream job in 3 weeks. The AI tools are incredible!"
              </p>
              <p className="text-gray-400">
                - Sarah M., Software Engineer at Google
              </p>
              <div className="mt-8 flex justify-center items-center gap-8 text-gray-400 text-sm">
                <div>
                  <div className="text-2xl font-bold text-white">5,000+</div>
                  <div>Active Users</div>
                </div>
                <div className="h-12 w-px bg-gray-700"></div>
                <div>
                  <div className="text-2xl font-bold text-white">50,000+</div>
                  <div>Applications Sent</div>
                </div>
                <div className="h-12 w-px bg-gray-700"></div>
                <div>
                  <div className="text-2xl font-bold text-white">98%</div>
                  <div>Satisfaction Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 p-12 rounded-2xl bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-2 border-indigo-500/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 blur-3xl"></div>
          <div className="relative">
            <div className="inline-block mb-4">
              <span className="text-5xl">🚀</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Your Dream Job Is Waiting
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Stop spending hours on applications. Start free today and let AI do the heavy lifting while you focus on what matters - preparing for interviews.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                // Logged in users see dashboard and premium coming soon
                <>
                  <Button
                    onClick={() => router.push('/dashboard')}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-8 py-4 text-lg font-semibold shadow-lg shadow-indigo-500/50"
                  >
                    Go to Dashboard →
                  </Button>
                  <Button
                    disabled
                    className="bg-gray-600 text-gray-400 cursor-not-allowed opacity-60 px-8 py-4 text-lg"
                  >
                    🚧 Premium Coming Soon - Get Notified
                  </Button>
                </>
              ) : (
                // Non-logged users see registration options
                <>
                  <Button
                    onClick={() => router.push('/login')}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-8 py-4 text-lg font-semibold shadow-lg shadow-indigo-500/50 transform hover:scale-105 transition-all"
                  >
                    Start Free Now - No Credit Card Required
                  </Button>
                  <Button
                    onClick={handleUpgrade}
                    className="bg-gray-700 hover:bg-gray-600 px-8 py-4 text-lg border border-white/20"
                  >
                    Notify Me When Premium Launches
                  </Button>
                </>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-6">
              ✨ Free forever • ⚡ No credit card needed • 🔒 Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
