/**
 * PageAnnotations Component
 * Static page annotations that highlight and explain different areas
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';

export interface Annotation {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  color: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface PageAnnotationsProps {
  isOpen: boolean;
  onClose: () => void;
  annotations: Annotation[];
  isRTL?: boolean;
}

export function PageAnnotations({
  isOpen,
  onClose,
  annotations,
  isRTL = false,
}: PageAnnotationsProps) {
  const [elementPositions, setElementPositions] = useState<
    Record<string, DOMRect>
  >({});
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const borderRefsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const tooltipRefsRef = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!isOpen) return;

    let rafId: number;

    const updatePositions = () => {
      // Get scrollbar width (only exists when page is scrollable)
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      annotations.forEach((annotation) => {
        const element = document.querySelector(annotation.targetSelector);
        const borderEl = borderRefsRef.current[annotation.id];
        const tooltipEl = tooltipRefsRef.current[annotation.id];

        if (element && borderEl) {
          const rect = element.getBoundingClientRect();

          // Calculate position with RTL offset
          let left = rect.left;
          let right = rect.right;

          if (isRTL && scrollbarWidth > 0) {
            left -= scrollbarWidth;
            right -= scrollbarWidth;
          }

          // Direct DOM manipulation - SUPER FAST! 🚀
          borderEl.style.left = `${left}px`;
          borderEl.style.top = `${rect.top}px`;
          borderEl.style.width = `${rect.width}px`;
          borderEl.style.height = `${rect.height}px`;

          // Update tooltip position if it exists
          if (tooltipEl) {
            const tooltipPos = getTooltipPositionDirect(rect, annotation);
            tooltipEl.style.left = tooltipPos.left;
            tooltipEl.style.top = tooltipPos.top;
          }
        }
      });
    };

    // Continuous RAF loop for smooth updates
    const animate = () => {
      updatePositions();
      rafId = requestAnimationFrame(animate);
    };

    // Start the loop
    animate();

    // Also listen to resize
    window.addEventListener('resize', updatePositions);

    return () => {
      window.removeEventListener('resize', updatePositions);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isOpen, annotations, isRTL]);

  // Helper for direct tooltip positioning
  const getTooltipPositionDirect = (rect: DOMRect, annotation: Annotation) => {
    const tooltipWidth = 280;
    const tooltipHeight = 100;
    const margin = 16;
    const position = annotation.position || 'right';

    let left = 0;
    let top = 0;

    switch (position) {
      case 'top':
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        top = rect.top - margin - tooltipHeight;
        break;
      case 'bottom':
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        top = rect.bottom + margin;
        break;
      case 'left':
        left = rect.left - margin - tooltipWidth;
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        break;
      case 'right':
      default:
        left = rect.right + margin;
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        break;
    }

    const padding = 16;
    left = Math.max(
      padding,
      Math.min(left, window.innerWidth - tooltipWidth - padding)
    );
    top = Math.max(
      padding + 80,
      Math.min(top, window.innerHeight - tooltipHeight - padding)
    ); // 80px for header buttons

    return {
      left: `${left}px`,
      top: `${top}px`,
    };
  };

  // Initial positions for first render (prevents flash)
  useEffect(() => {
    if (!isOpen) return;

    const positions: Record<string, DOMRect> = {};
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    annotations.forEach((annotation) => {
      const element = document.querySelector(annotation.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();

        if (isRTL && scrollbarWidth > 0) {
          const adjustedRect = {
            ...rect.toJSON(),
            left: rect.left - scrollbarWidth,
            right: rect.right - scrollbarWidth,
            x: rect.x - scrollbarWidth,
          } as DOMRect;
          positions[annotation.id] = adjustedRect;
        } else {
          positions[annotation.id] = rect;
        }
      }
    });
    setElementPositions(positions);
  }, [isOpen, annotations, isRTL]);

  if (!isOpen) return null;

  // Check if element is visible in viewport
  const isElementVisible = (rect: DOMRect): boolean => {
    return (
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    );
  };

  const getTooltipPosition = (
    rect: DOMRect,
    annotation: Annotation
  ): React.CSSProperties => {
    const tooltipWidth = 280;
    const tooltipHeight = 100; // approximate
    const margin = 16;
    const position = annotation.position || 'right';

    let left = 0;
    let top = 0;

    // Calculate position based on preference
    switch (position) {
      case 'top':
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        top = rect.top - margin - tooltipHeight;
        break;
      case 'bottom':
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        top = rect.bottom + margin;
        break;
      case 'left':
        left = rect.left - margin - tooltipWidth;
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        break;
      case 'right':
      default:
        left = rect.right + margin;
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        break;
    }

    // Keep within viewport
    const padding = 16;
    left = Math.max(
      padding,
      Math.min(left, window.innerWidth - tooltipWidth - padding)
    );
    top = Math.max(
      padding + 80,
      Math.min(top, window.innerHeight - tooltipHeight - padding)
    ); // 80px for header buttons

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${tooltipWidth}px`,
    };
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Light backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[200]"
              onClick={onClose}
            />

            {/* Highlighted borders and tooltips */}
            {annotations.map((annotation, index) => {
              const rect = elementPositions[annotation.id];
              if (!rect || !isElementVisible(rect)) return null;

              const isHovered = hoveredAnnotation === annotation.id;

              // Calculate precise border position - match element exactly
              const borderStyle = {
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
              };

              return (
                <React.Fragment key={annotation.id}>
                  {/* Highlighted Border + Number Badge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="fixed pointer-events-auto cursor-pointer"
                    style={{
                      ...borderStyle,
                      zIndex: 220 + index,
                      outline: `3px solid ${annotation.color}`,
                      outlineOffset: '-3px',
                      borderRadius: '12px',
                      boxShadow: `0 0 0 2px rgba(0,0,0,0.1), 0 0 20px ${annotation.color}40`,
                    }}
                    onMouseEnter={() => setHoveredAnnotation(annotation.id)}
                    onMouseLeave={() => setHoveredAnnotation(null)}
                    onClick={() => {
                      // On mobile, toggle tooltip on click
                      if (window.innerWidth < 768) {
                        setHoveredAnnotation(isHovered ? null : annotation.id);
                      }
                    }}
                    ref={(el) => (borderRefsRef.current[annotation.id] = el)}
                  >
                    {/* Number Badge */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.05 + 0.1, type: 'spring', stiffness: 300 }}
                      className={`absolute -top-3 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${
                        isRTL ? '-right-3' : '-left-3'
                      }`}
                      style={{
                        backgroundColor: annotation.color,
                        fontSize: '14px',
                      }}
                    >
                      {index + 1}
                    </motion.div>

                    {/* Pulse effect when hovered */}
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute inset-0 rounded-xl"
                        style={{
                          backgroundColor: annotation.color,
                        }}
                      />
                    )}
                  </motion.div>

                  {/* Tooltip on hover */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="fixed pointer-events-none z-[250]"
                        style={getTooltipPosition(rect, annotation)}
                        ref={(el) => (tooltipRefsRef.current[annotation.id] = el)}
                      >
                        <div
                          className="rounded-2xl p-4 shadow-2xl border-2"
                          style={{
                            backgroundColor: 'rgba(56, 62, 78, 0.98)',
                            borderColor: annotation.color,
                          }}
                        >
                          {/* Title */}
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: annotation.color }}
                            >
                              {index + 1}
                            </div>
                            <div
                              className="font-bold text-base"
                              style={{ color: annotation.color }}
                            >
                              {annotation.title}
                            </div>
                          </div>

                          {/* Description */}
                          <div className="text-sm text-[#b6bac5] leading-relaxed">
                            {annotation.description}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}

            {/* Close button */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="fixed bottom-24 right-6 z-[250]"
            >
              <Button
                onClick={onClose}
                size="lg"
                className="bg-gradient-to-r from-[#9F5F80] to-[#8a5472] hover:from-[#8a5472] hover:to-[#7a4a63] shadow-2xl"
              >
                <X className="h-6 w-6 mr-2" />
                {isRTL ? 'סגור הסבר' : 'Close Guide'}
              </Button>
            </motion.div>

            {/* Header - instruction text */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="fixed bottom-6 left-6 z-[250] bg-gradient-to-r from-[#383e4e] to-[#2a2f3d] text-white px-6 py-3 rounded-2xl shadow-2xl border border-[#b6bac5]/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#9F5F80] animate-pulse" />
                <span className="text-sm">
                  {isRTL
                    ? '💡 העבר עכבר על אזור כדי לראות הסבר'
                    : '💡 Hover over an area to see its explanation'}
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default PageAnnotations;