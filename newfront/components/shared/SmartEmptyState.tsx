/**
 * SmartEmptyState Component
 * Smart empty states with contextual guidance and clear CTAs
 */

import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

interface Tip {
  emoji: string;
  text: string;
}

interface SmartEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  tips?: Tip[];
  primaryAction: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  isRTL?: boolean;
  className?: string;
}

export function SmartEmptyState({
  icon,
  title,
  description,
  tips,
  primaryAction,
  secondaryAction,
  isRTL = false,
  className = '',
}: SmartEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Icon with gradient background */}
      {icon && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-8"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#9F5F80]/20 to-[#383e4e]/20 rounded-3xl blur-2xl" />
            <div className="relative p-6 bg-gradient-to-br from-white to-gray-50 dark:from-[#383e4e] dark:to-[#2a2f3d] rounded-3xl border-2 border-[#9F5F80]/30 shadow-2xl">
              <div className="text-[#9F5F80]">{icon}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-3xl md:text-4xl text-center mb-4"
      >
        {title}
      </motion.h2>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-lg text-muted-foreground text-center max-w-md mb-8 leading-relaxed"
      >
        {description}
      </motion.p>

      {/* Tips Section */}
      {tips && tips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-lg mb-8"
        >
          <div className="bg-gradient-to-br from-[#9F5F80]/5 to-[#383e4e]/5 dark:from-[#9F5F80]/10 dark:to-[#383e4e]/10 rounded-2xl p-6 border border-[#9F5F80]/20">
            <div className={`flex items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Sparkles className="h-5 w-5 text-[#9F5F80]" />
              <h3 className="font-semibold text-[#383e4e] dark:text-white">
                {isRTL ? 'טיפים להתחלה:' : 'Quick Tips:'}
              </h3>
            </div>
            <ul className={`space-y-3 ${isRTL ? 'text-right' : 'text-left'}`}>
              {tips.map((tip, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                >
                  <span className="text-2xl flex-shrink-0">{tip.emoji}</span>
                  <span className="text-sm text-muted-foreground leading-relaxed pt-1">
                    {tip.text}
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col sm:flex-row gap-4 items-center w-full max-w-md"
      >
        <Button
          onClick={primaryAction.onClick}
          size="lg"
          className="w-full sm:flex-1 bg-gradient-to-r from-[#9F5F80] to-[#8a5472] hover:from-[#8a5472] hover:to-[#7a4a63] shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
        >
          {primaryAction.icon || <ArrowRight className={`h-5 w-5 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />}
          {primaryAction.label}
        </Button>

        {secondaryAction && (
          <Button
            onClick={secondaryAction.onClick}
            variant="outline"
            size="lg"
            className="w-full sm:flex-1 border-2 border-[#9F5F80]/30 hover:border-[#9F5F80]/50 hover:bg-[#9F5F80]/5"
          >
            {secondaryAction.label}
          </Button>
        )}
      </motion.div>

      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#9F5F80]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#383e4e]/5 rounded-full blur-3xl" />
      </div>
    </motion.div>
  );
}

export default SmartEmptyState;
