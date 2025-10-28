import Link from "next/link";
import Head from "next/head";
import { Button, Card } from "../components/ui";
import { useState, useEffect } from "react";
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  
  const testimonials = [
    {
      name: "Yael Cohen",
      role: "Software Developer",
      quote: "Finally, a tool that keeps all my job applications organized in one place. No more spreadsheet chaos!",
      result: "Beta tester"
    },
    {
      name: "Daniel Levy", 
      role: "Product Manager",
      quote: "The pipeline view makes it so easy to see where each application stands. Much better than my old system.",
      result: "Early adopter"
    },
    {
      name: "Tamar Goldstein",
      role: "UX Designer",
      quote: "Applytide turned my messy job search into an organized, manageable process. Game changer!",
      result: "Power user"
    }
  ];

  // Auto-rotate testimonials every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  const features = [
    {
      icon: "clipboard",
      title: "Application Tracking",
      description: "Organize every job application with status updates, deadlines, and interview stages",
      metric: "Never lose track"
    },
    {
      icon: "analytics",
      title: "Visual Pipeline",
      description: "See your entire job search at a glance with beautiful Kanban-style boards",
      metric: "Crystal clear view"
    },
    {
      icon: "ai",
      title: "AI Insights",
      description: "Get smart predictions on application success rates and where to focus your efforts",
      metric: "90% accuracy"
    },
    {
      icon: "reminders",
      title: "Smart Reminders",
      description: "Never miss a follow-up, interview, or deadline with intelligent notifications",
      metric: "Zero missed opportunities"
    }
  ];

  const stats = [
    { label: "AI Accuracy", value: "90%+", color: "text-emerald-400", desc: "Job match prediction" },
    { label: "Setup Time", value: "2min", color: "text-blue-400", desc: "Get started instantly" },
    { label: "Features", value: "10+", color: "text-purple-400", desc: "Powerful tools included" },
    { label: "Free Tier", value: "Core", color: "text-orange-400", desc: "Essential features free" }
  ];

  const renderIcon = (iconName) => {
    const iconClass = "w-16 h-16 text-indigo-400";
    switch (iconName) {
      case 'clipboard':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'analytics':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'ai':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'reminders':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Show loading state briefly to prevent auth flash
  if (loading) {
    return (
      <>
        <Head>
          <title>Applytide - Track Every Job Application Like a Pro</title>
          <meta name="description" content="Never lose track of job applications again. Organize, track, and manage your entire job search pipeline with AI insights and smart reminders." />
        </Head>
        <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'}}>
          <div className="text-center space-y-4">
            <img 
              src="/images/logomark.svg" 
              alt="Applytide" 
              className="h-16 w-16 mx-auto animate-pulse"
            />
            <div className="text-slate-300">Loading...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Applytide - Track Every Job Application Like a Pro</title>
        <meta name="description" content="Never lose track of job applications again. Organize, track, and manage your entire job search pipeline with AI insights and smart reminders." />
      </Head>
      
      <div className="min-h-screen" style={{background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'}}>
      {/* Hero Section - Above the fold magic */}
      <div className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-500/10 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000"></div>
          <div className="absolute bottom-10 left-1/2 w-72 h-72 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-2000"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center space-y-8">
            {/* Attention-grabbing headline */}
            <div className="space-y-4">
              
              {/* Applytide Logo */}
              <div className="flex justify-center py-6">
                <div className="relative">
                  <img 
                    src="/images/logomark.svg" 
                    alt="Applytide" 
                    className="h-16 md:h-20 w-auto mx-auto"
                  />
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-center">
                    <span className="text-lg md:text-xl font-medium text-gray-300" style={{fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em', fontSize: '14px'}}>
                      APPLYTIDE
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Personalized greeting for authenticated users */}
              {isAuthenticated && user && (
                <div className="mb-6">
                  <p className="text-lg text-indigo-300 font-medium">
                    Welcome back, {user.full_name?.split(' ')[0] || 'there'}! 👋
                  </p>
                </div>
              )}
              
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-tight">
                Track Every
                <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent animate-pulse">
                  Job Application
                </span>
                <span className="text-4xl md:text-6xl text-gray-200">Like a Pro</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed font-medium">
                Never lose track of job applications again. Applytide organizes every application, 
                tracks <span className="font-bold text-purple-400">interview stages</span>, 
                predicts <span className="font-bold text-blue-400">success rates with AI</span>, 
                and helps you manage your entire job search pipeline in one place.
              </p>
            </div>
            
            {/* Social proof bar */}
            <div className="flex flex-wrap justify-center items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-semibold">Just Launched</span>
              </span>
              <span>•</span>
              <span>Built with <span className="font-semibold text-purple-400">Modern AI</span></span>
              <span>•</span>
              <span>Free to <span className="font-semibold">Start</span></span>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex justify-center items-center pt-4">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button 
                    size="xl" 
                    className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-700 hover:via-purple-700 hover:to-blue-700 text-white font-bold px-10 py-5 text-xl shadow-2xl transform hover:scale-105 transition-all duration-300"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button 
                    size="xl" 
                    className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-700 hover:via-purple-700 hover:to-blue-700 text-white font-bold px-10 py-5 text-xl shadow-2xl transform hover:scale-105 transition-all duration-300"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Get Started
                  </Button>
                </Link>
              )}
            </div>
            
            {/* Instant credibility - Platform stats */}
            <div className="mt-12 p-6 glass-card rounded-2xl shadow-xl border border-white/10 max-w-4xl mx-auto">
              <p className="text-sm text-gray-400 mb-4">Platform capabilities</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className={`text-3xl md:text-4xl font-black ${stat.color} mb-1`}>
                      {stat.value}
                    </div>
                    <div className="text-white font-semibold text-sm">
                      {stat.label}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {stat.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof - Rotating testimonials */}
      <div className="py-16" style={{background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'}}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Early Users Love What We're Building
            </h2>
            <p className="text-gray-300 text-lg">Real feedback from our beta community</p>
          </div>
          
          <div className="relative glass-card rounded-3xl p-8 text-white overflow-hidden border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10"></div>
            <div className="relative">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="text-8xl opacity-50">
                  <svg className="w-20 h-20 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <blockquote className="text-xl md:text-2xl font-medium mb-4 text-gray-200">
                    "{testimonials[currentTestimonial].quote}"
                  </blockquote>
                  <div className="mb-2">
                    <div className="font-bold text-lg text-white">{testimonials[currentTestimonial].name}</div>
                    <div className="text-gray-300">{testimonials[currentTestimonial].role}</div>
                  </div>
                  <div className="inline-flex items-center px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
                    <svg className="w-4 h-4 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-bold text-indigo-300">{testimonials[currentTestimonial].result}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Testimonial indicators */}
          <div className="flex justify-center mt-6 gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentTestimonial ? 'bg-indigo-400 w-8' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Features that convert */}
      <div className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-200 mb-6">
              Everything You Need to Track Applications
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-6">
              Stop losing track of opportunities. Organize your entire job search in one powerful platform.
            </p>
            <Link href="/how-it-works">
              <Button variant="outline" className="border-indigo-500 text-indigo-300 hover:bg-indigo-500/10">
                See How It Works →
              </Button>
            </Link>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="glass-card glass-cyan text-center p-8 hover:border-indigo-500/30 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group"
              >
                <div className="mb-6 group-hover:scale-110 transition-transform duration-300 flex justify-center">
                  {renderIcon(feature.icon)}
                </div>
                <h3 className="text-xl font-bold text-slate-200 mb-4">
                  {feature.title}
                </h3>
                <p className="text-slate-300 mb-4 leading-relaxed">
                  {feature.description}
                </p>
                <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full border border-indigo-500/30">
                  <span className="font-bold text-indigo-300">{feature.metric}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Urgency + FOMO section */}
      <div className="py-16 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <div className="space-y-6">
            <div className="inline-flex items-center px-6 py-3 bg-white/20 rounded-full backdrop-blur-sm">
              <span className="animate-pulse mr-2">🔥</span>
              <span className="font-bold">New Launch: Be Among the First to Experience Next-Gen Job Search</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-black leading-tight">
              The Future of Job Search
              <span className="block">Starts Today</span>
            </h2>
            
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Join the next generation of job seekers who are using AI to work smarter, not harder. 
              Be part of the revolution from day one.
            </p>
            
            <div className="pt-6 flex flex-col items-center justify-center">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button 
                    size="xl"
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 font-bold px-12 py-6 text-xl shadow-2xl transform hover:scale-105 transition-all duration-300 border border-white/20"
                  >
                    <svg className="w-6 h-6 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Continue to Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button 
                    size="xl"
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 font-bold px-12 py-6 text-xl shadow-2xl transform hover:scale-105 transition-all duration-300 border border-white/20"
                  >
                    <svg className="w-6 h-6 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Get Started Now
                  </Button>
                </Link>
              )}
              {!isAuthenticated && (
                <p className="text-sm opacity-75 mt-4 text-center">
                  ✅ Free to start • ✅ No commitment • ✅ Easy setup
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trust signals footer */}
      <div className="py-12" style={{background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'}}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6">
            <p className="text-gray-300 font-medium">Ready to power your job search with modern technology</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="text-2xl font-bold text-indigo-400">Built for 2025</div>
              <div className="text-2xl font-bold text-indigo-400">AI-Powered</div>
              <div className="text-2xl font-bold text-indigo-400">Free to Start</div>
              <div className="text-2xl font-bold text-indigo-400">Modern UX</div>
            </div>
            
            <div className="pt-8 border-t border-white/10">
              <p className="text-gray-400 text-sm">
                © 2025 Applytide. Made with ❤️ for organized job seekers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
