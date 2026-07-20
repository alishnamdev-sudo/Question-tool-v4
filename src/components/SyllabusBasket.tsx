import React, { useState, useMemo, useEffect } from "react";
import { Search, Plus, Trash2, BookOpen, AlertCircle, Sparkles, PlusCircle, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "motion/react";
import { TaxonomyNode, SelectedBasketItem } from "../types";
import { SearchableSelect } from "./SearchableSelect";
import { SearchableMultiSelect } from "./SearchableMultiSelect";

const getBasketStyle = (pattern: string) => {
  switch (pattern) {
    case "JEE":
      return {
        cardTint: "bg-radial from-track-bg-jee to-white border-brand-purple/20",
        border: "border-brand-purple/30 group-hover:border-brand-purple/80",
        bgLight: "bg-brand-purple/10 hover:bg-brand-purple/20 text-brand-purple",
        accent: "text-brand-purple",
        btnActive: "bg-brand-purple hover:bg-brand-purple/90 text-white shadow-lg shadow-brand-purple/10",
        badge: "bg-brand-purple/10 text-brand-purple font-bold border-brand-purple/20", 
        glow: "shadow-brand-purple/5",
        barColor: "bg-brand-purple"
      };
    case "NEET":
      return {
        cardTint: "bg-radial from-track-bg-neet to-white border-brand-peach/40",
        border: "border-brand-peach/50 group-hover:border-brand-peach/80",
        bgLight: "bg-brand-peach/10 hover:bg-brand-peach/20 text-[oklch(55%_0.15_55)]",
        accent: "text-[oklch(55%_0.15_55)]",
        btnActive: "bg-[oklch(62%_0.15_55)] hover:bg-[oklch(55%_0.15_55)] text-white shadow-lg shadow-amber-500/10",
        badge: "bg-brand-peach/10 text-[oklch(55%_0.15_55)] font-bold border-brand-peach/20",
        glow: "shadow-amber-500/5",
        barColor: "bg-[oklch(62%_0.15_55)]"
      };
    case "CBSE":
    default:
      return {
        cardTint: "bg-radial from-track-bg-centre to-white border-brand-mint/30",
        border: "border-brand-mint/40 group-hover:border-brand-mint/80",
        bgLight: "bg-brand-mint/10 hover:bg-brand-mint/20 text-[oklch(50%_0.12_160)]",
        accent: "text-[oklch(50%_0.12_160)]",
        btnActive: "bg-[oklch(55%_0.12_160)] hover:bg-[oklch(48%_0.12_160)] text-white shadow-lg shadow-emerald-500/10",
        badge: "bg-brand-mint/10 text-[oklch(50%_0.12_160)] font-bold border-brand-mint/20",
        glow: "shadow-emerald-500/5",
        barColor: "bg-[oklch(55%_0.12_160)]"
      };
  }
};

interface SyllabusBasketProps {
  taxonomyData: TaxonomyNode[];
  basket: SelectedBasketItem[];
  onBasketChange: (newBasket: SelectedBasketItem[]) => void;
  examPattern: string;
}

export function SyllabusBasket({
  taxonomyData,
  basket,
  onBasketChange,
  examPattern,
}: SyllabusBasketProps) {
  const bStyle = getBasketStyle(examPattern);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAvailableTopicsOpen, setIsAvailableTopicsOpen] = useState(false);

  // Extract unique grades from current taxonomy dataset
  const uniqueGrades = useMemo(() => {
    const grades = Array.from(new Set(taxonomyData.map((node) => node.grade))).filter(Boolean);
    return grades.sort((a, b) => {
      // Sort numeric strings correctly
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [taxonomyData]);

  // Set default grades (all available grades: e.g. Grade 11 & Grade 12) when dataset loads
  useEffect(() => {
    if (uniqueGrades.length > 0) {
      setSelectedGrades(uniqueGrades);
    }
  }, [uniqueGrades]);

  // Extract unique subjects for the selected grade(s)
  const uniqueSubjects = useMemo(() => {
    if (selectedGrades.length === 0) return [];
    const subjects = Array.from(
      new Set(
        taxonomyData
          .filter((node) => selectedGrades.includes(node.grade))
          .map((node) => node.subject)
      )
    ).filter(Boolean);
    return subjects.sort();
  }, [taxonomyData, selectedGrades]);

  // Set default subject when grade or subject lists update
  useEffect(() => {
    if (uniqueSubjects.length > 0) {
      if (!selectedSubject || !uniqueSubjects.includes(selectedSubject)) {
        setSelectedSubject(uniqueSubjects[0]);
      }
    } else {
      setSelectedSubject("");
    }
  }, [uniqueSubjects]);

  // Extract unique chapters of selected subject & grade(s)
  const uniqueChapters = useMemo(() => {
    if (selectedGrades.length === 0 || !selectedSubject) return [];
    const chapters = Array.from(
      new Set(
        taxonomyData
          .filter((node) => selectedGrades.includes(node.grade) && node.subject === selectedSubject)
          .map((node) => node.chapterName)
      )
    ).filter(Boolean);
    return chapters.sort();
  }, [taxonomyData, selectedGrades, selectedSubject]);

  // Handle cascaded updates when higher selector changes to prevent stale items
  const handleGradesChange = (gradesList: string[]) => {
    setSelectedGrades(gradesList);
    setSelectedChapters([]);
    setSelectedTopics([]);
    setSelectedSubtopics([]);
  };

  const handleSubjectChange = (subject: string) => {
    setSelectedSubject(subject);
    setSelectedChapters([]);
    setSelectedTopics([]);
    setSelectedSubtopics([]);
  };

  const handleChaptersChange = (chaptersList: string[]) => {
    setSelectedChapters(chaptersList);
    setSelectedTopics([]);
    setSelectedSubtopics([]);
  };

  // Extract unique topics of selected subject, grade(s) & chapters
  const uniqueTopics = useMemo(() => {
    if (selectedGrades.length === 0 || !selectedSubject) return [];
    
    // Fall back to all unique chapters for the selected subject/grades if none are explicitly selected
    const chaptersToSearch = selectedChapters.length > 0 ? selectedChapters : uniqueChapters;
    
    const topics = Array.from(
      new Set(
        taxonomyData
          .filter(
            (node) =>
              selectedGrades.includes(node.grade) &&
              node.subject === selectedSubject &&
              chaptersToSearch.includes(node.chapterName)
          )
          .map((node) => node.topicName)
      )
    ).filter(Boolean);
    return topics.sort();
  }, [taxonomyData, selectedGrades, selectedSubject, selectedChapters, uniqueChapters]);

  const handleTopicsChange = (topicsList: string[]) => {
    setSelectedTopics(topicsList);
    setSelectedSubtopics([]);
  };

  // Extract unique subtopics
  const uniqueSubtopics = useMemo(() => {
    if (selectedGrades.length === 0 || !selectedSubject) return [];
    
    // Fall back to parent lists if sub-levels are not selected
    const chaptersToSearch = selectedChapters.length > 0 ? selectedChapters : uniqueChapters;
    const topicsToSearch = selectedTopics.length > 0 ? selectedTopics : uniqueTopics;
    
    const subtopics = Array.from(
      new Set(
        taxonomyData
          .filter(
            (node) =>
              selectedGrades.includes(node.grade) &&
              node.subject === selectedSubject &&
              chaptersToSearch.includes(node.chapterName) &&
              topicsToSearch.includes(node.topicName)
          )
          .map((node) => node.subTopic01)
      )
    ).filter(Boolean);
    return subtopics.sort();
  }, [taxonomyData, selectedGrades, selectedSubject, selectedChapters, uniqueChapters, selectedTopics, uniqueTopics]);

  // Filter and search taxonomy list based on all hierarchical cascading states and search queries
  const filteredNodes = useMemo(() => {
    let list = taxonomyData;
    
    // Filter by grade if selected
    if (selectedGrades.length > 0) {
      list = list.filter((node) => selectedGrades.includes(node.grade));
    }
    
    // Filter by subject if selected
    if (selectedSubject) {
      list = list.filter((node) => node.subject === selectedSubject);
    }

    // Filter by chapter if selected
    if (selectedChapters.length > 0) {
      list = list.filter((node) => selectedChapters.includes(node.chapterName));
    }

    // Filter by topic if selected
    if (selectedTopics.length > 0) {
      list = list.filter((node) => selectedTopics.includes(node.topicName));
    }

    // Filter by subtopic if selected
    if (selectedSubtopics.length > 0) {
      list = list.filter((node) => selectedSubtopics.includes(node.subTopic01));
    }

    // Search query matches Chapter, Topic, or Subtopic
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter((node) => {
        const chapter = (node.chapterName || "").toLowerCase();
        const topicName = (node.topicName || "").toLowerCase();
        const subtopic = (node.subTopic01 || "").toLowerCase();
        return (
          chapter.includes(query) ||
          topicName.includes(query) ||
          subtopic.includes(query)
        );
      });
    }

    return list;
  }, [taxonomyData, selectedGrades, selectedSubject, selectedChapters, selectedTopics, selectedSubtopics, searchQuery]);

  // Add individual node to basket
  const addToBasket = (node: TaxonomyNode) => {
    const id = `${node.grade}-${node.subject}-${node.chapterName}-${node.topicName}-${node.subTopic01 || "all"}`;
    if (basket.some((item) => item.id === id)) return; // Prevent duplicate entries

    const newItem: SelectedBasketItem = {
      id,
      node,
      count: 6, // default question count: 2 Easy, 2 Medium, 2 Hard
      lodDistribution: { Easy: 2, Medium: 2, Hard: 2 },
    };
    onBasketChange([...basket, newItem]);
  };

  // Add all currently filtered nodes/topics to the basket in bulk
  const addAllToBasket = () => {
    const toAdd = filteredNodes.filter((node) => {
      const uniqueId = `${node.grade}-${node.subject}-${node.chapterName}-${node.topicName}-${node.subTopic01 || "all"}`;
      return !basket.some((item) => item.id === uniqueId);
    });

    if (toAdd.length === 0) return;

    const newItems = toAdd.map((node) => {
      const id = `${node.grade}-${node.subject}-${node.chapterName}-${node.topicName}-${node.subTopic01 || "all"}`;
      return {
        id,
        node,
        count: 6, // default question count
        lodDistribution: { Easy: 2, Medium: 2, Hard: 2 },
      };
    });

    onBasketChange([...basket, ...newItems]);
  };

  // Remove item from basket
  const removeFromBasket = (id: string) => {
    onBasketChange(basket.filter((item) => item.id !== id));
  };

  // Handle direct changes of difficult distribution fields
  const handleDifficultyChange = (
    id: string,
    difficulty: "Easy" | "Medium" | "Hard",
    value: number
  ) => {
    const cleanValue = Math.max(0, Math.min(50, value));
    onBasketChange(
      basket.map((item) => {
        if (item.id !== id) return item;
        const newDistribution = {
          ...item.lodDistribution,
          [difficulty]: cleanValue,
        };
        const newCount = newDistribution.Easy + newDistribution.Medium + newDistribution.Hard;
        return {
          ...item,
          count: newCount,
          lodDistribution: newDistribution,
        };
      })
    );
  };

  // Calculate totals across basket
  const totals = useMemo(() => {
    return basket.reduce(
      (acc, item) => {
        acc.easy += item.lodDistribution.Easy;
        acc.medium += item.lodDistribution.Medium;
        acc.hard += item.lodDistribution.Hard;
        acc.total += item.count;
        return acc;
      },
      { easy: 0, medium: 0, hard: 0, total: 0 }
    );
  }, [basket]);

  return (
    <div className="space-y-6">
      {/* Search and Filters Section */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-4">
        
        {/* Cascade row 1: Grades & Subject */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchableMultiSelect
            label="Syllabus Grades (Select one or more)"
            options={uniqueGrades}
            selectedValues={selectedGrades}
            onChange={handleGradesChange}
            placeholder="Search / Select Grades..."
            disabled={uniqueGrades.length === 0}
          />

          <SearchableSelect
            label="Syllabus Subject"
            options={uniqueSubjects}
            value={selectedSubject}
            onChange={handleSubjectChange}
            placeholder="Select Syllabus Subject..."
            disabled={uniqueSubjects.length === 0}
          />
        </div>

        {/* Cascade row 2: Chapters, Topics, Subtopics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SearchableMultiSelect
            label="Syllabus Chapters"
            options={uniqueChapters}
            selectedValues={selectedChapters}
            onChange={handleChaptersChange}
            placeholder="Search/Select Chapters..."
            disabled={uniqueChapters.length === 0}
          />

          <SearchableMultiSelect
            label="Syllabus Topics"
            options={uniqueTopics}
            selectedValues={selectedTopics}
            onChange={handleTopicsChange}
            placeholder="Search/Select Topics..."
            disabled={uniqueTopics.length === 0}
          />

          <SearchableMultiSelect
            label="Syllabus Subtopics (Optional)"
            options={uniqueSubtopics}
            selectedValues={selectedSubtopics}
            onChange={setSelectedSubtopics}
            placeholder="Search/Select Subtopics..."
            disabled={uniqueSubtopics.length === 0}
          />
        </div>

        {/* Search Bar for manual term matching */}
        <div className="space-y-1.5 pt-1 border-t border-slate-200/55">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Search Selector Filter</span>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter topics and subtopics currently listed below..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-white px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-slate-200 focus-visible:ring-primary shadow-sm"
            />
          </div>
        </div>

        {/* Matching Topics List Box */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsAvailableTopicsOpen(!isAvailableTopicsOpen)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider cursor-pointer focus:outline-none"
            >
              {isAvailableTopicsOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
              Available Matching Topics ({filteredNodes.length})
            </button>
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Clear Search Filter
              </button>
            )}
          </div>

          {isAvailableTopicsOpen ? (
            <div className="space-y-2 animate-in fade-in duration-200">
              <div className="max-h-56 overflow-y-auto border border-slate-200/80 rounded-lg bg-white divide-y divide-slate-100 shadow-inner">
                {filteredNodes.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 italic">
                    No matching syllabus topics found under current filter selections. Try relaxing filters.
                  </div>
                ) : (
                  filteredNodes.slice(0, 150).map((node, idx) => {
                    const uniqueId = `${node.grade}-${node.subject}-${node.chapterName}-${node.topicName}-${node.subTopic01 || "all"}`;
                    const isInBasket = basket.some((item) => item.id === uniqueId);
                    return (
                      <div
                        key={idx}
                        className="p-2.5 flex items-start justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 font-bold rounded border border-slate-200">
                              Class {node.grade}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded border border-emerald-100">
                              {node.chapterName}
                            </span>
                            {node.subTopic01 && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-medium rounded border border-indigo-100">
                                Subtopic
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-semibold text-slate-800 leading-snug break-words" title={node.topicName}>
                            {node.topicName}
                          </h4>
                          {node.subTopic01 && (
                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed" title={node.subTopic01}>
                              📍 Subtopic: <span className="text-indigo-600 font-semibold">{node.subTopic01}</span>
                            </p>
                          )}
                        </div>
                        
                        <button
                          type="button"
                          disabled={isInBasket}
                          onClick={() => addToBasket(node)}
                          className={`flex items-center gap-1.5 text-[11px] font-extrabold py-1 px-3.5 rounded-full border shrink-0 transition-all cursor-pointer ${
                            isInBasket
                              ? "bg-slate-50 border-slate-250 text-slate-400 cursor-not-allowed"
                              : `${bStyle.bgLight} border-transparent hover:shadow-xs scale-[1.01]`
                          }`}
                        >
                          {isInBasket ? "Added ✓" : (
                            <>
                              <Plus className="w-3 h-3" />
                              Add Stream
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              
              {filteredNodes.length > 0 && (
                <button
                  type="button"
                  onClick={addAllToBasket}
                  className={`mt-3.5 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${bStyle.btnActive} hover:brightness-95`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Add All {filteredNodes.length} Matching Topics to Active Basket
                </button>
              )}
            </div>
          ) : (
            <div 
              onClick={() => setIsAvailableTopicsOpen(true)}
              className="border border-dashed border-slate-200 rounded-lg p-4 text-center text-xs text-slate-400 bg-slate-50/50 hover:bg-slate-50 cursor-pointer select-none"
            >
              Syllabus matching topics are currently hidden. <span className="text-primary font-bold hover:underline">Click to view ({filteredNodes.length} topics)</span>
            </div>
          )}
        </div>
      </div>

      {/* Syllabi Selections Basket List */}
      {basket.length > 0 && (
        <div className="space-y-3.5 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between border-b pb-2 border-slate-100">
            <div className="flex items-center gap-2">
              <BookOpen className={`w-4 h-4 ${bStyle.accent}`} />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Active Paper Blueprint Components ({basket.length})</h3>
            </div>
            <button
              type="button"
              onClick={() => onBasketChange([])}
              className="text-[10px] text-rose-600 hover:text-rose-800 font-extrabold flex items-center gap-1 transition-colors uppercase tracking-wider cursor-pointer"
            >
              <Trash2 className="w-3 w-3" />
              Clear Selection
            </button>
          </div>
 
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {basket.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ y: -3, transition: { duration: 0.15 } }}
                className={`bg-white border ${bStyle.border} p-4 rounded-2xl shadow-xs transition-shadow hover:shadow-md space-y-3 relative group overflow-hidden pl-5`}
              >
                {/* Left side brand color bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${bStyle.barColor}`} />

                {/* Header info */}
                <div className="flex justify-between items-start gap-4 pr-6">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 block tracking-wider uppercase font-mono">
                      Class {item.node.grade} • {item.node.subject} • {item.node.chapterName}
                    </span>
                    <h4 className="text-sm font-black text-slate-800 leading-snug">
                      {item.node.topicName}
                    </h4>
                    {item.node.subTopic01 && (
                      <span className="inline-block text-[9px] text-indigo-700 bg-indigo-50/50 border border-indigo-100/60 px-2 py-0.5 rounded-full mt-1.5 font-bold">
                        📍 Subchapter: {item.node.subTopic01}
                      </span>
                    )}
                  </div>
                  
                  {/* Remove button absolute right-top */}
                  <button
                    type="button"
                    onClick={() => removeFromBasket(item.id)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-rose-600 transition-colors p-1.5 hover:bg-slate-50 rounded-xl"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
 
                {/* Question Difficulty Distribution */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-emerald-600 uppercase block tracking-wider">Easy</label>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDifficultyChange(item.id, "Easy", item.lodDistribution.Easy - 1)}
                        className="w-5 h-5 rounded-lg border bg-white border-slate-200 hover:bg-slate-150 flex items-center justify-center font-black text-xs cursor-pointer select-none transition-all"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={item.lodDistribution.Easy}
                        onChange={(e) => handleDifficultyChange(item.id, "Easy", parseInt(e.target.value) || 0)}
                        className="w-8 border bg-white text-center text-xs font-bold rounded-lg py-0.5 border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => handleDifficultyChange(item.id, "Easy", item.lodDistribution.Easy + 1)}
                        className="w-5 h-5 rounded-lg border bg-white border-slate-200 hover:bg-slate-150 flex items-center justify-center font-black text-xs cursor-pointer select-none transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
 
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-amber-600 uppercase block tracking-wider">Medium</label>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDifficultyChange(item.id, "Medium", item.lodDistribution.Medium - 1)}
                        className="w-5 h-5 rounded-lg border bg-white border-slate-200 hover:bg-slate-150 flex items-center justify-center font-black text-xs cursor-pointer select-none transition-all"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={item.lodDistribution.Medium}
                        onChange={(e) => handleDifficultyChange(item.id, "Medium", parseInt(e.target.value) || 0)}
                        className="w-8 border bg-white text-center text-xs font-bold rounded-lg py-0.5 border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => handleDifficultyChange(item.id, "Medium", item.lodDistribution.Medium + 1)}
                        className="w-5 h-5 rounded-lg border bg-white border-slate-200 hover:bg-slate-150 flex items-center justify-center font-black text-xs cursor-pointer select-none transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
 
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-rose-600 uppercase block tracking-wider">Hard</label>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDifficultyChange(item.id, "Hard", item.lodDistribution.Hard - 1)}
                        className="w-5 h-5 rounded-lg border bg-white border-slate-200 hover:bg-slate-150 flex items-center justify-center font-black text-xs cursor-pointer select-none transition-all"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={item.lodDistribution.Hard}
                        onChange={(e) => handleDifficultyChange(item.id, "Hard", parseInt(e.target.value) || 0)}
                        className="w-8 border bg-white text-center text-xs font-bold rounded-lg py-0.5 border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => handleDifficultyChange(item.id, "Hard", item.lodDistribution.Hard + 1)}
                        className="w-5 h-5 rounded-lg border bg-white border-slate-200 hover:bg-slate-150 flex items-center justify-center font-black text-xs cursor-pointer select-none transition-all"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
 
          {/* Totals Summary */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4.5 space-y-3 mt-4">
            <div className="flex items-center gap-1.5">
              <Sparkles className={`w-4 h-4 ${bStyle.accent}`} />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Blueprint Distribution Summary</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[10px] text-emerald-600 font-bold block">Easy</span>
                <span className="text-sm font-black text-slate-850">{totals.easy}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[10px] text-amber-600 font-bold block">Medium</span>
                <span className="text-sm font-black text-slate-850">{totals.medium}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-[10px] text-rose-600 font-bold block">Hard</span>
                <span className="text-sm font-black text-slate-850">{totals.hard}</span>
              </div>
              <div className={`${bStyle.barColor} text-white p-2.5 rounded-xl border border-transparent shadow-md shadow-slate-200/50`}>
                <span className="text-[10px] opacity-90 font-bold block leading-none">Total Items</span>
                <span className="text-base font-black leading-none pt-0.5">{totals.total}</span>
              </div>
            </div>
            
            <p className="text-[10.5px] text-slate-500 leading-relaxed font-semibold text-center pt-1">
              Active Selection: Bound to {basket.length} topics from live {examPattern} curriculum matrix.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
