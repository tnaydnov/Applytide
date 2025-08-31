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
      icon: "📄",
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
              Your <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Dream Job
              </span> Awaits
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed animate-slideIn">
              Transform your job search with JobFlow Copilot - the intelligent platform that turns 
              chaos into clarity, helping you land your perfect role faster than ever.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slideIn">
            <Link href="/jobs">
              <Button size="xl" className="w-full sm:w-auto">
                🚀 Start Job Hunting
              </Button>
            </Link>
            <Link href="/pipeline">
              <Button variant="outline" size="xl" className="w-full sm:w-auto">
                📊 View Pipeline
              </Button>
            </Link>
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
