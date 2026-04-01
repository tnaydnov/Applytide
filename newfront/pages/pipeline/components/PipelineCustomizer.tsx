/**
 * PipelineCustomizer Component
 * Customize pipeline stages with drag-and-drop, preset options, and custom stages
 */

import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import {
  Plus,
  X,
  GripVertical,
  Save,
  RotateCcw,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Trash2,
  Search,
} from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import type { PipelineStage } from '../PipelinePage';
import { ALL_STATUS_SUGGESTIONS, DEFAULT_STATUSES } from '../constants/statuses';

// Convert centralized status suggestions to stage format
const POPULAR_STAGES = ALL_STATUS_SUGGESTIONS.map(status => ({
  name: status.name,
  nameHe: status.nameHe,
  color: status.color
}));

// Default stages from centralized configuration
// Using Hebrew names since the app is primarily in Hebrew
const DEFAULT_STAGES: PipelineStage[] = DEFAULT_STATUSES.map((status, index) => ({
  id: status.id,
  name: status.nameHe, // Use Hebrew name for Hebrew-focused app
  color: status.color,
  order: index
}));

interface PipelineCustomizerProps {
  stages: PipelineStage[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (stages: PipelineStage[]) => void;
  isRTL?: boolean;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#10b981', // green
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function PipelineCustomizer({
  stages,
  isOpen,
  onClose,
  onSave,
  isRTL = false,
}: PipelineCustomizerProps) {
  const [localStages, setLocalStages] = useState<PipelineStage[]>(stages);
  const [showPresets, setShowPresets] = useState(false);
  const [customStageName, setCustomStageName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    setLocalStages(stages);
  }, [stages]);

  // Filter popular stages based on search query
  const filteredStages = React.useMemo(() => {
    if (!searchQuery.trim()) return POPULAR_STAGES;
    
    const query = searchQuery.toLowerCase();
    return POPULAR_STAGES.filter(
      (stage) =>
        stage.name.toLowerCase().includes(query) ||
        stage.nameHe.includes(searchQuery)
    );
  }, [searchQuery]);

  const handleNameChange = (id: string, newName: string) => {
    setLocalStages(
      localStages.map((stage) =>
        stage.id === id ? { ...stage, name: newName } : stage
      )
    );
  };

  const handleColorChange = (id: string, newColor: string) => {
    setLocalStages(
      localStages.map((stage) =>
        stage.id === id ? { ...stage, color: newColor } : stage
      )
    );
  };

  const handleAddPresetStage = (stageName: string, color: string) => {
    // Find matching status from centralized config to use its ID
    const matchingStatus = ALL_STATUS_SUGGESTIONS.find(
      s => s.name === stageName || s.nameHe === stageName
    );
    
    const newStage: PipelineStage = {
      id: matchingStatus?.id || `stage_${Date.now()}`,
      name: stageName,
      color: color,
      order: localStages.length,
    };
    setLocalStages([...localStages, newStage]);
    setShowPresets(false);
  };

  const handleAddCustomStage = () => {
    if (!customStageName.trim()) return;
    
    const newStage: PipelineStage = {
      id: `custom_${Date.now()}`,
      name: customStageName.trim(),
      color: PRESET_COLORS[localStages.length % PRESET_COLORS.length],
      order: localStages.length,
    };
    setLocalStages([...localStages, newStage]);
    setCustomStageName('');
    setShowPresets(false);
  };

  const handleRemoveStage = (id: string) => {
    const filtered = localStages.filter((stage) => stage.id !== id);
    const reordered = filtered.map((stage, idx) => ({ ...stage, order: idx }));
    setLocalStages(reordered);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newStages = [...localStages];
    [newStages[index - 1], newStages[index]] = [newStages[index], newStages[index - 1]];
    const reordered = newStages.map((stage, idx) => ({ ...stage, order: idx }));
    setLocalStages(reordered);
  };

  const handleMoveDown = (index: number) => {
    if (index === localStages.length - 1) return;
    const newStages = [...localStages];
    [newStages[index], newStages[index + 1]] = [newStages[index + 1], newStages[index]];
    const reordered = newStages.map((stage, idx) => ({ ...stage, order: idx }));
    setLocalStages(reordered);
  };

  const handleReorder = (newOrder: PipelineStage[]) => {
    const reordered = newOrder.map((stage, idx) => ({ ...stage, order: idx }));
    setLocalStages(reordered);
  };

  const handleReset = () => {
    setLocalStages(DEFAULT_STAGES);
  };

  const handleSave = () => {
    onSave(localStages);
    onClose();
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = localStages.findIndex((stage) => stage.id === active.id);
      const newIndex = localStages.findIndex((stage) => stage.id === over?.id);

      const newStages = arrayMove(localStages, oldIndex, newIndex);
      const reordered = newStages.map((stage, idx) => ({ ...stage, order: idx }));
      setLocalStages(reordered);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-[#383e4e] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="relative bg-gradient-to-r from-[#9F5F80] to-[#383e4e] p-6 text-white flex-shrink-0"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <button
                  onClick={onClose}
                  className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-4 text-white/80 hover:text-white transition-colors`}
                >
                  <X className="h-6 w-6" />
                </button>

                <h2 className={`text-2xl font-bold mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'התאמה אישית של שלבי התהליך' : 'Customize Pipeline Stages'}
                </h2>
                <p className={`text-white/90 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL
                    ? 'עריכת שמות השלבים, הצבעים והסדר'
                    : 'Edit stage names, colors, and order'}
                </p>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="p-6 space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
                  {/* Stages List with Drag and Drop */}
                  <DndContext
                    sensors={sensors}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={localStages}
                      strategy={verticalListSortingStrategy}
                    >
                      <Reorder.Group
                        axis="y"
                        values={localStages}
                        onReorder={handleReorder}
                        className="space-y-3"
                      >
                        {localStages.map((stage, idx) => (
                          <Reorder.Item key={stage.id} value={stage}>
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="bg-gray-50 dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-[#9F5F80]/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {/* Drag Handle & Arrow Controls */}
                                <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                                  <button
                                    onClick={() => handleMoveUp(idx)}
                                    disabled={idx === 0}
                                    className="text-[#6c757d] hover:text-[#383e4e] dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-0.5 hover:bg-white/50 dark:hover:bg-black/20 rounded"
                                    title={isRTL ? 'העבר למעלה' : 'Move up'}
                                  >
                                    <ChevronUp className="h-4 w-4" />
                                  </button>
                                  <GripVertical className="h-4 w-4 text-[#6c757d]" />
                                  <button
                                    onClick={() => handleMoveDown(idx)}
                                    disabled={idx === localStages.length - 1}
                                    className="text-[#6c757d] hover:text-[#383e4e] dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-0.5 hover:bg-white/50 dark:hover:bg-black/20 rounded"
                                    title={isRTL ? 'העבר למטה' : 'Move down'}
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </button>
                                </div>

                                {/* Name Input */}
                                <div className="flex-shrink-0 w-32 min-w-[120px]">
                                  <Input
                                    value={stage.name}
                                    onChange={(e) => handleNameChange(stage.id, e.target.value)}
                                    placeholder={isRTL ? 'שם השלב' : 'Stage name'}
                                    className="bg-white dark:bg-[#383e4e] border-[#b6bac5]/30 h-9 text-sm"
                                  />
                                </div>

                                {/* Color Picker */}
                                <div className="flex gap-1.5 flex-1 justify-center">
                                  {PRESET_COLORS.map((color) => (
                                    <button
                                      key={color}
                                      onClick={() => handleColorChange(stage.id, color)}
                                      className={`
                                        w-7 h-7 rounded-full border-2 transition-all flex-shrink-0
                                        ${
                                          stage.color === color
                                            ? 'border-[#383e4e] dark:border-white scale-110 shadow-lg ring-2 ring-offset-1 ring-[#9F5F80]/30'
                                            : 'border-transparent hover:scale-105 hover:border-white/50'
                                        }
                                      `}
                                      style={{ backgroundColor: color }}
                                      title={color}
                                      aria-label={`Select color ${color}`}
                                    />
                                  ))}
                                </div>

                                {/* Delete Button */}
                                {localStages.length > 1 && (
                                  <button
                                    onClick={() => handleRemoveStage(stage.id)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded transition-all flex-shrink-0"
                                    title={isRTL ? 'מחק שלב' : 'Delete stage'}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>
                    </SortableContext>
                  </DndContext>

                  {/* Add Stage Section */}
                  {!showPresets ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowPresets(true)}
                      className="w-full border-dashed border-2 hover:border-[#9F5F80] hover:bg-[#9F5F80]/5"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {isRTL ? 'הוסף שלב' : 'Add Stage'}
                    </Button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-2 border-dashed border-[#9F5F80]/30 rounded-lg p-4 space-y-4"
                    >
                      {/* Custom Stage Input */}
                      <div>
                        <label className="block text-sm font-medium text-[#383e4e] dark:text-[#b6bac5] mb-2">
                          {isRTL ? 'שלב מותאם אישית' : 'Custom Stage'}
                        </label>
                        <div className="flex gap-2">
                          <Input
                            value={customStageName}
                            onChange={(e) => setCustomStageName(e.target.value)}
                            placeholder={isRTL ? 'הכנס שם שלב...' : 'Enter stage name...'}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddCustomStage();
                              }
                            }}
                          />
                          <Button
                            onClick={handleAddCustomStage}
                            disabled={!customStageName.trim()}
                            style={{
                              background: customStageName.trim()
                                ? 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)'
                                : undefined,
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-[#b6bac5]/20" />
                        <span className="text-sm text-[#6c757d]">
                          {isRTL ? 'או בחר מהשלבים הפופולריים' : 'or choose from popular stages'}
                        </span>
                        <div className="flex-1 h-px bg-[#b6bac5]/20" />
                      </div>

                      {/* Search Input */}
                      <div className="relative">
                        <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-[#6c757d]`} />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={isRTL ? 'חפש שלבים...' : 'Search stages...'}
                          className={`${isRTL ? 'pr-10' : 'pl-10'} bg-white dark:bg-[#383e4e] border-[#b6bac5]/30`}
                        />
                      </div>

                      {/* Popular Stages Grid */}
                      <div className="max-h-60 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-2">
                          {filteredStages.length > 0 ? (
                            filteredStages.map((preset) => (
                              <button
                                key={preset.name}
                                onClick={() => handleAddPresetStage(preset.name, preset.color)}
                                className="
                                  flex items-center gap-2 p-3 rounded-lg
                                  bg-white dark:bg-[#383e4e]
                                  border border-[#b6bac5]/20
                                  hover:border-[#9F5F80]
                                  hover:bg-[#9F5F80]/5
                                  transition-all text-left
                                  group
                                "
                              >
                                <div
                                  className="w-4 h-4 rounded-full flex-shrink-0 group-hover:scale-110 transition-transform"
                                  style={{ backgroundColor: preset.color }}
                                />
                                <span className="text-sm text-[#383e4e] dark:text-[#b6bac5] truncate">
                                  {isRTL ? preset.nameHe : preset.name}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="col-span-2 text-center py-8 text-[#6c757d] text-sm">
                              {isRTL ? 'לא נמצאו שלבים' : 'No stages found'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Close Presets Button */}
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowPresets(false);
                          setCustomStageName('');
                        }}
                        className="w-full"
                      >
                        {isRTL ? 'ביטול' : 'Cancel'}
                      </Button>
                    </motion.div>
                  )}

                  {/* Drag and Drop Hint */}
                  <div className="flex items-center gap-2 text-xs text-[#6c757d] bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <span>
                      {isRTL
                        ? 'טיפ: גרור שלבים כדי לסדר מחדש או השתמש בחצים למעלה/למטה'
                        : 'Tip: Drag stages to reorder or use up/down arrows'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                className="p-6 bg-gray-50 dark:bg-[#383e4e]/50 border-t border-[#b6bac5]/20 flex gap-3"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {isRTL ? 'אפס לברירת מחדל' : 'Reset to Default'}
                </Button>

                <div className="flex-1" />

                <Button variant="outline" onClick={onClose}>
                  {isRTL ? 'ביטול' : 'Cancel'}
                </Button>

                <Button
                  onClick={handleSave}
                  style={{
                    background: 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)',
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isRTL ? 'שמור שינויים' : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default PipelineCustomizer;