/**
 * WeeklyGoalSelector Component
 * Dropdown to set weekly application goal
 */

import React, { useState } from "react";
import { Target } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { motion, AnimatePresence } from "motion/react";

interface WeeklyGoalSelectorProps {
  weeklyGoal: number;
  onUpdate: (goal: number) => void;
  isRTL?: boolean;
}

const PRESET_GOALS = [3, 5, 7, 10, 15, 20];

export function WeeklyGoalSelector({
  weeklyGoal,
  onUpdate,
  isRTL = false,
}: WeeklyGoalSelectorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const handlePresetClick = (goal: number) => {
    onUpdate(goal);
    setShowMenu(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseInt(customValue, 10);
    if (value > 0 && value <= 100) {
      onUpdate(value);
      setCustomValue("");
      setShowMenu(false);
    }
  };

  return (
    <div
      className="relative"
      dir={isRTL ? "rtl" : "ltr"}
      data-tutorial="weekly-goal"
    >
      <Button
        onClick={() => setShowMenu(!showMenu)}
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border-0 text-white transition-all h-8"
      >
        <span className="font-bold">{weeklyGoal}</span>
        <Target className="h-4 w-4" />
      </Button>

      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className={`absolute ${isRTL ? "left-0" : "right-0"} mt-2 w-64 bg-white dark:bg-[#383e4e] border border-[#b6bac5]/30 rounded-xl shadow-xl z-50 overflow-hidden`}
            >
              {/* Custom Input */}
              <div className="p-4 border-b border-[#b6bac5]/20">
                <p className="text-xs text-[#6c757d] dark:text-[#b6bac5] font-medium mb-2">
                  {isRTL
                    ? "הגדירו יעד מותאם אישית"
                    : "Set custom goal"}
                </p>
                <form
                  onSubmit={handleCustomSubmit}
                  className="flex gap-2"
                >
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={customValue}
                    onChange={(e) =>
                      setCustomValue(e.target.value)
                    }
                    placeholder={isRTL ? "מותאם" : "Custom"}
                    className="flex-1 h-9 text-sm"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="px-4"
                    style={{
                      background:
                        "linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)",
                    }}
                  >
                    {isRTL ? "הגדירו" : "Set"}
                  </Button>
                </form>
              </div>

              {/* Preset Goals */}
              <div className="py-2">
                <p className="px-4 py-2 text-xs text-[#6c757d] dark:text-[#b6bac5]">
                  {isRTL ? "בחירה מהירה:" : "Quick presets:"}
                </p>
                {PRESET_GOALS.map((goal) => (
                  <button
                    key={goal}
                    onClick={() => handlePresetClick(goal)}
                    className={`w-full px-4 py-2.5 text-sm transition-colors ${isRTL ? "text-right" : "text-left"} ${
                      weeklyGoal === goal
                        ? "bg-[#9F5F80]/20 text-[#9F5F80] font-semibold"
                        : "text-[#383e4e] dark:text-white hover:bg-[#b6bac5]/10"
                    }`}
                  >
                    {isRTL
                      ? `${goal} מועמדויות לשבוע`
                      : `${goal} applications/week`}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WeeklyGoalSelector;