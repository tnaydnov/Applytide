import Link from "next/link";
import { Button, Card } from "../components/ui";

export default function Home() {
  const features = [
    {
      icon: "🎯",
      title: "Smart Job Tracking",
      description: "Automatically scrape and organize job postings from any URL with AI-powered data extraction.",
      href: "/jobs"
    },
    {
      icon: "🔄",
      title: "Visual Pipeline",
      description: "Track your application progress with a beautiful Kanban-style board that updates in real-time.",
      href: "/pipeline"
    },
    {
      icon: "�️",
      title: "Smart Reminders",
      description: "Never miss an interview or follow-up with calendar integration and ICS export capabilities.",
      href: "/reminders"
    },
    {
      icon: "�📄",
      title: "Resume Management",
      description: "Store and manage multiple resume versions, perfectly tailored for different job opportunities.",
      href: "/resumes"
    },
    {
      icon: "📊",
      title: "Analytics Dashboard",
      description: "Get insights into your job search with comprehensive analytics and progress tracking.",
      href: "/dashboard"
    }
  ];

  const stats = [
    { label: "Applications Tracked", value: "1,200+", color: "text-indigo-600" },
    { label: "Success Rate", value: "89%", color: "text-green-600" },
    { label: "Time Saved", value: "15hrs/week", color: "text-purple-600" },
    { label: "Happy Users", value: "500+", color: "text-blue-600" }
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 -z-10"></div>
        <div className="text-center space-y-8 py-16">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 tracking-tight animate-slideIn">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Personal AI
              </span> Career Assistant
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed animate-slideIn">
              Get personalized job recommendations, track applications, and receive AI insights 
              tailored specifically to YOUR career goals, skills, and location.
            </p>
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-sm font-medium text-green-800">
                🎯 <span className="font-bold">PERSONALIZED:</span> All insights and recommendations are tailored to your profile!
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slideIn">
            <Link href="/auth/register">
              <Button size="xl" className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                🚀 Start Your Journey
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="xl" className="w-full sm:w-auto border-purple-300 text-purple-700 hover:bg-purple-50">
                � Sign In
              </Button>
            </Link>
          </div>
          
          {/* Personal Benefits Preview */}
          <div className="max-w-4xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg border border-purple-200">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">🎯 Your Personal Career Intelligence</h3>
              <p className="text-gray-600">See how our AI adapts to YOUR specific situation</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">YOUR</div>
                <div className="text-sm text-gray-600">Location-specific job market</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">YOUR</div>
                <div className="text-sm text-gray-600">Skills gap analysis</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">7 Factors</div>
                <div className="text-sm text-gray-600">Success Prediction Model</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, index) => (
          <Card key={index} className="text-center animate-fadeIn" style={{ animationDelay: `${index * 100}ms` }}>
            <div className={`text-3xl font-bold ${stat.color} mb-2`}>
              {stat.value}
            </div>
            <div className="text-gray-600 text-sm font-medium">
              {stat.label}
            </div>
          </Card>
        ))}
      </div>

      {/* AI Showcase Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 -z-10"></div>
        <div className="space-y-8 py-16">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              🧠 Revolutionary AI Intelligence
            </h2>
            <p className="text-gray-600 text-xl max-w-3xl mx-auto">
              The first job search platform with AI that actually predicts your success. 
              No more guessing - get data-driven insights for every application.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="space-y-4">
                <div className="text-5xl">🎯</div>
                <h3 className="text-xl font-bold text-purple-800">Success Prediction</h3>
                <p className="text-gray-700">
                  AI analyzes 7 key factors to predict your success rate with 85% accuracy
                </p>
                <div className="bg-white p-3 rounded-lg border border-purple-100">
                  <div className="text-2xl font-bold text-purple-600">87%</div>
                  <div className="text-sm text-gray-600">Success Rate for Google SWE</div>
                </div>
              </div>
            </Card>
            
            <Card className="text-center border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
              <div className="space-y-4">
                <div className="text-5xl">📊</div>
                <h3 className="text-xl font-bold text-blue-800">Market Intelligence</h3>
                <p className="text-gray-700">
                  Real-time analysis of hiring trends, salary data, and skill demand
                </p>
                <div className="bg-white p-3 rounded-lg border border-blue-100">
                  <div className="text-2xl font-bold text-blue-600">2,847</div>
                  <div className="text-sm text-gray-600">New jobs this week</div>
                </div>
              </div>
            </Card>
            
            <Card className="text-center border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="space-y-4">
                <div className="text-5xl">💡</div>
                <h3 className="text-xl font-bold text-green-800">Personal Insights</h3>
                <p className="text-gray-700">
                  Personalized recommendations to improve your profile and strategy
                </p>
                <div className="bg-white p-3 rounded-lg border border-green-100">
                  <div className="text-2xl font-bold text-green-600">+40%</div>
                  <div className="text-sm text-gray-600">Interview rate boost</div>
                </div>
              </div>
            </Card>
          </div>
          
          <div className="text-center">
            <Link href="/ai-dashboard">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                🚀 Access AI Assistant →
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Powerful tools designed to streamline your job search and maximize your success rate
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <Link key={index} href={feature.href}>
              <Card className="h-full cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl group animate-slideIn" style={{ animationDelay: `${index * 150}ms` }}>
                <div className="space-y-4">
                  <div className="text-4xl group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="flex items-center text-indigo-600 font-medium group-hover:translate-x-2 transition-transform duration-300">
                    Explore <span className="ml-2">→</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <Card className="text-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">
            Ready to Transform Your Job Search?
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Join thousands of successful job seekers who've streamlined their process with JobFlow Copilot
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/jobs">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                🎯 Find Jobs Now
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="lg" className="w-full sm:w-auto text-white hover:bg-white hover:bg-opacity-20">
                📈 View Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
