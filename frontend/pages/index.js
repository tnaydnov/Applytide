import Link from "next/link";
import Head from "next/head";
import { Button, Card } from "../components/ui";
import { useState, useEffect } from "react";

export default function Home() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  
  const testimonials = [
    {
      name: "Yael Cohen",
      role: "Software Developer",
      image: "👩‍💻",
      quote: "Finally, a tool that keeps all my job applications organized in one place. No more spreadsheet chaos!",
      result: "Beta tester"
    },
    {
      name: "Daniel Levy", 
      role: "Product Manager",
      image: "👨‍💼",
      quote: "The pipeline view makes it so easy to see where each application stands. Much better than my old system.",
      result: "Early adopter"
    },
    {
      name: "Tamar Goldstein",
      role: "UX Designer",
      image: "👩‍🎨",
      quote: "Applytide turned my messy job search into an organized, manageable process. Game changer!",
      result: "Power user"
    }
  ];

  const features = [
    {
      icon: "📋",
      title: "Application Tracking",
      description: "Organize every job application with status updates, deadlines, and interview stages",
      metric: "Never lose track"
    },
    {
      icon: "📊",
      title: "Visual Pipeline",
      description: "See your entire job search at a glance with beautiful Kanban-style boards",
      metric: "Crystal clear view"
    },
    {
      icon: "🤖",
      title: "AI Insights",
      description: "Get smart predictions on application success rates and where to focus your efforts",
      metric: "90% accuracy"
    },
    {
      icon: "⏰",
      title: "Smart Reminders",
      description: "Never miss a follow-up, interview, or deadline with intelligent notifications",
      metric: "Zero missed opportunities"
    }
  ];

  const stats = [
    { label: "AI Accuracy", value: "90%+", color: "text-emerald-600", desc: "Job match prediction" },
    { label: "Setup Time", value: "2min", color: "text-blue-600", desc: "Get started instantly" },
    { label: "Features", value: "10+", color: "text-purple-600", desc: "Powerful tools included" },
    { label: "Free Tier", value: "Core", color: "text-orange-600", desc: "Essential features free" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Head>
        <title>Applytide - Track Every Job Application Like a Pro</title>
        <meta name="description" content="Never lose track of job applications again. Organize, track, and manage your entire job search pipeline with AI insights and smart reminders." />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Section - Above the fold magic */}
      <div className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute bottom-10 left-1/2 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center space-y-8">
            {/* Attention-grabbing headline */}
            <div className="space-y-4">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full shadow-lg animate-bounce">
                <span style={{color: 'black', fontWeight: 'bold', fontSize: '14px'}}>
                  🎯 New: Smart Job Application Tracker
                </span>
              </div>
              
              {/* Applytide Logo */}
              <div className="flex justify-center py-6">
                <div className="relative">
                  <img 
                    src="/images/logomark.svg" 
                    alt="Applytide" 
                    className="h-16 md:h-20 w-auto mx-auto"
                  />
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-center">
                    <span className="text-lg md:text-xl font-medium text-gray-600" style={{fontFamily: 'Outfit, Inter, sans-serif', letterSpacing: '0.05em', fontSize: '14px'}}>
                      APPLYTIDE
                    </span>
                  </div>
                </div>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-tight">
                Track Every
                <span className="block bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent animate-pulse">
                  Job Application
                </span>
                <span className="text-4xl md:text-6xl">Like a Pro</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-medium">
                Never lose track of job applications again. Applytide organizes every application, 
                tracks <span className="font-bold text-purple-600">interview stages</span>, 
                predicts <span className="font-bold text-blue-600">success rates with AI</span>, 
                and helps you manage your entire job search pipeline in one place.
              </p>
            </div>
            
            {/* Social proof bar */}
            <div className="flex flex-wrap justify-center items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                🚀 <span className="font-semibold">Just Launched</span>
              </span>
              <span>•</span>
              <span>Built with <span className="font-semibold text-purple-600">Modern AI</span></span>
              <span>•</span>
              <span>Free to <span className="font-semibold">Start</span></span>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex justify-center items-center pt-4">
              <Link href="/login">
                <Button 
                  size="xl" 
                  className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 text-white font-bold px-10 py-5 text-xl shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  🚀 Get Started
                </Button>
              </Link>
            </div>
            
            {/* Instant credibility - Platform stats */}
            <div className="mt-12 p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 max-w-4xl mx-auto">
              <p className="text-sm text-gray-500 mb-4">Platform capabilities</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className={`text-3xl md:text-4xl font-black ${stat.color} mb-1`}>
                      {stat.value}
                    </div>
                    <div className="text-gray-700 font-semibold text-sm">
                      {stat.label}
                    </div>
                    <div className="text-gray-500 text-xs">
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
      <div className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Early Users Love What We're Building
            </h2>
            <p className="text-gray-600 text-lg">Real feedback from our beta community</p>
          </div>
          
          <div className="relative bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl p-8 text-white overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="text-8xl opacity-50">
                  {testimonials[currentTestimonial].image}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <blockquote className="text-xl md:text-2xl font-medium mb-4">
                    "{testimonials[currentTestimonial].quote}"
                  </blockquote>
                  <div className="mb-2">
                    <div className="font-bold text-lg">{testimonials[currentTestimonial].name}</div>
                    <div className="opacity-90">{testimonials[currentTestimonial].role}</div>
                  </div>
                  <div className="inline-flex items-center px-4 py-2 bg-white/20 rounded-full backdrop-blur-sm">
                    <span className="font-bold">🎯 {testimonials[currentTestimonial].result}</span>
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
                  index === currentTestimonial ? 'bg-purple-500 w-8' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Features that convert */}
      <div className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Everything You Need to Track Applications
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stop losing track of opportunities. Organize your entire job search in one powerful platform.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="text-center p-8 bg-white border-2 border-transparent hover:border-purple-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group"
              >
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {feature.description}
                </p>
                <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full">
                  <span className="font-bold text-purple-700">{feature.metric}</span>
                </div>
              </Card>
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
            
            <div className="pt-6">
              <Link href="/login">
                <Button 
                  size="xl"
                  className="bg-white text-purple-600 hover:bg-gray-100 font-bold px-12 py-6 text-xl shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  🚀 Get Started Now
                </Button>
              </Link>
              <p className="text-sm opacity-75 mt-4">
                ✅ Free to start • ✅ No commitment • ✅ Easy setup
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust signals footer */}
      <div className="py-12 bg-white border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6">
            <p className="text-gray-500 font-medium">Ready to power your job search with modern technology</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="text-2xl font-bold text-gray-400">Built for 2025</div>
              <div className="text-2xl font-bold text-gray-400">AI-Powered</div>
              <div className="text-2xl font-bold text-gray-400">Free to Start</div>
              <div className="text-2xl font-bold text-gray-400">Modern UX</div>
            </div>
            
            <div className="pt-8 border-t border-gray-200">
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
