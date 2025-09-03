import { useState } from 'react';
import { PremiumBadge, PremiumLock, usePremiumFeature } from '../components/PremiumFeature';
import AuthGuard from '../components/AuthGuard';

export default function PremiumDemo() {
  const { checkPremium, PremiumModal } = usePremiumFeature();
  const [showDemo, setShowDemo] = useState(true);

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Premium Features Demo</h1>
          <p className="text-gray-600">
            This page demonstrates how premium features are presented to users
          </p>
        </div>

        {/* Premium Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* AI Job Analysis */}
          <div className="relative bg-white border-2 border-purple-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🤖</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Job Analysis</h3>
                  <PremiumBadge size="sm" />
                </div>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Paste any job URL and let AI extract all the details automatically. 
              Save hours of manual data entry.
            </p>
            <ul className="text-sm text-gray-600 space-y-2 mb-4">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Extract job title, company, and location
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Parse salary information and benefits
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Identify required skills and qualifications
              </li>
            </ul>
            
            {/* Premium overlay */}
            <PremiumLock 
              onClick={() => checkPremium(() => {}, "AI Job Analysis")} 
              feature="AI Job Analysis" 
            />
          </div>

          {/* AI Cover Letter Generation */}
          <div className="relative bg-white border-2 border-purple-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">✍️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Cover Letter</h3>
                  <PremiumBadge size="sm" />
                </div>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Generate personalized cover letters that match your resume with specific job requirements.
            </p>
            <ul className="text-sm text-gray-600 space-y-2 mb-4">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Tailored to specific job postings
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Highlights relevant experience
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Professional tone and structure
              </li>
            </ul>
            
            {/* Premium overlay */}
            <PremiumLock 
              onClick={() => checkPremium(() => {}, "AI Cover Letter Generation")} 
              feature="AI Cover Letter Generation" 
            />
          </div>

          {/* Advanced Analytics */}
          <div className="relative bg-white border-2 border-purple-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">📊</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Advanced Analytics</h3>
                  <PremiumBadge size="sm" />
                </div>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Get detailed insights into your job search performance with advanced metrics and trends.
            </p>
            <ul className="text-sm text-gray-600 space-y-2 mb-4">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Application success rates
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Industry trend analysis
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Skill gap identification
              </li>
            </ul>
            
            {/* Premium overlay */}
            <PremiumLock 
              onClick={() => checkPremium(() => {}, "Advanced Analytics")} 
              feature="Advanced Analytics" 
            />
          </div>

          {/* Priority Support */}
          <div className="relative bg-white border-2 border-purple-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🎧</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Priority Support</h3>
                  <PremiumBadge size="sm" />
                </div>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Get priority email support and faster response times for all your questions.
            </p>
            <ul className="text-sm text-gray-600 space-y-2 mb-4">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                24-hour response time
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Direct access to experts
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Feature request priority
              </li>
            </ul>
            
            {/* Premium overlay */}
            <PremiumLock 
              onClick={() => checkPremium(() => {}, "Priority Support")} 
              feature="Priority Support" 
            />
          </div>
        </div>

        {/* Pricing Section */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Upgrade?</h2>
          <p className="text-gray-600 mb-6">
            Unlock all premium features and supercharge your job search
          </p>
          
          <div className="bg-white rounded-lg p-6 max-w-sm mx-auto shadow-sm">
            <div className="text-4xl font-bold text-gray-900 mb-2">$9.99</div>
            <div className="text-gray-600 mb-4">per month</div>
            <div className="text-sm text-gray-500 mb-6">Cancel anytime</div>
            
            <button 
              onClick={() => checkPremium(() => {}, "Premium Upgrade")}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>

        {/* Demo Controls */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Demo Controls</h3>
          <p className="text-sm text-gray-600 mb-4">
            This demo shows how premium features appear to non-premium users. 
            Click any premium feature to see the upgrade modal.
          </p>
          <button
            onClick={() => checkPremium(() => {}, "Demo Feature")}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Trigger Premium Modal
          </button>
        </div>
      </div>
      
      {/* Premium Modal */}
      <PremiumModal />
    </AuthGuard>
  );
}
