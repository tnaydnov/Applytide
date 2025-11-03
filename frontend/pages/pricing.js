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
      icon: '🎯',
      price: { monthly: 0, yearly: 0 },
      popular: false,
      features: [
        { text: 'Track up to 25 job applications' },
        { text: 'Visual pipeline/kanban board' },
        { text: 'Chrome extension for one-click saving' },
        { text: 'Smart reminders & scheduling' },
        { text: 'Google Calendar integration' },
        { text: 'Interview scheduling' },
        { text: 'Email notifications' },
        { text: 'Document storage & file attachments' },
        { text: 'Export to CSV & PDF' },
        { text: '10 AI cover letters per month' },
        { text: '7 AI resume analyses per month' },
        { text: 'Basic analytics dashboard' }
      ],
      cta: 'Get Started Free',
      ctaAction: null
    },
    {
      name: 'Pro',
      tagline: 'For serious job seekers',
      icon: '🚀',
      badge: 'Coming Soon',
      price: { monthly: 'TBA', yearly: 'TBA' },
      popular: true,
      comingSoon: true,
      features: [
        { text: 'Everything in Starter', divider: true },
        { text: 'Unlimited job applications', star: true },
        { text: 'Unlimited AI cover letters', star: true },
        { text: 'Unlimited AI resume analysis', star: true },
        { text: 'Advanced analytics dashboard' },
        { text: 'AI interview preparation tips', new: true },
        { text: 'Company insights & research' },
        { text: 'Skills gap analysis with learning paths' },
        { text: 'Priority email support' }
      ],
      highlight: '✨ Unlimited AI Power',
      cta: 'Join Waitlist',
      ctaAction: null
    },
    {
      name: 'Premium',
      tagline: 'Maximum career acceleration',
      icon: '⚡',
      badge: 'Coming Soon',
      price: { monthly: 'TBA', yearly: 'TBA' },
      popular: false,
      comingSoon: true,
      features: [
        { text: 'Everything in Pro', divider: true },
        { text: 'AI Smart Agent finds jobs for you', star: true, new: true },
        { text: 'AI resume generation from scratch', star: true },
        { text: 'Auto-optimize resume for each job posting' },
        { text: 'One-click application auto-fill for job forms' },
        { text: 'Smart email tracking & categorization' }
      ],
      highlight: '🤖 AI Career Assistant',
      stats: [
        { icon: '🚀', value: '10x', label: 'Faster' },
        { icon: '📅', value: '3x', label: 'Interviews' }
      ],
      cta: 'Join Waitlist',
      ctaAction: null
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
            Simple Pricing. <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Powerful Results</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Start free and track every application. Upgrade when you're ready for AI-powered automation and advanced features.
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

        {/* Plans - Clean Modern Design */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-32">
          {plans.map((plan, idx) => (
            <div 
              key={plan.name} 
              className={`relative ${plan.popular ? 'lg:scale-105 lg:z-10' : ''}`}
            >
              {/* Glow effect for popular plan */}
              {plan.popular && (
                <div className="absolute -inset-1 bg-gradient-to-b from-indigo-600/50 via-purple-600/50 to-pink-600/50 rounded-3xl blur-2xl opacity-75"></div>
              )}

              <div className={`relative h-full flex flex-col rounded-3xl overflow-hidden ${
                plan.popular 
                  ? 'bg-gradient-to-b from-gray-900 via-gray-900 to-indigo-950 border-2 border-indigo-500/50' 
                  : 'bg-gray-900/50 backdrop-blur-xl border border-white/10'
              }`}>
                
                {/* Popular Badge - Fixed positioning */}
                {plan.popular && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-b-2xl text-white text-sm font-bold shadow-xl z-30">
                    ⭐ Most Popular
                  </div>
                )}

                {/* Card Content */}
                <div className="p-8 flex flex-col flex-1">
                  
                  {/* Coming Soon Badge - Better placement */}
                  {plan.comingSoon && (
                    <div className="flex justify-end mb-2">
                      <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-medium">
                        {plan.badge}
                      </span>
                    </div>
                  )}
                  
                  {/* Icon & Header */}
                  <div className="text-center mb-8">
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 ${
                      plan.popular 
                        ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-lg shadow-indigo-500/50' 
                        : idx === 2
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg shadow-purple-500/30'
                          : 'bg-gray-800/80'
                    }`}>
                      <span className="text-4xl">{plan.icon}</span>
                    </div>
                    
                    <h3 className={`text-3xl font-bold mb-2 ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent' 
                        : 'text-white'
                    }`}>
                      {plan.name}
                    </h3>
                    <p className="text-gray-400 text-sm mb-6">{plan.tagline}</p>

                    {/* Price */}
                    <div className="mb-2">
                      {plan.price.monthly === 0 ? (
                        <div className="text-5xl font-bold text-white">Free</div>
                      ) : (
                        <div className={`text-4xl font-bold ${
                          plan.popular 
                            ? 'bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent' 
                            : 'text-white'
                        }`}>
                          Pricing TBA
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {plan.price.monthly === 0 ? 'Forever free' : 'Announced at launch'}
                    </p>
                  </div>

                  {/* Highlight Badge */}
                  {plan.highlight && (
                    <div className={`text-center mb-6 py-3 px-4 rounded-2xl ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-indigo-600/30 via-purple-600/30 to-pink-600/30 border border-indigo-500/50' 
                        : 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30'
                    }`}>
                      <span className={`text-sm font-bold ${
                        plan.popular ? 'text-indigo-200' : 'text-purple-200'
                      }`}>
                        {plan.highlight}
                      </span>
                    </div>
                  )}

                  {/* Stats for Premium */}
                  {plan.stats && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {plan.stats.map((stat, i) => (
                        <div key={i} className="text-center p-4 rounded-2xl bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30">
                          <div className="text-3xl mb-2">{stat.icon}</div>
                          <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                          <div className="text-xs text-gray-400">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Features - Clear separation */}
                  <div className="flex-1 mb-8">
                    {/* Features Header */}
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-800">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        What's Included
                      </span>
                    </div>

                    <div className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <div key={i}>
                          {feature.divider ? (
                            /* Divider style for "Everything in X" */
                            <div className="flex items-center gap-2 py-2 text-sm">
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-500 italic">{feature.text}</span>
                            </div>
                          ) : (
                            /* Regular feature */
                            <div className="flex items-start gap-2 group">
                              <div className="flex items-center gap-2 flex-1">
                                {feature.star ? (
                                  <span className="text-yellow-400 text-base flex-shrink-0">★</span>
                                ) : (
                                  <svg className={`w-5 h-5 flex-shrink-0 ${
                                    plan.popular ? 'text-indigo-400' : 'text-green-400'
                                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                                <span className={`text-sm ${
                                  feature.star ? 'text-white font-medium' : 'text-gray-300'
                                }`}>
                                  {feature.text}
                                </span>
                              </div>
                              {feature.new && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-medium whitespace-nowrap">
                                  NEW
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <Button
                    disabled={plan.comingSoon || (plan.name === 'Starter' && user && !user.is_premium)}
                    onClick={() => {
                      if (plan.comingSoon) {
                        handleUpgrade();
                      } else if (plan.name === 'Starter' && !user) {
                        router.push('/login');
                      }
                    }}
                    className={`w-full py-4 text-base font-semibold ${
                      plan.comingSoon
                        ? plan.popular
                          ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 shadow-xl shadow-indigo-500/50'
                          : idx === 2
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-xl shadow-purple-500/30'
                            : 'bg-gray-700 hover:bg-gray-600'
                        : plan.name === 'Starter'
                          ? 'bg-indigo-600 hover:bg-indigo-700'
                          : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {plan.comingSoon 
                      ? plan.cta
                      : (plan.name === 'Starter' && user && !user.is_premium)
                        ? '✓ Current Plan'
                        : plan.cta
                    }
                  </Button>
                  
                  {plan.name === 'Starter' && !plan.comingSoon && (
                    <p className="text-xs text-center text-gray-500 mt-3">
                      No credit card • Start in 30 seconds
                    </p>
                  )}
                  {plan.comingSoon && (
                    <p className="text-xs text-center text-gray-500 mt-3">
                      Be the first to get early access
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* What Makes Applytide Different */}
        <div className="mt-32 mb-16">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/50 text-indigo-300 text-sm font-semibold">
                WHY APPLYTIDE
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Everything You Need to <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Get Organized</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Track applications, manage interviews, and stay on top of your job search—all in one place. Premium features coming soon to supercharge your search with AI.
            </p>
          </div>

          {/* Core Features Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Visual Pipeline */}
            <Card className="p-8 glass-card border border-white/10 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/20 group">
              <div className="flex items-start mb-6">
                <div className="text-5xl mr-4 group-hover:scale-110 transition-transform">�</div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Visual Pipeline</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                    ✨ AVAILABLE NOW
                  </span>
                </div>
              </div>
              <p className="text-gray-300 mb-6 text-lg">
                See your entire job search at a glance. Drag and drop applications between stages, set reminders, and never miss a follow-up.
              </p>
              <ul className="space-y-3">
                {[
                  { text: 'Kanban board view', benefit: 'Track every stage' },
                  { text: 'Chrome extension', benefit: 'Save jobs in one click' },
                  { text: 'Smart reminders', benefit: 'Never miss deadlines' },
                  { text: 'Calendar integration', benefit: 'Schedule interviews easily' }
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

            {/* Current AI Features */}
            <Card className="p-8 glass-card border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 group">
              <div className="flex items-start mb-6">
                <div className="text-5xl mr-4 group-hover:scale-110 transition-transform">🤖</div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">AI Writing Assistant</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    ✨ AVAILABLE NOW
                  </span>
                </div>
              </div>
              <p className="text-gray-300 mb-6 text-lg">
                Get started with AI-powered cover letters and resume analysis. Free tier includes monthly credits to test the features.
              </p>
              <ul className="space-y-3">
                {[
                  { text: 'AI cover letter generation', benefit: '10/month on free tier' },
                  { text: 'Resume analysis', benefit: '7/month on free tier' },
                  { text: 'Job description matching', benefit: 'See what fits' },
                  { text: 'Document storage', benefit: 'Keep everything organized' }
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

            {/* Coming: Advanced AI */}
            <Card className="p-8 glass-card border border-yellow-500/30 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-500/20 group relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-medium">
                  Coming Soon
                </span>
              </div>
              <div className="flex items-start mb-6">
                <div className="text-5xl mr-4 group-hover:scale-110 transition-transform">⚡</div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">AI Automation</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                    🚀 PRO & PREMIUM
                  </span>
                </div>
              </div>
              <p className="text-gray-300 mb-6 text-lg">
                Save hours every week with unlimited AI and smart automation that handles the repetitive tasks for you.
              </p>
              <ul className="space-y-3">
                {[
                  { text: 'Unlimited AI generation', benefit: 'No monthly limits' },
                  { text: 'Auto-fill applications', benefit: 'Apply in seconds' },
                  { text: 'Smart job discovery', benefit: 'AI finds matches for you' },
                  { text: 'Auto-optimize resumes', benefit: 'Tailored per job' }
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

            {/* Coming: Analytics & Insights */}
            <Card className="p-8 glass-card border border-green-500/30 hover:border-green-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/20 group relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-medium">
                  Coming Soon
                </span>
              </div>
              <div className="flex items-start mb-6">
                <div className="text-5xl mr-4 group-hover:scale-110 transition-transform">📊</div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Smart Insights</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-teal-500 text-white">
                    � PRO & PREMIUM
                  </span>
                </div>
              </div>
              <p className="text-gray-300 mb-6 text-lg">
                Get data-driven insights about your job search performance and personalized recommendations to improve your results.
              </p>
              <ul className="space-y-3">
                {[
                  { text: 'Advanced analytics', benefit: 'Track what works' },
                  { text: 'Interview preparation', benefit: 'AI-powered tips' },
                  { text: 'Company research', benefit: 'Know before you apply' },
                  { text: 'Skills gap analysis', benefit: 'Learn strategically' }
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

          {/* Why Choose Applytide */}
          <div className="mb-16 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20 blur-3xl -z-10"></div>
            <Card className="p-12 glass-card border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold mb-6">
                    <span className="text-2xl mr-2">🎯</span> Built for Job Seekers
                  </div>
                  <h3 className="text-4xl font-bold text-white mb-6">Your All-in-One Job Search Hub</h3>
                  <p className="text-xl text-gray-300 mb-8">
                    Track every application, manage interviews, and leverage AI—all in one place. Start with powerful free features, upgrade when you need more.
                  </p>
                  <div className="space-y-4">
                    {[
                      { text: 'Visual kanban board', benefit: 'See your entire pipeline' },
                      { text: 'Chrome extension', benefit: 'Save jobs instantly' },
                      { text: 'AI cover letters & analysis', benefit: 'Get started with AI' },
                      { text: 'Smart reminders', benefit: 'Never miss follow-ups' }
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
                      <div className="text-6xl mb-2">🚀</div>
                      <p className="text-gray-400 text-sm">Available Right Now</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
                        <span className="text-gray-300">Track Applications</span>
                        <span className="text-2xl font-bold text-white">25</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
                        <span className="text-gray-300">AI Cover Letters</span>
                        <span className="text-2xl font-bold text-white">10/mo</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-green-900/30 rounded-lg border border-green-500/30">
                        <span className="text-gray-300">Resume Analyses</span>
                        <span className="text-2xl font-bold text-white">7/mo</span>
                      </div>
                    </div>
                    <div className="mt-6 text-center">
                      <p className="text-indigo-400 text-sm font-semibold">✨ Free Forever Plan</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Value Props */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16">
            {[
              { value: 'Free', label: 'Forever', sublabel: 'Starter Plan', icon: '🎯', color: 'from-blue-500 to-cyan-500' },
              { value: 'AI', label: 'Powered', sublabel: 'Smart Tools', icon: '🤖', color: 'from-purple-500 to-pink-500' },
              { value: '1-Click', label: 'Chrome', sublabel: 'Extension', icon: '⚡', color: 'from-green-500 to-emerald-500' },
              { value: 'More', label: 'Coming', sublabel: 'Soon', icon: '🚀', color: 'from-orange-500 to-red-500' }
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

          {/* Pre-Launch Message */}
          <div className="text-center mb-16 p-8 rounded-2xl bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-white/10">
            <div className="max-w-4xl mx-auto">
              <div className="text-6xl mb-6">🚀</div>
              <h3 className="text-3xl font-bold text-white mb-4">
                Join the Early Access Waitlist
              </h3>
              <p className="text-xl text-gray-300 mb-6">
                Be among the first to access Pro and Premium features when we launch. Get exclusive early-bird pricing and help shape the future of Applytide.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">Special launch pricing</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">Priority feature requests</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">Early beta access</span>
                </div>
              </div>
              <Button
                onClick={handleUpgrade}
                className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 px-8 py-4 text-lg font-semibold shadow-xl shadow-indigo-500/50"
              >
                Join Waitlist - Get Notified
              </Button>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 p-12 rounded-2xl bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-2 border-indigo-500/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 blur-3xl"></div>
          <div className="relative">
            <div className="inline-block mb-4">
              <span className="text-5xl">🎯</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Start Organizing Your Job Search Today
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Track applications, manage interviews, and leverage AI—all for free. No credit card required.
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
                    onClick={handleUpgrade}
                    className="bg-gray-700 hover:bg-gray-600 px-8 py-4 text-lg border border-white/20"
                  >
                    Join Waitlist for Pro/Premium
                  </Button>
                </>
              ) : (
                // Non-logged users see registration options
                <>
                  <Button
                    onClick={() => router.push('/login')}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-8 py-4 text-lg font-semibold shadow-lg shadow-indigo-500/50 transform hover:scale-105 transition-all"
                  >
                    Start Free - No Credit Card
                  </Button>
                  <Button
                    onClick={handleUpgrade}
                    className="bg-gray-700 hover:bg-gray-600 px-8 py-4 text-lg border border-white/20"
                  >
                    Join Waitlist for Premium
                  </Button>
                </>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-6">
              ✨ Free forever • ⚡ Set up in 30 seconds • 🔒 No payment required
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
