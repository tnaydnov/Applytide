import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Briefcase,
  Send,
  GitBranch,
  BarChart3,
  Bell,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useLanguage } from '../../contexts/LanguageContext';
import { safeSetItem } from '../../lib/storage';

interface WelcomeStep {
  id: string;
  titleEn: string;
  titleHe: string;
  descriptionEn: string;
  descriptionHe: string;
  icon: React.ElementType;
  color: string;
}

const welcomeSteps: WelcomeStep[] = [
  {
    id: 'intro',
    titleEn: 'Welcome to Applytide! 🌊',
    titleHe: 'ברוכים הבאים ל-Applytide! 🌊',
    descriptionEn:
      "Your AI-powered job search companion. We'll help you find your dream job faster with smart tools and insights.",
    descriptionHe:
      'בן הלוויה שלכם לחיפוש עבודה מבוסס בינה מלאכותית. נעזור לכם למצוא את עבודת החלומות מהר יותר עם כלים ותובנות חכמות.',
    icon: Sparkles,
    color: '#9F5F80',
  },
  {
    id: 'workflow',
    titleEn: 'How Applytide Works',
    titleHe: 'איך Applytide עובד',
    descriptionEn:
      'Follow our simple 6-step workflow: Upload documents → Find jobs → Generate cover letters → Track applications → Analyze performance → Set reminders.',
    descriptionHe:
      'עקבו אחר תהליך העבודה הפשוט בן 6 השלבים שלנו: העלאת מסמכים → מציאת משרות → יצירת מכתבי מקדים → מעקב אחר מועמדויות → ניתוח ביצועים → הגדרת תזכורות.',
    icon: Target,
    color: '#6366f1',
  },
  {
    id: 'ai-power',
    titleEn: 'AI-Powered Features',
    titleHe: 'תכונות מבוססות בינה מלאכותית',
    descriptionEn:
      'Generate tailored cover letters, get resume analysis, and receive personalized insights to improve your job search success rate.',
    descriptionHe:
      'צרו מכתבי מקדים מותאמים אישית, קבלו ניתוח קורות חיים, וקבלו תובנות מותאמות אישית כדי לשפר את אחוז ההצלחה בחיפוש העבודה שלכם.',
    icon: Zap,
    color: '#f59e0b',
  },
  {
    id: 'track-improve',
    titleEn: 'Track & Improve',
    titleHe: 'מעקב ושיפור',
    descriptionEn:
      'Monitor all your applications in one place, analyze your performance, and optimize your strategy based on data-driven insights.',
    descriptionHe:
      'עקבו אחר כל המועמדויות שלכם במקום אחד, נתחו את הביצועים שלכם, ושפרו את האסטרטגיה שלכם על בסיס תובנות מונעות נתונים.',
    icon: TrendingUp,
    color: '#10b981',
  },
];

interface ImprovedWelcomeModalProps {
  onComplete: () => void;
  onOpenAddJob?: () => void;
}

export function ImprovedWelcomeModal({
  onComplete,
  onOpenAddJob: _onOpenAddJob,
}: ImprovedWelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const step = welcomeSteps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === welcomeSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      safeSetItem('welcomeShown', 'true');
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    safeSetItem('welcomeShown', 'true');
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl mx-4"
      >
        <div className="bg-gradient-to-br from-[#383e4e] via-[#2a2f3d] to-[#1f232e] rounded-3xl shadow-2xl overflow-hidden border border-[#b6bac5]/20 relative">
          {/* Decorative background elements */}
          <div
            className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ background: step.color }}
          />
          <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-10 bg-[#9F5F80]" />

          {/* Content */}
          <div className="relative z-10 p-8 md:p-12">
            {/* Step Indicator */}
            <div className="flex justify-center gap-2 mb-8">
              {welcomeSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-12 bg-[#9F5F80]'
                      : 'w-2 bg-white/20 hover:bg-white/30'
                  }`}
                />
              ))}
            </div>

            {/* Icon */}
            <motion.div
              key={step.id}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className="flex justify-center mb-6"
            >
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${step.color} 0%, ${step.color}CC 100%)`,
                }}
              >
                <Icon className="w-12 h-12 text-white" />
              </div>
            </motion.div>

            {/* Title & Description */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center mb-8"
              >
                <h2 className="text-3xl md:text-4xl text-white mb-4">
                  {isRTL ? step.titleHe : step.titleEn}
                </h2>
                <p className="text-lg text-[#b6bac5] max-w-xl mx-auto leading-relaxed">
                  {isRTL ? step.descriptionHe : step.descriptionEn}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Visual Workflow (on workflow step) */}
            {step.id === 'workflow' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-8"
              >
                {[
                  { icon: FileText, label: isRTL ? 'מסמכים' : 'Docs' },
                  { icon: Briefcase, label: isRTL ? 'משרות' : 'Jobs' },
                  { icon: Send, label: isRTL ? 'הגשה' : 'Apply' },
                  { icon: GitBranch, label: isRTL ? 'מעקב' : 'Track' },
                  { icon: BarChart3, label: isRTL ? 'ניתוח' : 'Analyze' },
                  { icon: Bell, label: isRTL ? 'תזכורות' : 'Remind' },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#9F5F80]/20 flex items-center justify-center border border-[#9F5F80]/30">
                      <item.icon className="w-6 h-6 text-[#9F5F80]" />
                    </div>
                    <span className="text-xs text-[#b6bac5]">
                      {item.label}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {isRTL ? (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  ) : (
                    <ArrowLeft className="w-4 h-4 mr-2" />
                  )}
                  {isRTL ? 'הקודם' : 'Previous'}
                </Button>
              )}

              {isLastStep ? (
                <Button
                  onClick={handleSkip}
                  className="flex-1"
                  style={{
                    background:
                      'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)',
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isRTL ? 'בואו נתחיל!' : 'Get Started!'}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleNext}
                    className="flex-1"
                    style={{
                      background:
                        'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)',
                    }}
                  >
                    {isRTL ? 'הבא' : 'Next'}
                    {isRTL ? (
                      <ArrowLeft className="w-4 h-4 ml-2" />
                    ) : (
                      <ArrowRight className="w-4 h-4 ml-2" />
                    )}
                  </Button>
                  {currentStep === 0 && (
                    <Button
                      variant="ghost"
                      onClick={handleSkip}
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      {isRTL ? 'דלג' : 'Skip'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}