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
      name: 'Free',
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
      price: { monthly: 19, yearly: 199 },
      popular: true,
      comingSoon: true,
      trialDays: 7,
      features: [
        { name: 'Everything in Free', included: true },
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
    const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
    if (price === 0) return 'Free';

    if (billingCycle === 'yearly') {
      const monthlyEquivalent = (price / 12).toFixed(0);
      return `$${monthlyEquivalent}/mo`;
    }
    return `$${price}/mo`;
  };

  const getYearlySavings = (plan) => {
    if (plan.price === 'Custom' || plan.price.monthly === 0) return null;
    const yearlyMonthly = plan.price.yearly / 12;
    const savings = ((plan.price.monthly - yearlyMonthly) / plan.price.monthly * 100).toFixed(0);
    return `Save ${savings}%`;
  };

  return (
    <PageContainer>
      <PageHeader title="Choose Your Plan" subtitle="Accelerate your job search with powerful tools" />
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
              {/* Badges live INSIDE header to avoid overlap */}
              <div className="flex items-center justify-center gap-3 mb-3">
                {plan.popular && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    Most Popular
                  </span>
                )}
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
                  {plan.price !== 'Custom' && plan.price.monthly > 0 && billingCycle === 'yearly' && (
                    <div className="text-sm text-green-400 mt-1">
                      {getYearlySavings(plan)} • Billed ${plan.price.yearly}/year
                    </div>
                  )}
                </div>
                {plan.trialDays && (
                  <div className="text-sm text-indigo-400 font-medium mt-2">🎉 {plan.trialDays} days free trial</div>
                )}
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


        {/* Feature Showcase */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Why Choose <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Applytide Premium</span>?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '🤖',
                title: 'AI Resume Optimization',
                description: 'Get your resume noticed with AI-powered optimization that matches job requirements and beats ATS systems.'
              },
              {
                icon: '📊',
                title: 'Advanced Analytics',
                description: 'Track your success rate, identify patterns, and optimize your job search strategy with detailed insights.'
              },
              {
                icon: '🎯',
                title: 'Smart Job Matching',
                description: 'Our AI finds jobs that perfectly match your skills and preferences, saving you hours of searching.'
              },

              {
                icon: '⚡',
                title: 'Auto-Apply Technology',
                description: 'Apply to relevant jobs automatically while you sleep. Let our AI work for you 24/7.'
              },
              {
                icon: '🎨',
                title: 'Professional Templates',
                description: 'Stand out with beautifully designed resume and email templates crafted by industry experts.'
              }
            ].map((feature, index) => (
              <Card key={index} className="p-6 glass-card border border-white/10 hover:border-indigo-500/30 transition-colors">
                <div className="text-4xl mb-4 text-center">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3 text-center">{feature.title}</h3>
                <p className="text-gray-300 text-center">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-12">Frequently Asked Questions</h2>

          <div className="space-y-6">
            {[
              {
                question: "When will Premium features be available?",
                answer: "We're working hard to launch Premium features in early 2026. Join our waitlist to be notified first and get early access pricing!"
              },
              {
                question: "What happens when I switch plans?",
                answer: "When you upgrade to Premium, you get immediate access to all features. If you downgrade from Premium to Free, you'll keep Premium access until your current billing period ends, then switch to Free plan limits."
              },
              {
                question: "What if I have more than 25 applications when downgrading?",
                answer: "Don't worry! Your existing applications are always safe. You'll keep access to all your data, but you won't be able to add new applications until you're under the 25-application limit or upgrade back to Premium."
              },
              {
                question: "Do you offer refunds?",
                answer: "Yes! We offer a 30-day money-back guarantee on all paid plans. Plus, you can try Premium free for 7 days before any charges."
              },
              {
                question: "Is there a limit on job applications in Premium?",
                answer: "No limits! Premium users get unlimited job applications, resume versions, and access to all our advanced features."
              }
            ].map((faq, index) => (
              <Card key={index} className="p-6 glass-card border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-3">{faq.question}</h3>
                <p className="text-gray-300">{faq.answer}</p>
              </Card>
            ))}
          </div>
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
