import { useState } from 'react';
import FeedbackModal from './FeedbackModal';
import { useAuth } from '../contexts/AuthContext';

const FloatingFeedbackButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { isAuthenticated } = useAuth();

  // Only show the feedback button for authenticated users
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsModalOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="group relative bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white p-5 rounded-full shadow-2xl transform hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-300"
          style={{
            animation: 'pulse-glow 2s infinite'
          }}
          aria-label="Send Feedback"
        >
          {/* Glowing effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur-xl opacity-70 group-hover:opacity-90 transition-opacity duration-300"></div>
          
          {/* Icon */}
          <div className="relative z-10 flex items-center justify-center">
            <svg 
              className="w-8 h-8 transform group-hover:rotate-12 transition-transform duration-300" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
              />
            </svg>
          </div>

          {/* Beta badge */}
          <div className="absolute -top-3 -right-3 bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-bounce">
            BETA
          </div>
        </button>

        {/* Tooltip */}
        <div 
          className={`absolute bottom-full right-0 mb-2 transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <div className="bg-gray-900 text-white text-sm font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            💬 Send Feedback
            <div className="absolute top-full right-4 w-2 h-2 bg-gray-900 transform rotate-45 -mt-1"></div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      {/* Custom CSS for glowing animation */}
      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 25px rgba(99, 102, 241, 0.4), 0 0 50px rgba(147, 51, 234, 0.3);
          }
          50% {
            box-shadow: 0 0 35px rgba(99, 102, 241, 0.6), 0 0 70px rgba(147, 51, 234, 0.5);
          }
        }
        
        /* Make sure button is above other fixed elements */
        .z-40 {
          z-index: 40;
        }
      `}</style>
    </>
  );
};

export default FloatingFeedbackButton;