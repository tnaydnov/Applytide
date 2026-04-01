/**
 * EmptyState Component
 * Reusable empty state component with icon, message, and CTA
 */

import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  emoji?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  emoji,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}
    >
      {/* Icon or Emoji */}
      {emoji && (
        <div className="text-6xl mb-6 animate-bounce">
          {emoji}
        </div>
      )}
      {icon && (
        <div className="mb-6 text-[#9F5F80]">
          {icon}
        </div>
      )}

      {/* Title */}
      <h3 className="text-2xl font-bold text-[#383e4e] dark:text-white mb-3">
        {title}
      </h3>

      {/* Description */}
      <p className="text-[#6c757d] dark:text-[#b6bac5] max-w-md mb-8 leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      {action && (
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Button
            onClick={action.onClick}
            variant={action.variant || 'default'}
            className="min-w-[200px]"
            style={{
              background: action.variant === 'default' 
                ? 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)'
                : undefined,
            }}
          >
            {action.label}
          </Button>

          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              className="min-w-[200px]"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default EmptyState;
