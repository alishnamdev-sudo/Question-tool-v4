import React, { useState, useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { 
  Upload, 
  FileText, 
  Trash2, 
  Loader2, 
  Download, 
  Settings, 
  BookOpen, 
  FileQuestion, 
  Copy, 
  Check,
  FileSpreadsheet,
  Database,
  HelpCircle,
  LogOut,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  SlidersHorizontal,
  Sparkles,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { marked } from "marked";
import JSZip from "jszip";

import { initAuth, googleSignIn, logout } from "./lib/firebaseAuth";
import { parseQuestions, formatQuestionsAsText, convertMarkdownToHtmlForPrinting, QuestionItem } from "./lib/questionParser";
import { generateQuestionsOnlyLatex, generateQuestionsWithSolutionsLatex } from "./lib/latexExporter";
import { generateReadableWordDocument } from "./lib/wordExporter";
import { createAndPopulateSpreadsheet, appendToExistingSpreadsheet, extractSpreadsheetId } from "./services/sheetsService";

const urlTransform = (url: string) => {
  if (url.startsWith('data:')) return url;
  return defaultUrlTransform(url);
};

const MathMarkdown = React.memo(
  function MathMarkdown({ content }: { content: string }) {
    if (!content) return null;
    return (
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    );
  },
  (prevProps, nextProps) => prevProps.content === nextProps.content
);

const RichMathMarkdown = React.memo(
  function RichMathMarkdown({ content }: { content: string }) {
    if (!content) return null;
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]} 
        rehypePlugins={[rehypeKatex]}
        urlTransform={urlTransform}
      >
        {content}
      </ReactMarkdown>
    );
  },
  (prevProps, nextProps) => prevProps.content === nextProps.content
);

import { Button } from "@/lib/ui/button";
import { Input } from "@/lib/ui/input";
import { Label } from "@/lib/ui/label";
import { Textarea } from "@/lib/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/lib/ui/card";
import { generateQuestions, UploadedFile, GenerationConfig } from "@/services/geminiService";
import { SearchableSelect } from "./components/SearchableSelect";
import { SearchableMultiSelect } from "./components/SearchableMultiSelect";
import { SyllabusBasket } from "./components/SyllabusBasket";
import { WorkspaceCard } from "@/lib/ui/workspace-card";
import { SelectedBasketItem } from "./types";
import { renderPdfPagesToImages } from "./lib/pdfRenderer";

const getStreamStyle = (pattern: string) => {
  switch (pattern) {
    case "JEE":
      return {
        cardTint: "bg-gradient-to-br from-track-bg-jee to-white border-brand-purple/20",
        border: "border-brand-purple/30",
        badge: "bg-brand-purple/10 text-brand-purple border-brand-purple/20",
        accent: "text-brand-purple",
        btnActive: "bg-brand-purple hover:bg-brand-purple/90 text-white shadow-lg shadow-brand-purple/10",
        bgLight: "bg-brand-purple/5",
        name: "JEE Advanced Stream",
        streamKey: "jee"
      };
    case "NEET":
      return {
        cardTint: "bg-gradient-to-br from-track-bg-neet to-white border-brand-peach/30",
        border: "border-brand-peach/40",
        badge: "bg-brand-peach/10 text-[oklch(55%_0.15_55)] border-brand-peach/20",
        accent: "text-[oklch(55%_0.15_55)]",
        btnActive: "bg-[oklch(62%_0.15_55)] hover:bg-[oklch(55%_0.15_55)] text-white shadow-lg shadow-amber-500/10",
        bgLight: "bg-brand-peach/5",
        name: "NEET Medical Stream",
        streamKey: "neet"
      };
    case "CBSE":
    default:
      return {
        cardTint: "bg-gradient-to-br from-track-bg-centre to-white border-brand-mint/20",
        border: "border-brand-mint/30",
        badge: "bg-brand-mint/10 text-[oklch(50%_0.12_160)] border-brand-mint/20",
        accent: "text-[oklch(50%_0.12_160)]",
        btnActive: "bg-[oklch(55%_0.12_160)] hover:bg-[oklch(48%_0.12_160)] text-white shadow-lg shadow-emerald-500/10",
        bgLight: "bg-brand-mint/5",
        name: "CBSE Academy Stream",
        streamKey: "offline"
      };
  }
};

export default function App() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [customExtractFiles, setCustomExtractFiles] = useState<UploadedFile[]>([]);
  const [customSubject, setCustomSubject] = useState("Physics");
  const [customChapter, setCustomChapter] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [customTotalCount, setCustomTotalCount] = useState<number | "">("");
  const [customScqCount, setCustomScqCount] = useState<number | "">("");
  const [customNumericalCount, setCustomNumericalCount] = useState<number | "">("");
  const [generationMode, setGenerationMode] = useState<"KNOWLEDGE_BASE" | "SOURCE_BASED">("SOURCE_BASED");
  const [examPattern, setExamPattern] = useState("JEE");
  const [topic, setTopic] = useState("Kinematics");
  const [easyCount, setEasyCount] = useState(5);
  const [mediumCount, setMediumCount] = useState(5);
  const [hardCount, setHardCount] = useState(5);
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [selectedModel, setSelectedModel] = useState("auto");
  const [withFigures, setWithFigures] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [error, setError] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isCopiedReadable, setIsCopiedReadable] = useState(false);
  const [isCopiedRaw, setIsCopiedRaw] = useState(false);
  const [printType, setPrintType] = useState<"question" | "solutions" | null>(null);
  const [currentView, setCurrentView] = useState<"CONFIG" | "OUTPUT">("CONFIG");
  const [previewMode, setPreviewMode] = useState<"compiled" | "raw">("compiled");

  const [generationMeta, setGenerationMeta] = useState<{
    batches: Array<{
      model: string;
      batchIndex: number;
      slots: Array<{
        globalNum: number;
        topicName: string;
        subTopic: string;
        difficulty: string;
      }>;
    }>;
  }>({ batches: [] });

  // Google Sheets Syllabus Syllabus Taxonomy states
  const [taxonomy, setTaxonomy] = useState<any[]>([]);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(false);

  const taxonomyChapters = useMemo(() => {
    if (!taxonomy || taxonomy.length === 0) return [];
    const filtered = taxonomy.filter(item => {
      if (!customSubject) return true;
      return item.subject?.toLowerCase() === customSubject.toLowerCase();
    });
    return Array.from(new Set(filtered.map(item => item.chapterName))).filter(Boolean).sort() as string[];
  }, [taxonomy, customSubject]);
  const [taxonomyError, setTaxonomyError] = useState("");
  const [syllabusMode, setSyllabusMode] = useState<"google" | "custom">("google");
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [basket, setBasket] = useState<SelectedBasketItem[]>([]);

  // RAG Past papers states and handlers
  const [enableRag, setEnableRag] = useState(true);
  const [retrievedPyqs, setRetrievedPyqs] = useState<any[]>([]);
  const [isLoadingPyqs, setIsLoadingPyqs] = useState(false);

  // Custom JEE Main PYQs database states
  const [customPyqStatus, setCustomPyqStatus] = useState<any>(null);
  const [isUploadingCustomPyqs, setIsUploadingCustomPyqs] = useState(false);
  const [customPyqUploadError, setCustomPyqUploadError] = useState<string | null>(null);
  const [customPyqUploadSuccess, setCustomPyqUploadSuccess] = useState<string | null>(null);
  const [showSampleFormat, setShowSampleFormat] = useState(false);

  const fetchCustomPyqStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/custom-pyqs/status");
      if (res.ok) {
        const data = await res.json();
        setCustomPyqStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch custom PYQ database status:", e);
    }
  }, []);

  // Fetch matching past year papers (RAG) when selections change
  const fetchMatchingPyqs = useCallback(async () => {
    if (!enableRag) {
      setRetrievedPyqs([]);
      return;
    }
    
    setIsLoadingPyqs(true);
    try {
      const activeTopic = syllabusMode === "custom" ? topic : "";
      const payload = {
        basket: syllabusMode === "google" ? basket : [],
        topic: activeTopic,
        subject: syllabusMode === "custom" ? customSubject : "",
        examPattern
      };

      const res = await fetch("/api/past-papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setRetrievedPyqs(data);
      }
    } catch (e) {
      console.error("Failed to fetch matching past papers for RAG preview:", e);
    } finally {
      setIsLoadingPyqs(false);
    }
  }, [enableRag, syllabusMode, basket, topic, customSubject, examPattern]);

  React.useEffect(() => {
    fetchMatchingPyqs();
  }, [fetchMatchingPyqs]);

  React.useEffect(() => {
    fetchCustomPyqStatus();
  }, [fetchCustomPyqStatus]);

  const handleCustomPyqUpload = async (file: File) => {
    setIsUploadingCustomPyqs(true);
    setCustomPyqUploadError(null);
    setCustomPyqUploadSuccess(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          if (!Array.isArray(parsed)) {
            throw new Error("JSON file must contain an array of question objects.");
          }
          
          const res = await fetch("/api/custom-pyqs/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questions: parsed })
          });
          
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Failed to upload to server.");
          }
          
          const result = await res.json();
          setCustomPyqUploadSuccess(result.message);
          await fetchCustomPyqStatus();
          await fetchMatchingPyqs(); // Refresh current matching list with new data
        } catch (jsonErr: any) {
          setCustomPyqUploadError(jsonErr.message || "Invalid JSON syntax. Please check your file.");
        } finally {
          setIsUploadingCustomPyqs(false);
        }
      };
      reader.onerror = () => {
        setCustomPyqUploadError("Error reading file.");
        setIsUploadingCustomPyqs(false);
      };
      reader.readAsText(file);
    } catch (e: any) {
      setCustomPyqUploadError(e.message || "Failed to process file upload.");
      setIsUploadingCustomPyqs(false);
    }
  };

  const handleClearCustomPyqs = async () => {
    if (!window.confirm("Are you sure you want to delete your custom JEE PYQ database and revert to the system default?")) {
      return;
    }
    try {
      const res = await fetch("/api/custom-pyqs/clear", { method: "POST" });
      if (res.ok) {
        await fetchCustomPyqStatus();
        await fetchMatchingPyqs();
      }
    } catch (e) {
      console.error("Failed to clear custom PYQs database:", e);
    }
  };
  
  // Question type mix states and helpers
  const [questionMix, setQuestionMix] = useState({
    SCQ: 3,
    NUMERICAL: 2
  });

  const totalBasketQuestions = syllabusMode === "google"
    ? basket.reduce((acc, curr) => acc + curr.count, 0)
    : (easyCount + mediumCount + hardCount);

  const parsedQuestions = useMemo(() => {
    if (!generatedContent) return [];
    const questions = parseQuestions(generatedContent, totalBasketQuestions);

    // Build a map of globalNum to slot difficulty
    const slotDifficultyMap = new Map<number, string>();
    if (generationMeta && generationMeta.batches) {
      generationMeta.batches.forEach(b => {
        if (b.slots) {
          b.slots.forEach(s => {
            if (s.globalNum && s.difficulty) {
              slotDifficultyMap.set(s.globalNum, s.difficulty);
            }
          });
        }
      });
    }

    // Align each question's level with the slot's requested difficulty, preserving detailed LOD Index if already matching
    return questions.map(q => {
      const targetDifficulty = slotDifficultyMap.get(q.number);
      if (targetDifficulty) {
        const cleanTarget = targetDifficulty.trim().toLowerCase();
        const cleanLevel = (q.level || "").trim().toLowerCase();
        // If the parsed level already starts with or contains the target difficulty (e.g., "hard (lod index: 9.2)"), preserve it!
        if (cleanLevel.startsWith(cleanTarget) || cleanLevel.includes(cleanTarget)) {
          return q;
        }
        return {
          ...q,
          level: targetDifficulty.charAt(0).toUpperCase() + targetDifficulty.slice(1).toLowerCase()
        };
      }
      return q;
    });
  }, [generatedContent, totalBasketQuestions, generationMeta]);

  const totalMixQuestions = questionMix.SCQ + questionMix.NUMERICAL;

  const activeDisplayTopic = useMemo(() => {
    if (syllabusMode === "google") {
      return basket.length > 0 
        ? basket[0].node.topicName + (basket.length > 1 ? ` +${basket.length - 1}` : "") 
        : "None";
    } else {
      // Custom mode / PDF question digitization
      const cleanCh = (customChapter && customChapter !== "__custom__") ? customChapter : "";
      if (cleanCh) {
        return customTopic ? `${cleanCh} (${customTopic})` : cleanCh;
      }
      return customTopic || "General PDF Extraction";
    }
  }, [syllabusMode, basket, customChapter, customTopic]);

  const activeDisplayTopicTooltip = useMemo(() => {
    if (syllabusMode === "google") {
      return basket.length > 0 
        ? basket.map(b => b.node.topicName).join(", ") 
        : "None";
    } else {
      const cleanCh = (customChapter && customChapter !== "__custom__") ? customChapter : "";
      const parts = [];
      if (customSubject) parts.push(customSubject);
      if (cleanCh) parts.push(cleanCh);
      if (customTopic) parts.push(customTopic);
      return parts.join(" → ") || "General PDF Extraction";
    }
  }, [syllabusMode, basket, customSubject, customChapter, customTopic]);

  const getDownloadFilename = useCallback((suffix: string) => {
    let base = "Questions";
    if (syllabusMode === "google") {
      if (basket.length > 0) {
        base = basket[0].node.chapterName || basket[0].node.topicName || topic;
      } else {
        base = topic;
      }
    } else {
      // In Custom mode, use Chapter Name as entered before processing (customChapter)
      const cleanCh = (customChapter && customChapter !== "__custom__") ? customChapter : "";
      if (cleanCh) {
        base = cleanCh;
      } else if (customTopic) {
        base = customTopic;
      } else if (customSubject) {
        base = `${customSubject}_Extraction`;
      } else {
        base = "PDF_Extraction";
      }
    }
    // Clean up filename characters
    const cleanBase = base.replace(/[^a-zA-Z0-9_ -]/g, "").trim().replace(/[\s-]+/g, "_");
    return `${cleanBase}_${suffix}`;
  }, [syllabusMode, basket, customChapter, customTopic, customSubject, topic]);

  const handleTypeChange = (type: "SCQ" | "NUMERICAL", value: number) => {
    setQuestionMix(prev => ({
      ...prev,
      [type]: Math.max(0, value)
    }));
  };

  // Auto balance types as totals change
  React.useEffect(() => {
    const scqCount = Math.ceil(totalBasketQuestions * 0.6);
    const numericalCount = Math.max(0, totalBasketQuestions - scqCount);
    setQuestionMix({
      SCQ: scqCount >= 0 ? scqCount : 0,
      NUMERICAL: numericalCount >= 0 ? numericalCount : 0
    });
  }, [totalBasketQuestions]);

  // Clean up print mode state after print screen completes or is cancelled
  React.useEffect(() => {
    const handleAfterPrint = () => setPrintType(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);
  
  // Google Sheets state
  const [user, setUser] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [exportTarget, setExportTarget] = useState<"new" | "existing">("new");
  const [spreadsheetTitle, setSpreadsheetTitle] = useState("");
  const [existingSpreadsheetUrl, setExistingSpreadsheetUrl] = useState("");
  const [exportingSheets, setExportingSheets] = useState(false);
  const [exportSuccessUrl, setExportSuccessUrl] = useState("");
  const [exportSuccessTitle, setExportSuccessTitle] = useState("");
  const [sheetsError, setSheetsError] = useState("");
  const [isExportingZip, setIsExportingZip] = useState(false);

  // Processing visualization state
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Timer effect
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating && processingStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - processingStartTime) / 1000));
        // Simulate progress
        setProgress((prev) => Math.min(prev + 1, 95));
        // Simulate token usage
        setTokensUsed((prev) => prev + Math.floor(Math.random() * 50));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, processingStartTime]);

  // Fetch Google Sheets Syllabus Taxonomy when mounting or when examPattern changes
  React.useEffect(() => {
    const fetchTaxonomy = async () => {
      setLoadingTaxonomy(true);
      setTaxonomyError("");
      try {
        console.log(`Fetching taxonomy dataset for ${examPattern} from back-end API...`);
        const response = await fetch(`/api/taxonomy?pattern=${encodeURIComponent(examPattern)}`);
        if (!response.ok) {
          throw new Error(`Failed to load syllabus taxonomy for ${examPattern}.`);
        }
        const data = await response.json();
        console.log(`Successfully fetched ${examPattern} taxonomy of size:`, data.length);
        
        setTaxonomy(data);
        
        // Reset cascading values upon load of new dataset
        if (data && data.length > 0) {
          const uniqueGrades = Array.from(new Set(data.map((item: any) => item.grade as string))).filter(Boolean).sort() as string[];
          const defaultGrade = uniqueGrades[0] || "";
          setSelectedGrades(defaultGrade ? [defaultGrade] : []);

          const uniqueSubjects = Array.from(new Set(
            data.filter((item: any) => item.grade === defaultGrade).map((item: any) => item.subject as string)
          )).filter(Boolean).sort() as string[];
          const defaultSubject = uniqueSubjects[0] || "";
          setSelectedSubject(defaultSubject);

          const uniqueChapters = Array.from(new Set(
            data.filter((item: any) => item.grade === defaultGrade && item.subject === defaultSubject).map((item: any) => item.chapterName as string)
          )).filter(Boolean).sort() as string[];
          const defaultChapter = uniqueChapters[0] || "";
          setSelectedChapters(defaultChapter ? [defaultChapter] : []);

          const uniqueTopics = Array.from(new Set(
            data.filter((item: any) => item.grade === defaultGrade && item.subject === defaultSubject && item.chapterName === defaultChapter).map((item: any) => item.topicName as string)
          )).filter(Boolean).sort() as string[];
          const defaultTopic = uniqueTopics[0] || "";
          setSelectedTopics(defaultTopic ? [defaultTopic] : []);

          const uniqueSubtopics = Array.from(new Set(
            data.filter((item: any) => item.grade === defaultGrade && item.subject === defaultSubject && item.chapterName === defaultChapter && item.topicName === defaultTopic).map((item: any) => item.subTopic01 as string)
          )).filter(Boolean).sort() as string[];
          setSelectedSubtopics(uniqueSubtopics[0] ? [uniqueSubtopics[0]] : []);
        } else {
          setSelectedGrades([]);
          setSelectedSubject("");
          setSelectedChapters([]);
          setSelectedTopics([]);
          setSelectedSubtopics([]);
        }
      } catch (err: any) {
        console.error("Syntax or network error fetching taxonomy:", err);
        setTaxonomyError(`Taxonomy sync not active for ${examPattern}. Custom mode defaults apply.`);
        setSyllabusMode("custom");
      } finally {
        setLoadingTaxonomy(false);
      }
    };
    fetchTaxonomy();
  }, [examPattern]);

  // Compute cascading selector lists based on current state
  const grades = React.useMemo(() => {
    const unique = Array.from(new Set(taxonomy.map((item: any) => item.grade))).filter(Boolean);
    return unique.sort();
  }, [taxonomy]);

  const subjects = React.useMemo(() => {
    if (selectedGrades.length === 0) return [];
    const unique = Array.from(new Set(
      taxonomy
        .filter((item: any) => selectedGrades.includes(item.grade as string))
        .map((item: any) => item.subject as string)
    )).filter(Boolean);
    return unique.sort();
  }, [taxonomy, selectedGrades]);

  const chapters = React.useMemo(() => {
    if (selectedGrades.length === 0 || !selectedSubject) return [];
    const unique = Array.from(new Set(
      taxonomy
        .filter((item: any) => selectedGrades.includes(item.grade as string) && item.subject === selectedSubject)
        .map((item: any) => item.chapterName as string)
    )).filter(Boolean);
    return unique.sort();
  }, [taxonomy, selectedGrades, selectedSubject]);

  const topicsList = React.useMemo(() => {
    if (selectedGrades.length === 0 || !selectedSubject || selectedChapters.length === 0) return [];
    const unique = Array.from(new Set(
      taxonomy
        .filter((item: any) => 
          selectedGrades.includes(item.grade as string) && 
          item.subject === selectedSubject && 
          selectedChapters.includes(item.chapterName as string)
        )
        .map((item: any) => item.topicName as string)
    )).filter(Boolean);
    return unique.sort();
  }, [taxonomy, selectedGrades, selectedSubject, selectedChapters]);

  const subtopics = React.useMemo(() => {
    if (selectedGrades.length === 0 || !selectedSubject || selectedChapters.length === 0 || selectedTopics.length === 0) return [];
    const unique = Array.from(new Set(
      taxonomy
        .filter((item: any) => 
          selectedGrades.includes(item.grade as string) && 
          item.subject === selectedSubject && 
          selectedChapters.includes(item.chapterName as string) && 
          selectedTopics.includes(item.topicName as string)
        )
        .map((item: any) => item.subTopic01 as string)
    )).filter(Boolean);
    return unique.sort();
  }, [taxonomy, selectedGrades, selectedSubject, selectedChapters, selectedTopics]);

  // Handle manual option selections with robust waterfall update cascading
  const handleGradesChange = (gradesList: string[]) => {
    setSelectedGrades(gradesList);
    const filtered = taxonomy.filter((item: any) => gradesList.includes(item.grade as string));
    const uniqueSubjects = Array.from(new Set(filtered.map((item: any) => item.subject as string))).filter(Boolean).sort();
    
    let nextSubject = selectedSubject;
    if (!uniqueSubjects.includes(nextSubject)) {
      nextSubject = uniqueSubjects[0] || "";
    }
    setSelectedSubject(nextSubject);

    const filteredCh = filtered.filter((item: any) => item.subject === nextSubject);
    const uniqueChapters = Array.from(new Set(filteredCh.map((item: any) => item.chapterName as string))).filter(Boolean).sort();
    
    const validChapters = selectedChapters.filter(ch => uniqueChapters.includes(ch));
    if (validChapters.length === 0 && uniqueChapters.length > 0) {
      validChapters.push(uniqueChapters[0]);
    }
    setSelectedChapters(validChapters);

    const filteredTop = filteredCh.filter((item: any) => validChapters.includes(item.chapterName as string));
    const uniqueTopics = Array.from(new Set(filteredTop.map((item: any) => item.topicName as string))).filter(Boolean).sort();
    const validTopics = selectedTopics.filter(t => uniqueTopics.includes(t));
    if (validTopics.length === 0 && uniqueTopics.length > 0) {
      validTopics.push(uniqueTopics[0]);
    }
    setSelectedTopics(validTopics);

    const filteredSub = filteredTop.filter((item: any) => validTopics.includes(item.topicName as string));
    const uniqueSubtopics = Array.from(new Set(filteredSub.map((item: any) => item.subTopic01 as string))).filter(Boolean).sort();
    const validSubtopics = selectedSubtopics.filter(sub => uniqueSubtopics.includes(sub));
    setSelectedSubtopics(validSubtopics);
  };

  const handleSubjectChange = (subject: string) => {
    setSelectedSubject(subject);
    const filteredCh = taxonomy.filter((item: any) => selectedGrades.includes(item.grade as string) && item.subject === subject);
    const uniqueChapters = Array.from(new Set(filteredCh.map((item: any) => item.chapterName as string))).filter(Boolean).sort();
    
    const validChapters = selectedChapters.filter(ch => uniqueChapters.includes(ch));
    if (validChapters.length === 0 && uniqueChapters.length > 0) {
      validChapters.push(uniqueChapters[0]);
    }
    setSelectedChapters(validChapters);

    const filteredTop = filteredCh.filter((item: any) => validChapters.includes(item.chapterName as string));
    const uniqueTopics = Array.from(new Set(filteredTop.map((item: any) => item.topicName as string))).filter(Boolean).sort();
    const validTopics = selectedTopics.filter(t => uniqueTopics.includes(t));
    if (validTopics.length === 0 && uniqueTopics.length > 0) {
      validTopics.push(uniqueTopics[0]);
    }
    setSelectedTopics(validTopics);

    const filteredSub = filteredTop.filter((item: any) => validTopics.includes(item.topicName as string));
    const uniqueSubtopics = Array.from(new Set(filteredSub.map((item: any) => item.subTopic01 as string))).filter(Boolean).sort();
    const validSubtopics = selectedSubtopics.filter(sub => uniqueSubtopics.includes(sub));
    setSelectedSubtopics(validSubtopics);
  };

  const handleChaptersChange = (chaptersList: string[]) => {
    setSelectedChapters(chaptersList);
    const filteredTop = taxonomy.filter((item: any) => 
      selectedGrades.includes(item.grade as string) && 
      item.subject === selectedSubject && 
      chaptersList.includes(item.chapterName as string)
    );
    const uniqueTopics = Array.from(new Set(filteredTop.map((item: any) => item.topicName as string))).filter(Boolean).sort();
    
    // Retain only those selected topics that are still valid in the new chapters
    const validSelectedTopics = selectedTopics.filter(t => uniqueTopics.includes(t));
    if (validSelectedTopics.length === 0 && uniqueTopics.length > 0) {
      validSelectedTopics.push(uniqueTopics[0]);
    }
    setSelectedTopics(validSelectedTopics);

    // Recalculate and filter selected subtopics
    const filteredSub = filteredTop.filter((item: any) => validSelectedTopics.includes(item.topicName as string));
    const uniqueSubtopics = Array.from(new Set(filteredSub.map((item: any) => item.subTopic01 as string))).filter(Boolean).sort();
    const validSelectedSubtopics = selectedSubtopics.filter(sub => uniqueSubtopics.includes(sub));
    setSelectedSubtopics(validSelectedSubtopics);
  };

  const handleTopicsChange = (topicNames: string[]) => {
    setSelectedTopics(topicNames);
    const filteredSub = taxonomy.filter((item: any) => 
      selectedGrades.includes(item.grade as string) && 
      item.subject === selectedSubject && 
      selectedChapters.includes(item.chapterName as string) &&
      topicNames.includes(item.topicName as string)
    );
    const uniqueSubtopics = Array.from(new Set(filteredSub.map((item: any) => item.subTopic01 as string))).filter(Boolean).sort();
    
    // Filter existing selected subtopics to only keep those still valid, otherwise empty array
    const validSelected = selectedSubtopics.filter(sub => uniqueSubtopics.includes(sub));
    setSelectedSubtopics(validSelected);
  };

  // Initialize Auth on Mount
  React.useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAuthToken(token);
      },
      () => {
        setUser(null);
        setAuthToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setSheetsError("");
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAuthToken(result.accessToken);
      }
    } catch (err: any) {
      console.error("Sign in failed:", err);
      setSheetsError("Failed to sign in with Google. Make sure sheets permissions are allowed.");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAuthToken(null);
      setExportSuccessUrl("");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  const handleExportToSheets = async () => {
    if (!authToken) {
      setSheetsError("You must be signed in with Google to export to Sheets.");
      return;
    }
    if (!generatedContent) {
      setSheetsError("No questions found to export.");
      return;
    }

    setExportingSheets(true);
    setSheetsError("");
    setExportSuccessUrl("");

    try {
      // Parse questions
      if (parsedQuestions.length === 0) {
        throw new Error("Could not parse any questions. Make sure questions are formatted as 'Question X:' list.");
      }

      let spreadsheetId = "";
      let finalTitle = "";
      const activeTopic = syllabusMode === "google"
        ? basket.length > 0
          ? basket.map(item => item.node.topicName).join(", ")
          : "Selected Syllabus"
        : topic;

      if (exportTarget === "new") {
        const finalSpreadsheetTitle = spreadsheetTitle || `${activeTopic} (${examPattern}) Problem Set`;
        spreadsheetId = await createAndPopulateSpreadsheet(
          authToken,
          {
            title: finalSpreadsheetTitle,
            topic: activeTopic,
            pattern: examPattern,
          },
          parsedQuestions
        );
        finalTitle = finalSpreadsheetTitle;
      } else {
        if (!existingSpreadsheetUrl) {
          throw new Error("Please enter an existing Google Spreadsheet URL or ID.");
        }
        const targetId = extractSpreadsheetId(existingSpreadsheetUrl);
        const result = await appendToExistingSpreadsheet(
          authToken,
          targetId,
          {
            title: "",
            topic: activeTopic,
            pattern: examPattern,
          },
          parsedQuestions
        );
        spreadsheetId = result.spreadsheetId;
        finalTitle = `Sheet Tab "${result.sheetTitle}"`;
      }

      setExportSuccessUrl(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
      setExportSuccessTitle(finalTitle);
    } catch (err: any) {
      console.error("Sheets export error:", err);
      setSheetsError(err.message || "Failed to export to Google Sheets.");
    } finally {
      setExportingSheets(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type || "application/octet-stream",
            data: reader.result as string,
            file: file,
          },
        ]);
        // Update total pages estimate
        if (file.type === 'application/pdf') {
          // This is a rough estimate, ideally we'd parse the PDF
          setTotalPages((prev) => prev + 1); 
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    // Update total pages estimate
    setTotalPages((prev) => Math.max(0, prev - 1));
  };

  const onCustomDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setCustomExtractFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type || "application/octet-stream",
            data: reader.result as string,
            file: file,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const {
    getRootProps: getCustomRootProps,
    getInputProps: getCustomInputProps,
    isDragActive: isCustomDragActive
  } = useDropzone({
    onDrop: onCustomDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
  });

  const removeCustomFile = (index: number) => {
    setCustomExtractFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    let activeTopic = "";
    if (generationMode === "SOURCE_BASED" && files.length > 0) {
      activeTopic = topic;
    } else {
      activeTopic = syllabusMode === "google"
        ? basket.length > 0
          ? basket.map(item => item.node.topicName).join(", ")
          : ""
        : topic;

      if (syllabusMode === "custom" && customExtractFiles.length > 0) {
        const cleanCh = (customChapter && customChapter !== "__custom__") ? customChapter : "";
        if (cleanCh) {
          activeTopic = customTopic ? `${cleanCh} (${customTopic})` : cleanCh;
        } else if (customTopic) {
          activeTopic = customTopic;
        } else if (customSubject) {
          activeTopic = `${customSubject} Extraction`;
        } else {
          activeTopic = "Uploaded File Extraction";
        }
      }
    }

    if (!activeTopic) {
      setError(
        generationMode === "SOURCE_BASED" && files.length > 0
          ? "Please specify a Target Topic Focus for the uploaded source document."
          : (syllabusMode === "google"
             ? "Please select at least one topic from the syllabus basket first."
             : "Please enter a topic.")
      );
      return;
    }

    if (generationMode === "SOURCE_BASED" && files.length === 0 && !(syllabusMode === "custom" && customExtractFiles.length > 0)) {
      setError("Please upload at least one source document for Source-Based mode.");
      return;
    }

    setError("");
    setCurrentView("OUTPUT");
    setIsGenerating(true);
    setGeneratedContent("");
    setGenerationMeta({ batches: [] });
    setProcessingStartTime(Date.now());
    setElapsedTime(0);
    setProgress(5);
    setTokensUsed(0);

    let activeResolvedNode = null;
    let activeResolvedNodes: any[] = [];

    if (syllabusMode === "google") {
      activeResolvedNodes = basket.map(item => ({
        grade: item.node.grade,
        subject: item.node.subject,
        chapterName: item.node.chapterName,
        topicName: item.node.topicName,
        subTopic01: item.node.subTopic01 || undefined
      }));
    } else {
      setIsResolving(true);
      try {
        const res = await fetch("/api/resolve-selection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grade: examPattern === "JEE" ? "Class 11" : "Class 11",
            subject: examPattern === "JEE" ? "Physics" : examPattern === "NEET" ? "Physics" : "Physics",
            chapterName: "",
            topicName: topic,
            pattern: examPattern
          })
        });
        if (res.ok) {
          const resolveData = await res.json();
          activeResolvedNode = resolveData.resolvedNode;
          console.log("Automatically resolved typed topic to taxonomy node:", activeResolvedNode, "Fallback active:", resolveData.isFallback);
        }
      } catch (err) {
        console.warn("Backend resolution error, using untaxonomized text:", err);
      } finally {
        setIsResolving(false);
      }
    }

    const finalEasyCount = (generationMode === "SOURCE_BASED" && files.length > 0)
      ? easyCount
      : (syllabusMode === "google"
        ? basket.reduce((acc, curr) => acc + curr.lodDistribution.Easy, 0)
        : easyCount);
    const finalMediumCount = (generationMode === "SOURCE_BASED" && files.length > 0)
      ? mediumCount
      : (syllabusMode === "google"
        ? basket.reduce((acc, curr) => acc + curr.lodDistribution.Medium, 0)
        : mediumCount);
    const finalHardCount = (generationMode === "SOURCE_BASED" && files.length > 0)
      ? hardCount
      : (syllabusMode === "google"
        ? basket.reduce((acc, curr) => acc + curr.lodDistribution.Hard, 0)
        : hardCount);

    let filePayload: string[] = [];
    const isCustomExtract = (syllabusMode === "custom" && customExtractFiles.length > 0);

    // Extract pages to images if SOURCE_BASED mode is active OR if doing custom PDF question extraction
    if (generationMode === "SOURCE_BASED" || isCustomExtract) {
      setProgress(10);
      try {
        const targetFiles = isCustomExtract ? customExtractFiles : files;
        for (const fileObj of targetFiles) {
          if (fileObj.type === "application/pdf" && fileObj.file) {
            const rendered = await renderPdfPagesToImages(fileObj.file);
            filePayload = [...filePayload, ...rendered];
          } else {
            filePayload.push(fileObj.data);
          }
        }
      } catch (err) {
        console.error("Error rendering PDF pages to high-res images: ", err);
        setError("Could not process the uploaded PDF document.");
        setIsGenerating(false);
        return;
      }
    }

    const apiPayload = {
      mode: isCustomExtract ? "SOURCE_BASED" : generationMode,
      isCustomExtract,
      examPattern,
      topic: activeTopic,
      easyCount: finalEasyCount,
      mediumCount: finalMediumCount,
      hardCount: finalHardCount,
      additionalInstructions,
      selectedModel,
      withFigures,
      enableRag,
      basket: syllabusMode === "google" ? basket : [],
      questionMix, // Balanced SCQ vs Numerical Mix
      files: filePayload,
      customSubject: isCustomExtract ? customSubject : undefined,
      customChapter: isCustomExtract ? customChapter : undefined,
      customTopic: isCustomExtract ? customTopic : undefined,
      customTotalCount: isCustomExtract ? customTotalCount : undefined,
      customScqCount: isCustomExtract ? customScqCount : undefined,
      customNumericalCount: isCustomExtract ? customNumericalCount : undefined
    };

    try {
      setProgress(25);
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Backend error generating questions");
      }

      if (!response.body) {
        throw new Error("No response body received from generation stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                setGeneratedContent(prev => prev + parsed.text);
                setProgress(prev => Math.min(prev + 1, 98));
              } else if (parsed.meta) {
                setGenerationMeta(prev => {
                  const exists = prev.batches.some(b => b.batchIndex === parsed.meta.batchIndex);
                  if (exists) return prev;
                  return {
                    batches: [...prev.batches, parsed.meta]
                  };
                });
              } else if (parsed.error) {
                setError(parsed.error);
              }
            } catch (e) {
              // Fail silently for half-formed data lines
            }
          }
        }
      }
      setProgress(100);
    } catch (err: any) {
      console.error("Fetch API generation error: ", err);
      setError(err.message || "An error occurred during generation.");
    } finally {
      setIsGenerating(false);
      setProcessingStartTime(null);
    }
  };

  const exportToWord = async () => {
    try {
      const latexContent = generateQuestionsWithSolutionsLatex(parsedQuestions, totalBasketQuestions);
      const blob = new Blob([latexContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getDownloadFilename("Questions_LaTeX_Draft.doc");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export Word document: ", err);
    }
  };

  const generateLatexDocContentWithoutCitation = (questions: QuestionItem[]): string => {
    let content = "";
    questions.forEach((q, index) => {
      const num = index + 1;
      const isScq = !!(q.optionA || q.optionB || q.optionC || q.optionD);
      
      content += `Question ${num}: ${q.questionText || ""}\n`;
      if (isScq) {
        content += `Options:\n`;
        content += `(a) ${q.optionA || ""}\n\n`;
        content += `(b) ${q.optionB || ""}\n\n`;
        content += `(c) ${q.optionC || ""}\n\n`;
        content += `(d) ${q.optionD || ""}\n\n`;
      }
      
      let ans = (q.answer || "").trim();
      if (isScq) {
        const match = ans.match(/^[a-dA-D]$/i);
        if (match) {
          ans = `(${ans.toLowerCase()})`;
        } else {
          const matchParens = ans.match(/^\(([a-dA-D])\)$/i);
          if (matchParens) {
            ans = `(${matchParens[1].toLowerCase()})`;
          }
        }
      }
      content += `Answer: ${ans}\n`;
      content += `Solution:\n${q.solution || ""}\n\n`;
    });
    return content;
  };

  const exportToLatexDocWithoutCitation = async () => {
    try {
      const rawMarkdown = generateLatexDocContentWithoutCitation(parsedQuestions);
      const parsedHtml = await marked.parse(rawMarkdown, { breaks: true });
      
      const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Generated Questions</title>
  <style>
    body { font-family: Arial, sans-serif; }
    h1, h2, h3 { color: #333; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    img { max-width: 100%; height: auto; }
    p { margin-bottom: 1em; }
  </style>
</head>
<body>
  ${parsedHtml}
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: "application/msword;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getDownloadFilename("LaTeX_Questions_Without_Citation.doc");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export LaTeX Word document without citation: ", err);
    }
  };

  const exportToWordReadableQuestionsOnly = async () => {
    try {
      const activeSubject = syllabusMode === "google" && basket.length > 0 
        ? basket[0].node.subject 
        : customSubject;
      const activeChapter = syllabusMode === "google" && basket.length > 0
        ? basket[0].node.chapterName
        : customChapter;

      const wordHtmlContent = generateReadableWordDocument(
        parsedQuestions,
        examPattern,
        activeSubject,
        activeChapter,
        topic,
        false, // includeSolutions = false
        totalBasketQuestions
      );
      const blob = new Blob([wordHtmlContent], { type: "application/msword;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getDownloadFilename("Paper_Questions_Worksheet.doc");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export Questions-Only Readable Word document: ", err);
    }
  };

  const exportToWordReadableWithSolutions = async () => {
    try {
      const activeSubject = syllabusMode === "google" && basket.length > 0 
        ? basket[0].node.subject 
        : customSubject;
      const activeChapter = syllabusMode === "google" && basket.length > 0
        ? basket[0].node.chapterName
        : customChapter;

      const wordHtmlContent = generateReadableWordDocument(
        parsedQuestions,
        examPattern,
        activeSubject,
        activeChapter,
        topic,
        true, // includeSolutions = true
        totalBasketQuestions
      );
      const blob = new Blob([wordHtmlContent], { type: "application/msword;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getDownloadFilename("Paper_Questions_And_Solutions.doc");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export Readable Word document with solutions: ", err);
    }
  };

  const exportAllToZip = async () => {
    try {
      setIsExportingZip(true);
      const zip = new JSZip();

      // 1. generateQuestionsWithSolutionsLatex (Word LaTeX Draft)
      const latexContent = generateQuestionsWithSolutionsLatex(parsedQuestions, totalBasketQuestions);
      const docName = getDownloadFilename("Questions_LaTeX_Draft.doc");
      zip.file(docName, latexContent);

      // 2. generateReadableWordDocument for questions only
      const activeSubject = syllabusMode === "google" && basket.length > 0 
        ? basket[0].node.subject 
        : customSubject;
      const activeChapter = syllabusMode === "google" && basket.length > 0
        ? basket[0].node.chapterName
        : customChapter;

      const questionsOnlyContent = generateReadableWordDocument(
        parsedQuestions,
        examPattern,
        activeSubject,
        activeChapter,
        topic,
        false, // includeSolutions = false
        totalBasketQuestions
      );
      const qDocName = getDownloadFilename("Paper_Questions_Worksheet.doc");
      zip.file(qDocName, questionsOnlyContent);

      // 3. generateReadableWordDocument for questions + solutions
      const withSolutionsContent = generateReadableWordDocument(
        parsedQuestions,
        examPattern,
        activeSubject,
        activeChapter,
        topic,
        true, // includeSolutions = true
        totalBasketQuestions
      );
      const qsDocName = getDownloadFilename("Paper_Questions_And_Solutions.doc");
      zip.file(qsDocName, withSolutionsContent);

      // 4. generateLatexDocContentWithoutCitation (LaTeX Doc without citation)
      const rawMarkdownNoCitation = generateLatexDocContentWithoutCitation(parsedQuestions);
      const parsedHtmlNoCitation = await marked.parse(rawMarkdownNoCitation, { breaks: true });
      const htmlContentNoCitation = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Generated Questions</title>
  <style>
    body { font-family: Arial, sans-serif; }
    h1, h2, h3 { color: #333; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    img { max-width: 100%; height: auto; }
    p { margin-bottom: 1em; }
  </style>
</head>
<body>
  ${parsedHtmlNoCitation}
</body>
</html>`;
      const docNameNoCitation = getDownloadFilename("LaTeX_Questions_Without_Citation.doc");
      zip.file(docNameNoCitation, htmlContentNoCitation);

      // 5. Compiled view-complete/printable HTML documents
      const htmlContentQuestionsOnly = generateCompleteHtmlForPrint("question");
      zip.file(getDownloadFilename("Practice_Exam_Questions_Only.html"), htmlContentQuestionsOnly);

      const htmlContentWithSolutions = generateCompleteHtmlForPrint("solutions");
      zip.file(getDownloadFilename("Practice_Exam_With_Solutions.html"), htmlContentWithSolutions);

      // 6. Compiled view-complete high-fidelity interactive document (with brand styling + KaTeX + segregated cards)
      const compiledViewHtml = generateCompiledViewHtmlDoc(parsedQuestions);
      zip.file(getDownloadFilename("Compiled_Interactive_Worksheet.html"), compiledViewHtml);

      // Generate the ZIP
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = getDownloadFilename("All_Documents_Questions.zip");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export all to ZIP:", err);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleCopyAsFormat = async (format: "readable" | "raw") => {
    try {
      if (format === "raw") {
        await navigator.clipboard.writeText(generatedContent);
        setIsCopiedRaw(true);
        setTimeout(() => setIsCopiedRaw(false), 2000);
      } else {
        const textData = formatQuestionsAsText(parsedQuestions);
        await navigator.clipboard.writeText(textData);
        setIsCopiedReadable(true);
        setTimeout(() => setIsCopiedReadable(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy content:", err);
    }
  };

  const generateCompleteHtmlForPrint = (type: "question" | "solutions"): string => {
    const questions = parsedQuestions;
    const subjectName = syllabusMode === "google" && basket.length > 0 
      ? basket[0].node.subject 
      : customSubject || "Practice";
    const chapterName = (customChapter && customChapter !== "__custom__") 
      ? customChapter 
      : (syllabusMode === "google" && basket.length > 0 ? basket[0].node.chapterName : "General Concepts");
    
    const scqs = questions.filter(q => q.optionA || q.optionB || q.optionC || q.optionD);
    const numericals = questions.filter(q => !(q.optionA || q.optionB || q.optionC || q.optionD));
    let unifiedIndex = 1;

    // Render questions for HTML
    const renderScqItemsHtml = scqs.map(q => {
      const currentNum = unifiedIndex++;
      const optionARender = q.optionA ? `<div class="col-span-1 flex items-start gap-1 p-1 font-sans">
        <strong class="text-slate-900 shrink-0 select-none">(a)&nbsp;</strong>
        <div class="math-item">${convertMarkdownToHtmlForPrinting(q.optionA)}</div>
      </div>` : "";
      const optionBRender = q.optionB ? `<div class="col-span-1 flex items-start gap-1 p-1 font-sans">
        <strong class="text-slate-900 shrink-0 select-none">(b)&nbsp;</strong>
        <div class="math-item">${convertMarkdownToHtmlForPrinting(q.optionB)}</div>
      </div>` : "";
      const optionCRender = q.optionC ? `<div class="col-span-1 flex items-start gap-1 p-1 font-sans">
        <strong class="text-slate-900 shrink-0 select-none">(c)&nbsp;</strong>
        <div class="math-item">${convertMarkdownToHtmlForPrinting(q.optionC)}</div>
      </div>` : "";
      const optionDRender = q.optionD ? `<div class="col-span-1 flex items-start gap-1 p-1 font-sans">
        <strong class="text-slate-900 shrink-0 select-none">(d)&nbsp;</strong>
        <div class="math-item">${convertMarkdownToHtmlForPrinting(q.optionD)}</div>
      </div>` : "";

      const solutionBlockHtml = type === "solutions" ? `
        <div class="solution-box mt-3 text-[13px] text-slate-800 page-break-avoid font-sans">
          <div class="font-bold text-slate-950 mb-1">
            Answer: (${q.answer ? q.answer.trim().toUpperCase().replace(/[()]/g, '') : 'A'})
          </div>
          ${q.solution ? `
            <div class="mt-1 text-slate-800 leading-relaxed">
              <strong>Solution:</strong> <span class="math-item">${convertMarkdownToHtmlForPrinting(q.solution)}</span>
            </div>
          ` : ''}
        </div>
      ` : "";

      return `
        <div class="question-container page-break-avoid border-b border-dashed border-slate-200 pb-5 mb-5 font-sans">
          <div class="font-bold flex items-start gap-1.5 text-[15px] text-slate-950 mb-2" style="display: flex; align-items: start; gap: 6px;">
            <span class="shrink-0 text-slate-900 select-none">Question ${currentNum}:</span>
            <div class="font-normal text-slate-900 leading-relaxed math-item">${convertMarkdownToHtmlForPrinting(q.questionText)}</div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pl-6 text-[14px]">
            ${optionARender}
            ${optionBRender}
            ${optionCRender}
            ${optionDRender}
          </div>
          ${solutionBlockHtml}
        </div>
      `;
    }).join("");

    const renderNumericalItemsHtml = numericals.map(q => {
      const currentNum = unifiedIndex++;
      const solutionBlockHtml = type === "solutions" ? `
        <div class="solution-box mt-3 text-[13px] text-slate-800 page-break-avoid font-sans">
          <div class="font-bold text-slate-950 mb-1">
            Answer: ${q.answer ? q.answer.trim() : 'N/A'}
          </div>
          ${q.solution ? `
            <div class="mt-1 text-slate-800 leading-relaxed">
              <strong>Solution:</strong> <span class="math-item">${convertMarkdownToHtmlForPrinting(q.solution)}</span>
            </div>
          ` : ''}
        </div>
      ` : "";

      return `
        <div class="question-container page-break-avoid border-b border-dashed border-slate-200 pb-5 mb-5 font-sans">
          <div class="font-bold flex items-start gap-1.5 text-[15px] text-slate-950 mb-2" style="display: flex; align-items: start; gap: 6px;">
            <span class="shrink-0 text-slate-900 select-none">Question ${currentNum}:</span>
            <div class="font-normal text-slate-900 leading-relaxed math-item">${convertMarkdownToHtmlForPrinting(q.questionText)}</div>
          </div>
          ${solutionBlockHtml}
        </div>
      `;
    }).join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subjectName} - Practice Examination</title>
  
  <!-- Inter & JetBrains Mono Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- KaTeX CSS Formats -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  
  <style>
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: #f8fafc;
    }
    .math-item {
      display: inline-block;
      max-width: 100%;
    }
    .page-break-avoid {
      page-break-inside: auto;
      break-inside: auto;
    }
    .diacolumn-flow {
      column-count: 2;
      -webkit-column-count: 2;
      -moz-column-count: 2;
      column-gap: 24px;
      column-rule: 0.5px solid #cbd5e1;
    }
    .question-container {
      page-break-inside: auto;
      break-inside: auto;
      -webkit-column-break-inside: auto;
    }
    @media print {
      body {
        background-color: #ffffff !important;
        color: #0d1117 !important;
      }
      .no-print {
        display: none !important;
      }
      .printable-card {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
      }
      .diacolumn-flow {
        column-count: 2 !important;
        -webkit-column-count: 2 !important;
        -moz-column-count: 2 !important;
        column-gap: 24px !important;
        column-rule: 0.5px solid #cbd5e1 !important;
      }
      .question-container {
        page-break-inside: auto !important;
        break-inside: auto !important;
        -webkit-column-break-inside: auto !important;
        display: block !important;
      }
      @page {
        size: A4;
        margin: 15mm 15mm 15mm 15mm;
      }
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 antialiased leading-relaxed min-h-screen">

  <!-- Interactive Instruction Banner (Visible on-screen, hidden when printed) -->
  <div class="no-print sticky top-0 bg-slate-900 border-b border-slate-800 text-white py-3.5 px-4 shadow-lg z-50">
    <div class="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-xl shadow-md shadow-indigo-900/40 shrink-0">
          📄
        </div>
        <div>
          <h3 class="text-sm font-bold tracking-tight text-white">Interactive Printable Test Assistant</h3>
          <p class="text-xs text-slate-300 font-medium">To save as PDF, change your print destination printer to <strong class="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">"Save as PDF"</strong>.</p>
        </div>
      </div>
      <div class="flex items-center gap-2.5 w-full md:w-auto justify-end">
        <button onclick="window.print()" class="w-full md:w-auto bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm shadow-indigo-500/20 transition-all cursor-pointer">
          🖨️ Open Print Dialog
        </button>
        <button onclick="window.close()" class="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs py-2 px-3.5 rounded-lg border border-slate-700 transition-all cursor-pointer">
          Close Window
        </button>
      </div>
    </div>
  </div>

  <div class="printable-card max-w-[850px] mx-auto bg-white p-8 md:p-12 my-8">

    <div class="diacolumn-flow font-sans">
      <!-- Section I Single Choice Questions -->
      ${scqs.length > 0 ? `
        <div class="page-break-avoid border-y-2 border-slate-950 py-2.5 mb-5 text-center font-black text-xs uppercase tracking-widest text-slate-950">
          SECTION I: MULTIPLE CHOICE QUESTIONS
        </div>
        ${renderScqItemsHtml}
      ` : ''}

      <!-- Section II Numerical Questions -->
      ${numericals.length > 0 ? `
        <div class="page-break-avoid border-y-2 border-slate-950 py-2.5 my-5 text-center font-black text-xs uppercase tracking-widest text-slate-950">
          SECTION II: INTEGER-TYPE NUMERICAL QUESTIONS
        </div>
        ${renderNumericalItemsHtml}
      ` : ''}
    </div>
  </div>

  <!-- KaTeX core library and auto-render extension -->
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      function runMathRenderer() {
        if (typeof renderMathInElement === 'function') {
          renderMathInElement(document.body, {
            delimiters: [
              {left: "$$", right: "$$", display: true},
              {left: "$", right: "$", display: false},
              {left: "\\\\(", right: "\\\\)", display: false},
              {left: "\\\\{", right: "\\\\}", display: false},
              {left: "\\\\[", right: "\\\\]", display: true}
            ],
            throwOnError: false
          });
          
          // Auto-trigger full page print after short rendering delay
          setTimeout(function() {
            window.print();
          }, 850);
        } else {
          setTimeout(runMathRenderer, 150);
        }
      }
      runMathRenderer();
    });
  </script>
</body>
</html>`;
  };

  const generateCompiledViewHtmlDoc = (questions: QuestionItem[]): string => {
    const subjectName = syllabusMode === "google" && basket.length > 0 
      ? basket[0].node.subject 
      : customSubject || "Practice";
    const chapterName = (customChapter && customChapter !== "__custom__") 
      ? customChapter 
      : (syllabusMode === "google" && basket.length > 0 ? basket[0].node.chapterName : "General Concepts");

    const pattern = examPattern || "JEE";
    const badgeClass = pattern === "NEET" ? "badge-neet" : pattern === "CBSE" ? "badge-cbse" : "badge-jee";

    const scqs = questions.filter(q => q.optionA || q.optionB || q.optionC || q.optionD);
    const numericals = questions.filter(q => !(q.optionA || q.optionB || q.optionC || q.optionD));
    let unifiedIndex = 1;

    const renderScqCard = (q: QuestionItem) => {
      const currentNum = unifiedIndex++;
      const optionARender = q.optionA ? `<div class="option-item"><span class="option-letter">(a)</span> ${convertMarkdownToHtmlForPrinting(q.optionA)}</div>` : "";
      const optionBRender = q.optionB ? `<div class="option-item"><span class="option-letter">(b)</span> ${convertMarkdownToHtmlForPrinting(q.optionB)}</div>` : "";
      const optionCRender = q.optionC ? `<div class="option-item"><span class="option-letter">(c)</span> ${convertMarkdownToHtmlForPrinting(q.optionC)}</div>` : "";
      const optionDRender = q.optionD ? `<div class="option-item"><span class="option-letter">(d)</span> ${convertMarkdownToHtmlForPrinting(q.optionD)}</div>` : "";

      let displayAnswer = (q.answer || "").trim();
      const match = displayAnswer.match(/^[a-dA-D]$/i);
      if (match) {
        displayAnswer = `(${displayAnswer.toLowerCase()})`;
      } else {
        const matchParens = displayAnswer.match(/^\(([a-dA-D])\)$/i);
        if (matchParens) {
          displayAnswer = `(${matchParens[1].toLowerCase()})`;
        }
      }

      const solutionRow = q.solution ? `
    <div class="solution-row">
      <span class="solution-label">Solution:</span>
      <div class="solution-text">${convertMarkdownToHtmlForPrinting(q.solution)}</div>
    </div>
      ` : "";

      const levelSpan = q.level ? `<span>Level: <strong>${q.level}</strong></span>` : "";
      const citationSpan = q.citation ? `<span>Citation: <strong>${q.citation}</strong></span>` : "";

      return `
<div class="question-card">
  <div class="question-text">
    <span class="question-number">Question ${currentNum}:</span> ${convertMarkdownToHtmlForPrinting(q.questionText)}
  </div>
  <div class="options-container">
    <div class="option-header">Options:</div>
    <div class="options-grid">
      ${optionARender}
      ${optionBRender}
      ${optionCRender}
      ${optionDRender}
    </div>
  </div>
  <div class="solution-card">
    <div class="answer-row">
      <span class="answer-label">Answer:</span> <span class="answer-badge badge-scq">${displayAnswer || "N/A"}</span>
    </div>
    ${solutionRow}
    <div class="meta-row">
      <span>Question Type: <strong>SCQ</strong></span>
      ${levelSpan}
      ${citationSpan}
    </div>
  </div>
</div>`;
    };

    const renderNumericalCard = (q: QuestionItem) => {
      const currentNum = unifiedIndex++;
      let displayAnswer = (q.answer || "").trim();

      const solutionRow = q.solution ? `
    <div class="solution-row">
      <span class="solution-label">Solution:</span>
      <div class="solution-text">${convertMarkdownToHtmlForPrinting(q.solution)}</div>
    </div>
      ` : "";

      const levelSpan = q.level ? `<span>Level: <strong>${q.level}</strong></span>` : "";
      const citationSpan = q.citation ? `<span>Citation: <strong>${q.citation}</strong></span>` : "";

      return `
<div class="question-card">
  <div class="question-text">
    <span class="question-number">Question ${currentNum}:</span> ${convertMarkdownToHtmlForPrinting(q.questionText)}
  </div>
  <div class="solution-card">
    <div class="answer-row">
      <span class="answer-label">Answer:</span> <span class="answer-badge badge-num">${displayAnswer || "N/A"}</span>
    </div>
    ${solutionRow}
    <div class="meta-row">
      <span>Question Type: <strong>Numerical</strong></span>
      ${levelSpan}
      ${citationSpan}
    </div>
  </div>
</div>`;
    };

    const renderedScqsHtml = scqs.map(renderScqCard).join("\n");
    const renderedNumericalsHtml = numericals.map(renderNumericalCard).join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subjectName} - ${chapterName}</title>
  
  <!-- Inter font -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  
  <!-- KaTeX CSS and JS for live math rendering -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
  
  <style>
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 40px 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 850px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
      padding: 40px;
    }
    .header {
      position: relative;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .exam-badge {
      position: absolute;
      top: 0;
      right: 0;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
    }
    .badge-jee {
      background-color: #faf5ff;
      color: #7e22ce;
      border-color: #e9d5ff;
    }
    .badge-neet {
      background-color: #fffbeb;
      color: #b45309;
      border-color: #fde68a;
    }
    .badge-cbse {
      background-color: #ecfdf5;
      color: #047857;
      border-color: #a7f3d0;
    }
    .title {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 8px 0;
      letter-spacing: -0.025em;
    }
    .subtitle {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      margin: 0;
    }
    .section-title {
      background-color: #f8fafc;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      font-weight: 900;
      font-size: 12px;
      color: #1e293b;
      letter-spacing: 0.05em;
      text-align: center;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    .questions-list {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .question-card {
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 24px;
    }
    .question-card:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .question-text {
      font-size: 15px;
      font-weight: 500;
      color: #0f172a;
      margin-bottom: 16px;
      line-height: 1.6;
    }
    .question-number {
      font-weight: 700;
      color: #0f172a;
    }
    .options-container {
      margin-left: 24px;
      margin-bottom: 16px;
    }
    .option-header {
      font-size: 10px;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    }
    .options-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    @media (min-width: 640px) {
      .options-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    .option-item {
      font-size: 13px;
      color: #334155;
      display: flex;
      align-items: flex-start;
      gap: 6px;
    }
    .option-letter {
      font-weight: 700;
      color: #64748b;
      flex-shrink: 0;
    }
    .solution-card {
      background-color: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 12px;
      padding: 16px;
      margin-left: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .answer-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    .answer-label {
      font-weight: 700;
      color: #475569;
    }
    .answer-badge {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .badge-scq {
      background-color: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    .badge-num {
      background-color: #fff7ed;
      color: #c2410c;
      border: 1px solid #ffedd5;
    }
    .solution-row {
      font-size: 13px;
    }
    .solution-label {
      font-weight: 700;
      color: #475569;
      display: block;
      margin-bottom: 4px;
    }
    .solution-text {
      color: #1e293b;
    }
    .meta-row {
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      margin-top: 4px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 10px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .meta-row strong {
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="exam-badge ${badgeClass}">${pattern} Pattern</div>
      <h1 class="title">Section-Wise Exam Paper Draft</h1>
      <p class="subtitle">Subject: <strong>${subjectName}</strong> | Chapter: <strong>${chapterName}</strong></p>
    </header>

    ${scqs.length > 0 ? `
<div class="section-title">SECTION I: SINGLE CHOICE QUESTIONS</div>
<div class="questions-list">
  ${renderedScqsHtml}
</div>
    ` : ""}

    ${numericals.length > 0 ? `
<div class="section-title" style="margin-top: 40px;">${scqs.length > 0 ? "SECTION II: INTEGER-TYPE NUMERICAL QUESTIONS" : "SECTION I: INTEGER-TYPE NUMERICAL QUESTIONS"}</div>
<div class="questions-list">
  ${renderedNumericalsHtml}
</div>
    ` : ""}
  </div>

  <script>
    document.addEventListener("DOMContentLoaded", function() {
      renderMathInElement(document.body, {
        delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "$", right: "$", display: false},
          {left: "\\\\(", right: "\\\\)", display: false},
          {left: "\\\\[", right: "\\\\]", display: true}
        ],
        throwOnError : false
      });
    });
  </script>
</body>
</html>`;
  };

  const downloadCompiledViewHtml = () => {
    try {
      const htmlContent = generateCompiledViewHtmlDoc(parsedQuestions);
      const fileBlob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      const fileUrl = URL.createObjectURL(fileBlob);
      const a = document.createElement("a");
      a.href = fileUrl;
      a.download = getDownloadFilename("Compiled_Interactive_Worksheet.html");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(fileUrl);
    } catch (err) {
      console.error("Failed to download compiled HTML view:", err);
    }
  };

  const triggerPrint = (type: "question" | "solutions") => {
    // 1. Set the internal react printing state as fallback
    setPrintType(type);
    
    try {
      const printablePageHtml = generateCompleteHtmlForPrint(type);

      // Try to open a pristine new window/tab for auto-printing
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(printablePageHtml);
        printWindow.document.close();
        return;
      }
    } catch (e) {
      console.warn("Popup tab blocked by developer console sandbox, generating default file download fallback", e);
    }

    // Direct File Download Fallback (Highly Reliable inside sandboxed secure frames)
    try {
      const printablePageHtml = generateCompleteHtmlForPrint(type);
      
      const fileBlob = new Blob([printablePageHtml], { type: "text/html;charset=utf-8" });
      const fileUrl = URL.createObjectURL(fileBlob);
      const downloadAnchor = document.createElement("a");
      downloadAnchor.href = fileUrl;
      downloadAnchor.download = getDownloadFilename(`Practice_Exam_${type === "solutions" ? "Questions_with_Solutions" : "Questions"}.html`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(fileUrl);
      
      alert(`📥 Printable exam downloaded! Double-click "Practice_Exam_...html" in your Downloads folder to open it and print/save to PDF in textbook quality!`);
    } catch (fallbackErr) {
      console.error("Direct download failed, executing local print callback", fallbackErr);
      setTimeout(() => {
        window.print();
      }, 200);
    }
  };

  const exportToLatexQuestionsOnly = () => {
    try {
      const activeSubject = syllabusMode === "google" && basket.length > 0 
        ? basket[0].node.subject 
        : "Physics / Chemistry";
      const content = generateQuestionsOnlyLatex(parsedQuestions, activeSubject, totalBasketQuestions);
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getDownloadFilename("Questions_Paper.tex");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export LaTeX Questions Only:", err);
    }
  };

  const exportToLatexWithSolutions = () => {
    try {
      const content = generateQuestionsWithSolutionsLatex(parsedQuestions, totalBasketQuestions);
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getDownloadFilename("Solutions_Paper.tex");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export LaTeX with Solutions:", err);
    }
  };

  const modelBreakdown = useMemo(() => {
    const stats: Record<string, number> = {};
    if (!generationMeta || !generationMeta.batches) return stats;
    generationMeta.batches.forEach(b => {
      const model = b.model || "Unknown Model";
      const count = b.slots ? b.slots.length : 0;
      stats[model] = (stats[model] || 0) + count;
    });
    return stats;
  }, [generationMeta]);

  const getGeneratedCountForTopic = useCallback((topicName: string, subTopic: string = "") => {
    if (!generationMeta || !generationMeta.batches || generationMeta.batches.length === 0) {
      return 0;
    }
    let count = 0;
    generationMeta.batches.forEach(b => {
      b.slots.forEach(s => {
        const sTopic = s.topicName || "";
        const sSub = s.subTopic || "";
        const targetSub = subTopic || "";
        if (
          sTopic.toLowerCase() === topicName.toLowerCase() &&
          sSub.toLowerCase() === targetSub.toLowerCase()
        ) {
          count++;
        }
      });
    });
    return count;
  }, [generationMeta]);

  const getDifficultyStatsForTopic = useCallback((topicName: string, subTopic: string = "") => {
    let easy = 0;
    let medium = 0;
    let hard = 0;

    if (!generationMeta || !generationMeta.batches) {
      return { easy, medium, hard };
    }

    generationMeta.batches.forEach(b => {
      b.slots.forEach(s => {
        const sTopic = s.topicName || "";
        const sSub = s.subTopic || "";
        const targetSub = subTopic || "";
        if (
          sTopic.toLowerCase() === topicName.toLowerCase() &&
          sSub.toLowerCase() === targetSub.toLowerCase()
        ) {
          const q = parsedQuestions.find(pq => pq.number === s.globalNum);
          if (q) {
            const lvl = (q.level || s.difficulty || "Medium").toLowerCase();
            if (lvl.includes("easy")) easy++;
            else if (lvl.includes("hard") || lvl.includes("diff")) hard++;
            else medium++;
          } else {
            const lvl = (s.difficulty || "Medium").toLowerCase();
            if (lvl.includes("easy")) easy++;
            else if (lvl.includes("hard") || lvl.includes("diff")) hard++;
            else medium++;
          }
        }
      });
    });

    return { easy, medium, hard };
  }, [generationMeta, parsedQuestions]);

  const getTypesStatsForTopic = useCallback((topicName: string, subTopic: string = "") => {
    let scq = 0;
    let numerical = 0;

    if (!generationMeta || !generationMeta.batches) {
      return { scq, numerical };
    }

    generationMeta.batches.forEach(b => {
      b.slots.forEach(s => {
        const sTopic = s.topicName || "";
        const sSub = s.subTopic || "";
        const targetSub = subTopic || "";
        if (
          sTopic.toLowerCase() === topicName.toLowerCase() &&
          sSub.toLowerCase() === targetSub.toLowerCase()
        ) {
          const q = parsedQuestions.find(pq => pq.number === s.globalNum);
          if (q) {
            const isScq = !!(q.optionA || q.optionB || q.optionC || q.optionD);
            if (isScq) scq++;
            else numerical++;
          }
        }
      });
    });

    return { scq, numerical };
  }, [generationMeta, parsedQuestions]);

  const totalScqsGenerated = useMemo(() => {
    return parsedQuestions.filter(q => !!(q.optionA || q.optionB || q.optionC || q.optionD)).length;
  }, [parsedQuestions]);

  const totalNumericalsGenerated = useMemo(() => {
    return parsedQuestions.filter(q => !(q.optionA || q.optionB || q.optionC || q.optionD)).length;
  }, [parsedQuestions]);

  const expectedScqCount = useMemo(() => {
    if (syllabusMode === "google") {
      return questionMix.SCQ;
    } else {
      return customScqCount !== "" ? customScqCount : "—";
    }
  }, [syllabusMode, questionMix.SCQ, customScqCount]);

  const expectedNumericalCount = useMemo(() => {
    if (syllabusMode === "google") {
      return questionMix.NUMERICAL;
    } else {
      return customNumericalCount !== "" ? customNumericalCount : "—";
    }
  }, [syllabusMode, questionMix.NUMERICAL, customNumericalCount]);

  const styleObj = getStreamStyle(examPattern);

  return (
    <div className="min-h-screen bg-[oklch(99%_0.003_0)] flex flex-col font-sans">
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-brand-orange text-white p-2.5 rounded-2xl shadow-md shadow-brand-orange/15 transition-transform hover:scale-105 duration-200">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <span>ExamForge</span>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${styleObj.badge} tracking-wider font-extrabold animate-pulse`}>
                {styleObj.name}
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">by Vedantu Learning</p>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-bold bg-slate-50 border border-slate-150 px-3.5 py-1.5 rounded-full">
          JEE & NEET Question Engine
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {currentView === "CONFIG" ? (
            <motion.div
              key="config"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: "linear" }}
              className="h-[calc(100vh-73px)] overflow-y-auto p-6 md:p-8 space-y-8 max-w-7xl mx-auto"
            >
              {/* Header section inside dashboard */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-slate-100">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Design Your Question Paper Strategy</span>
                    <Sparkles className="w-6 h-6 text-brand-orange animate-bounce-subtle" />
                  </h2>
                  <p className="text-sm text-slate-500 mt-1.5 font-medium">
                    Configure target exams, tap into live syllabus taxonomy matching, and manage source files effortlessly.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold font-mono">Quick Stream Preset:</span>
                  <Button 
                    onClick={() => {
                      setSyllabusMode("google");
                      setExamPattern("JEE");
                    }} 
                    variant="outline" 
                    size="sm" 
                    className="text-xs bg-white h-9 border-purple-200 rounded-full text-purple-700 font-bold hover:bg-purple-50 hover:text-purple-800 cursor-pointer shadow-xs"
                  >
                    JEE Tracker
                  </Button>
                  <Button 
                    onClick={() => {
                      setSyllabusMode("google");
                      setExamPattern("NEET");
                    }} 
                    variant="outline" 
                    size="sm" 
                    className="text-xs bg-white h-9 border-orange-200 rounded-full text-orange-700 font-bold hover:bg-orange-50 hover:text-orange-800 cursor-pointer shadow-xs"
                  >
                    NEET Tracker
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Syllabus & Configuration */}
                <div className="lg:col-span-7 space-y-6">
                  <Card className="border border-slate-200/80 shadow-sm bg-white rounded-3xl overflow-hidden transition-all duration-200">
                    <CardHeader className="bg-slate-50/50 border-b py-5">
                      <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-brand-orange" />
                        Syllabus & Blueprint Alignment
                      </CardTitle>
                      <CardDescription className="font-medium text-xs">Select academic specifications and syllabus bounds</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="space-y-4">
                        <Label className="font-bold text-sm text-slate-750">Target Exam Stream</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { value: "JEE", label: "JEE Main & Advanced", desc: "Physics, Chemistry, Maths", stream: "jee" as const },
                            { value: "NEET", label: "NEET (Medical)", desc: "Physics, Chemistry, Biology", stream: "neet" as const },
                            { value: "CBSE", label: "CBSE Boards", desc: "Physics, Chemistry, Maths/Bio", stream: "centre" as const }
                          ].map((tab) => {
                            const isSelected = examPattern === tab.value;
                            return (
                              <WorkspaceCard
                                key={tab.value}
                                stream={tab.stream}
                                onClick={() => setExamPattern(tab.value)}
                                className={`h-26 p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 border text-left ${
                                  isSelected 
                                    ? "ring-2 ring-brand-orange/40 scale-[1.02] shadow-sm border-slate-300" 
                                    : "opacity-80 hover:opacity-100 hover:scale-[1.01] border-slate-200/80"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 font-mono">Stream preset</span>
                                  <span className="font-black text-xs text-slate-800 tracking-tight">{tab.value}</span>
                                </div>
                                <div>
                                  <div className="text-xs font-black text-slate-900 leading-tight">
                                    {tab.label}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-semibold mt-1">
                                    {tab.desc}
                                  </div>
                                </div>
                              </WorkspaceCard>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-5 border-slate-100">
                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-slate-750">Syllabus Mode Selection</Label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSyllabusMode("google")}
                              className={`rounded-full border px-5 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer flex-1 ${
                                syllabusMode === "google"
                                  ? "bg-brand-orange text-white border-transparent shadow-md shadow-brand-orange/15 scale-[1.02]"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                              }`}
                            >
                              Syllabus Taxonomy Map
                            </button>
                            <button
                              type="button"
                              onClick={() => setSyllabusMode("custom")}
                              className={`rounded-full border px-5 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer flex-1 ${
                                syllabusMode === "custom"
                                  ? "bg-brand-orange text-white border-transparent shadow-md shadow-brand-orange/15 scale-[1.02]"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                              }`}
                            >
                              Custom Phrase Input
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6 border-slate-100">
                      {syllabusMode === "google" ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-slate-700">Explore Syllabus Taxonomy</Label>
                            {loadingTaxonomy && (
                              <span className="text-xs text-primary flex items-center gap-1.5 animate-pulse font-medium">
                                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                                Customizing dataset indexes...
                              </span>
                            )}
                          </div>
                          <SyllabusBasket
                            taxonomyData={taxonomy}
                            basket={basket}
                            onBasketChange={setBasket}
                            examPattern={examPattern}
                          />
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <div className="space-y-1.5">
                            <Label className="font-bold text-xs text-slate-750 flex items-center gap-1.5">
                              <Upload className="w-4 h-4 text-orange-500" />
                              Digitize Questions PDF
                            </Label>
                            <p className="text-[11px] text-slate-500 leading-relaxed bg-orange-50/20 border border-orange-100/50 p-3 rounded-lg">
                              Upload a PDF containing questions. The AI engine will extract and digitize your exact questions verbatim, formatting them as SCQs or Numericals, and map candidates to the closest Syllabus taxonomy nodes.
                            </p>
                          </div>

                          {/* 📊 Guided PDF Document Pre-Context Card */}
                          <div className="border border-orange-100 bg-orange-50/10 p-4 rounded-xl space-y-4">
                            <div className="flex items-center gap-1.5 border-b border-orange-100/40 pb-2">
                              <Info className="w-4 h-4 text-orange-500" />
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Document Pre-Context Details</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              {/* Sync Exam Pattern */}
                              <div className="space-y-1.5 text-left">
                                <Label className="text-[11px] font-bold text-slate-600 block">Exam Stream</Label>
                                <div className="flex gap-1.5">
                                  {["JEE", "NEET", "CBSE"].map((pat) => (
                                    <button
                                      key={pat}
                                      type="button"
                                      onClick={() => setExamPattern(pat)}
                                      className={`flex-1 py-1 px-1.5 text-xs font-bold rounded-md border transition-all cursor-pointer ${
                                        examPattern === pat
                                          ? "bg-brand-orange/10 border-brand-orange text-brand-orange shadow-xs"
                                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                      }`}
                                    >
                                      {pat}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Custom Subject Selection */}
                              <div className="space-y-1.5 text-left">
                                <Label htmlFor="customSubject" className="text-[11px] font-bold text-slate-600 block">Subject Focus</Label>
                                <select
                                  id="customSubject"
                                  value={customSubject}
                                  onChange={(e) => {
                                    setCustomSubject(e.target.value);
                                    setCustomChapter("");
                                  }}
                                  className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-orange cursor-pointer"
                                >
                                  <option value="Physics">Physics</option>
                                  <option value="Chemistry">Chemistry</option>
                                  <option value="Mathematics">Mathematics</option>
                                  <option value="Biology">Biology</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              {/* Guided Chapter dropdown from Taxonomy list */}
                              <div className="space-y-1.5 text-left">
                                <Label htmlFor="customChapter" className="text-[11px] font-bold text-slate-600 block">Chapter Context</Label>
                                <select
                                  id="customChapter"
                                  value={customChapter}
                                  onChange={(e) => setCustomChapter(e.target.value)}
                                  className="w-full h-8 px-2 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-orange cursor-pointer"
                                >
                                  <option value="">-- Choose Chapter (Optional) --</option>
                                  {taxonomyChapters.map((ch) => (
                                    <option key={ch} value={ch}>{ch}</option>
                                  ))}
                                  <option value="__custom__">-- Type Custom Chapter name --</option>
                                </select>
                                
                                {(customChapter === "__custom__" || (customChapter && !taxonomyChapters.includes(customChapter))) && (
                                  <Input
                                    placeholder="Enter Custom Chapter..."
                                    value={customChapter === "__custom__" ? "" : customChapter}
                                    onChange={(e) => setCustomChapter(e.target.value)}
                                    className="h-8 text-xs mt-1.5 border border-slate-200"
                                  />
                                )}
                              </div>

                              {/* Topic / Subtopic Context */}
                              <div className="space-y-1.5 text-left">
                                <Label htmlFor="customTopic" className="text-[11px] font-bold text-slate-600 block">Topic / Subtopic (Optional)</Label>
                                <Input
                                  id="customTopic"
                                  placeholder="e.g., Rotational inertia, Hybridisation"
                                  value={customTopic}
                                  onChange={(e) => setCustomTopic(e.target.value)}
                                  className="h-8 text-xs border border-slate-200"
                                />
                              </div>
                            </div>

                            {/* Question and type distributions */}
                            <div className="border-t border-slate-100 pt-3 mt-1 grid grid-cols-3 gap-2.5">
                              <div className="space-y-1.5 text-left">
                                <Label htmlFor="customTotalCount" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Questions</Label>
                                <Input
                                  id="customTotalCount"
                                  type="number"
                                  min="1"
                                  placeholder="e.g. 15"
                                  value={customTotalCount === "" ? "" : customTotalCount}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCustomTotalCount(val === "" ? "" : parseInt(val, 10));
                                  }}
                                  className="h-8 text-xs font-extrabold text-slate-850"
                                />
                              </div>

                              <div className="space-y-1.5 text-left">
                                <Label htmlFor="customScqCount" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                                  Total SCQ
                                  <span className="font-normal text-[8px] italic text-slate-400 font-sans">(Opt)</span>
                                </Label>
                                <Input
                                  id="customScqCount"
                                  type="number"
                                  min="0"
                                  placeholder="e.g. 10"
                                  value={customScqCount === "" ? "" : customScqCount}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCustomScqCount(val === "" ? "" : parseInt(val, 10));
                                  }}
                                  className="h-8 text-xs text-slate-600 bg-slate-50/50"
                                />
                              </div>

                              <div className="space-y-1.5 text-left">
                                <Label htmlFor="customNumericalCount" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                                  Total Numerical
                                  <span className="font-normal text-[8px] italic text-slate-400 font-sans">(Opt)</span>
                                </Label>
                                <Input
                                  id="customNumericalCount"
                                  type="number"
                                  min="0"
                                  placeholder="e.g. 5"
                                  value={customNumericalCount === "" ? "" : customNumericalCount}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCustomNumericalCount(val === "" ? "" : parseInt(val, 10));
                                  }}
                                  className="h-8 text-xs text-slate-600 bg-slate-50/50"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div
                            {...getCustomRootProps()}
                            className={`border border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                              isCustomDragActive 
                                ? "border-orange-500 bg-orange-50/40" 
                                : "border-slate-200 hover:border-orange-500/50 hover:bg-slate-50/50 hover:shadow-xs"
                            }`}
                          >
                            <input {...getCustomInputProps()} />
                            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                            <p className="text-xs font-semibold text-slate-700">Drag & drop question PDF here, or click to browse</p>
                            <p className="text-[10px] text-slate-400 mt-1">Supports PDF, TXT, PNG, JPG</p>
                          </div>

                            {customExtractFiles.length > 0 && (
                              <div className="space-y-4 mt-4">
                                <Label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Uploaded Questions Source</Label>
                                <ul className="space-y-1.5 font-sans">
                                  {customExtractFiles.map((file, index) => (
                                    <li key={index} className="flex items-center justify-between bg-orange-50/40 px-3 py-2 border border-orange-100 rounded-lg text-xs font-semibold text-slate-750 font-sans">
                                      <span className="truncate max-w-[280px]" title={file.name}>
                                        {file.name}
                                      </span>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-slate-400 hover:text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer" 
                                        onClick={() => removeCustomFile(index)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </li>
                                  ))}
                                </ul>

                                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60 mt-2">
                                  <div className="text-left">
                                    <h4 className="text-xs font-bold text-slate-800">Source Document Loaded</h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Extract exact questions verbatim into interactive worksheet formats.</p>
                                  </div>
                                  <Button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="bg-brand-orange hover:bg-brand-orange/90 text-white font-extrabold select-none cursor-pointer text-xs h-10 px-5 rounded-full flex items-center justify-center gap-1.5 shadow-md shadow-brand-orange/15 transition-all self-end sm:self-auto shrink-0"
                                  >
                                    {isGenerating ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Digitizing...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Digitize & Generate
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Instructions / Specifications */}
                <Card className="border border-slate-200/80 shadow-sm bg-white rounded-2xl overflow-hidden text-sm">
                  <CardHeader className="bg-slate-50/50 border-b py-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-primary" />
                      Paper Constraints & Target Mix
                    </CardTitle>
                    <CardDescription>Configure questions proportions and metadata parameters</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Question Type Distribution Panel */}
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-4">
                      <div className="flex items-center justify-between border-b pb-2 border-slate-200/80">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Question Type Mix</span>
                        <div className="text-[11px] font-semibold font-sans">
                          {totalMixQuestions !== totalBasketQuestions ? (
                            <span className="text-amber-600 flex items-center gap-1 bg-amber-50 rounded px-2.5 py-1 border border-amber-100">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Mix ({totalMixQuestions}) mismatch topic count ({totalBasketQuestions})
                            </span>
                          ) : (
                            <span className="text-green-600 flex items-center gap-1 bg-green-50 rounded px-2.5 py-1 border border-green-100 font-bold">
                              <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Counts match ({totalMixQuestions})
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between gap-2 bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm">
                          <label className="text-xs text-slate-700 font-semibold select-none">Single Correct (SCQ):</label>
                          <input 
                            type="number" 
                            min="0"
                            className="w-16 p-1.5 text-center border rounded text-xs font-bold bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/25"
                            value={questionMix.SCQ}
                            onChange={(e) => handleTypeChange("SCQ", parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm">
                          <label className="text-xs text-slate-700 font-semibold select-none">Numerical Type:</label>
                          <input 
                            type="number" 
                            min="0"
                            className="w-16 p-1.5 text-center border rounded text-xs font-bold bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/25"
                            value={questionMix.NUMERICAL}
                            onChange={(e) => handleTypeChange("NUMERICAL", parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instructions" className="font-semibold text-slate-700">Special Instructions / Custom Directives</Label>
                      <Textarea
                        id="instructions"
                        placeholder="e.g., Target calculation-heavy kinematic formulas; include simple assertions; avoid generic templates."
                        value={additionalInstructions}
                        onChange={(e) => setAdditionalInstructions(e.target.value)}
                        className="resize-none h-24 text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: AI Strategy, Materials & CTA */}
              <div className="lg:col-span-5 space-y-6">
                <Card className="border border-slate-200/80 shadow-sm bg-white rounded-2xl overflow-hidden">
                  <CardHeader className="bg-slate-50/50 border-b py-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <FileQuestion className="w-4 h-4 text-primary" />
                      AI Input strategy & Intelligence Model
                    </CardTitle>
                    <CardDescription>Select model context and reference documents</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold text-slate-700 tracking-tight">Generation Mode</Label>
                        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg mt-2 h-10">
                          <button
                            type="button"
                            onClick={() => setGenerationMode("KNOWLEDGE_BASE")}
                            className={`text-xs py-2 font-medium rounded-md transition-all cursor-pointer ${
                              generationMode === "KNOWLEDGE_BASE"
                                ? "bg-white shadow-sm text-slate-900 border"
                                : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            Direct AI Synthesis
                          </button>
                          <button
                            type="button"
                            onClick={() => setGenerationMode("SOURCE_BASED")}
                            className={`text-xs py-2 font-medium rounded-md transition-all cursor-pointer ${
                              generationMode === "SOURCE_BASED"
                                ? "bg-white shadow-sm text-slate-900 border"
                                : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            Source Documents Mode
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                          {generationMode === "KNOWLEDGE_BASE"
                            ? "Autonomous generation strictly tied to standardized syllabus guides without uploading additional reference papers."
                            : "Extract high-contrast vector page snapshots from reference textbooks or PDFs to design customized clones."}
                        </p>
                      </div>

                      {generationMode === "SOURCE_BASED" && (
                        <div className="space-y-4 border-t pt-4 animate-in fade-in duration-200">
                          <Label className="text-sm font-semibold text-slate-700">Reference Materials & Chapters</Label>
                          <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                              isDragActive ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                            }`}
                          >
                            <input {...getInputProps()} />
                            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                            <p className="text-xs font-semibold text-slate-700">Drag & drop textbook pages, practice materials here</p>
                            <p className="text-[10px] text-slate-400 mt-1">Supports PDF, TXT, PNG, JPG files</p>
                          </div>

                          {files.length > 0 && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Queue for Syncing</Label>
                                <ul className="space-y-1 max-h-48 overflow-y-auto">
                                  {files.map((file, index) => (
                                    <li key={index} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border text-xs">
                                      <span className="truncate max-w-[220px] font-medium text-slate-700" title={file.name}>
                                        {file.name}
                                      </span>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-destructive" onClick={() => removeFile(index)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="bg-orange-50/20 border border-orange-100 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center gap-2 border-b border-orange-100/60 pb-2">
                                  <SlidersHorizontal className="w-4 h-4 text-brand-orange" />
                                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Source-Based Specifications</span>
                                </div>

                                {/* Target Topic */}
                                <div className="space-y-1.5 text-left">
                                  <Label htmlFor="source-topic" className="text-[11px] font-bold text-slate-600 block">Target Topic / Chapter Focus</Label>
                                  <Input
                                    id="source-topic"
                                    placeholder="e.g. Current Electricity, Laws of Motion"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="h-8 text-xs border border-slate-200 bg-white"
                                  />
                                </div>

                                {/* Target Exam Switch */}
                                <div className="space-y-1.5 text-left">
                                  <Label className="text-[11px] font-bold text-slate-600 block">Exam Stream</Label>
                                  <div className="flex gap-2">
                                    {["JEE", "NEET"].map((pat) => (
                                      <button
                                        key={pat}
                                        type="button"
                                        onClick={() => setExamPattern(pat)}
                                        className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                          examPattern === pat
                                            ? "bg-brand-orange text-white border-transparent shadow-xs"
                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                        }`}
                                      >
                                        {pat} Pattern
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Difficulty Distributions */}
                                <div className="space-y-2">
                                  <Label className="text-[11px] font-bold text-slate-600 block">Difficulty Levels Count</Label>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                      <label htmlFor="source-easy" className="text-[10px] text-slate-500 font-medium">Easy</label>
                                      <Input
                                        id="source-easy"
                                        type="number"
                                        min="0"
                                        value={easyCount}
                                        onChange={(e) => setEasyCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                        className="h-8 text-xs text-center border-slate-200 bg-white font-bold"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label htmlFor="source-medium" className="text-[10px] text-slate-500 font-medium">Medium</label>
                                      <Input
                                        id="source-medium"
                                        type="number"
                                        min="0"
                                        value={mediumCount}
                                        onChange={(e) => setMediumCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                        className="h-8 text-xs text-center border-slate-200 bg-white font-bold"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label htmlFor="source-hard" className="text-[10px] text-slate-500 font-medium">Hard</label>
                                      <Input
                                        id="source-hard"
                                        type="number"
                                        min="0"
                                        value={hardCount}
                                        onChange={(e) => setHardCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                        className="h-8 text-xs text-center border-slate-200 bg-white font-bold"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="border-t pt-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="modelSelection" className="font-semibold text-slate-700">AI Compute Engine</Label>
                          <select
                            id="modelSelection"
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="auto">Auto Fallback (Flash 3.5 ➔ Flash 2.5 ➔ Pro 2.5 ➔ Pro 3.1 Preview)</option>
                            <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-2 pt-1">
                          <input
                            type="checkbox"
                            id="withFigures"
                            checked={withFigures}
                            onChange={(e) => setWithFigures(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          />
                          <Label htmlFor="withFigures" className="font-medium text-xs text-slate-700 cursor-pointer select-none">
                            Draft diagrams instructions (for figures, geometries & coordinates)
                          </Label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-slate-100/50 p-5 rounded-2xl border space-y-4 flex flex-col justify-between shadow-sm">
                  {error && (
                    <div className="flex gap-2 bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-lg text-xs leading-normal">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    onClick={handleGenerate}
                    className="w-full h-14 text-base font-bold select-none cursor-pointer shadow-lg shadow-primary/15 transition-all text-white bg-primary hover:bg-primary/95 flex items-center justify-center gap-2 rounded-xl"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate Problem Set
                  </Button>
                  <p className="text-[10px] text-center text-slate-400">
                    Calculations are processed on high-speed servers. Output stream starts in ~3-5 seconds.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
              key="output"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: "linear" }}
              className="h-[calc(100vh-73px)] flex flex-col overflow-hidden bg-slate-50"
            >
              {/* Header top bar inside OUTPUT view */}
              <header className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => setCurrentView("CONFIG")}
                    variant="outline"
                    className="gap-2 h-10 border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-sm text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Edit Configuration
                  </Button>
                  <div className="h-5 w-[1px] bg-slate-200" />
                  <div className="flex items-center gap-2.5">
                    <div className="bg-brand-orange/10 text-brand-orange p-2 rounded-lg">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                        <span>Workspace Canvas</span>
                        <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded ${styleObj.badge} tracking-wider font-extrabold`}>
                          {styleObj.name}
                        </span>
                      </h2>
                      <p className="text-[10px] font-semibold text-slate-500">Live compilation, equations, steps, and worksheet sync</p>
                    </div>
                  </div>
                </div>

              <div className="hidden sm:flex items-center gap-3 text-xs bg-slate-100/85 px-4 py-2 border rounded-full text-slate-650">
                <span className="font-medium">Exam: <strong className="text-slate-900 font-bold">{examPattern}</strong></span>
                <span className="text-slate-300">|</span>
                <span className="font-medium">Topic: <strong className="text-slate-900 font-bold truncate max-w-[200px]" title={activeDisplayTopicTooltip}>{activeDisplayTopic}</strong></span>
              </div>
            </header>

            {/* Split panels container */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Panel: Progress, Status & Google Sheets Integration */}
              <div className="w-full md:w-[380px] lg:w-[420px] border-r border-slate-200 bg-white flex flex-col overflow-y-auto shrink-0 p-6 space-y-6">
                
                {/* Processing State Widget */}
                {isGenerating && (
                  <Card className="border border-slate-200/80 shadow-inner bg-slate-50/50 p-5 rounded-xl space-y-4">
                    <div className="flex items-center justify-between border-b pb-3 border-slate-200/65">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                          Synthesizing Draft...
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      <div className="space-y-2 px-0.5">
                        <div className="flex justify-between items-end">
                          <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Processing live stream...</span>
                          <span className="font-black text-4xl text-brand-orange tracking-tight leading-none">{progress}%</span>
                        </div>
                        <div className="h-2 bg-slate-200/80 rounded-full overflow-hidden border">
                          <div className="h-full bg-brand-orange transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>
 
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs">
                          <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-0.5">Time Elapsed</p>
                          <p className="text-lg font-black text-slate-800 tracking-tight">{elapsedTime}s</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs">
                          <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-0.5">Avg Time / Q</p>
                          <p className="text-lg font-black text-emerald-600 tracking-tight">
                            {parsedQuestions.length > 0 ? `${(elapsedTime / parsedQuestions.length).toFixed(1)}s` : "—"}
                          </p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs">
                          <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-0.5">Tokens</p>
                          <p className="text-lg font-black text-slate-800 tracking-tight">{tokensUsed}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs">
                          <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-0.5">Q. Progress</p>
                          <p className="text-lg font-black text-slate-850 tracking-tight">
                            {parsedQuestions.length} / {totalBasketQuestions || 5}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Detailed Generation Analytics Card */}
                {(isGenerating || generatedContent) && (
                  <Card className="border border-slate-200/80 shadow-xs bg-white p-5 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 border-b pb-3 border-slate-100">
                      <Sparkles className="w-4 h-4 text-brand-orange animate-pulse" />
                      <h3 className="text-xs font-black text-slate-800 tracking-tight uppercase">
                        Detailed Generation Analytics
                      </h3>
                    </div>

                    {/* Time & Performance Metrics */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                        ⏱️ Time & Performance
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-center font-mono">
                        <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100/80">
                          <p className="text-[9px] uppercase text-slate-500 font-sans font-bold">Total Time</p>
                          <p className="text-sm font-black text-slate-850">{elapsedTime || 0}s</p>
                        </div>
                        <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100/80">
                          <p className="text-[9px] uppercase text-slate-500 font-sans font-bold">Avg. Time / Q</p>
                          <p className="text-sm font-black text-emerald-600">
                            {parsedQuestions.length > 0
                              ? `${(elapsedTime / parsedQuestions.length).toFixed(1)}s`
                              : totalBasketQuestions > 0
                              ? `${(elapsedTime / totalBasketQuestions).toFixed(1)}s`
                              : "0.0s"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Question Type Totals */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                        📋 Question Types Generated
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-center font-mono">
                        <div className="bg-blue-50/40 p-2.5 rounded-lg border border-blue-100/40">
                          <p className="text-[9px] uppercase text-blue-750 font-sans font-bold">Total SCQ</p>
                          <p className="text-sm font-black text-blue-900">
                            {totalScqsGenerated} / {expectedScqCount}
                          </p>
                        </div>
                        <div className="bg-purple-50/40 p-2.5 rounded-lg border border-purple-100/40">
                          <p className="text-[9px] uppercase text-purple-750 font-sans font-bold">Total Numerical</p>
                          <p className="text-sm font-black text-purple-900">
                            {totalNumericalsGenerated} / {expectedNumericalCount}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Model Orchestration Breakdown */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                        🤖 Model Breakdown
                      </h4>
                      <div className="space-y-1.5">
                        {Object.keys(modelBreakdown).length > 0 ? (
                          Object.entries(modelBreakdown).map(([model, count]) => {
                            let modelLabel = model;
                            if (model === "gemini-3.1-pro-preview") modelLabel = "Gemini 3.1 Pro";
                            else if (model === "gemini-2.5-pro") modelLabel = "Gemini 2.5 Pro";
                            else if (model === "gemini-3.5-flash") modelLabel = "Gemini 3.5 Flash";
                            else if (model === "gemini-2.5-flash") modelLabel = "Gemini 2.5 Flash";

                            return (
                              <div key={model} className="flex items-center justify-between bg-slate-50/70 px-3 py-2 rounded-lg border border-slate-100/80 text-[11px]">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                  <span className="font-bold text-slate-700">{modelLabel}</span>
                                </div>
                                <span className="font-mono font-black text-slate-900 bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 rounded text-[10px]">
                                  {count} {count === 1 ? "Q" : "Qs"}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex items-center justify-between bg-slate-50/50 px-3 py-2 rounded-lg border border-slate-100/80 text-[11px] text-slate-550 italic font-medium">
                            <span>Orchestrating model chain...</span>
                            <span className="font-mono text-[9px] uppercase font-bold text-slate-400">Auto</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Topic Generation Breakdown */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                        📊 Topic Breakdown
                      </h4>
                      <div className="max-h-[220px] overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
                        {syllabusMode === "google" && basket.length > 0 ? (
                          basket.map((item) => {
                            const genCount = getGeneratedCountForTopic(item.node.topicName, item.node.subTopic01 || "");
                            const isCompleted = genCount >= item.count;
                            const stats = getDifficultyStatsForTopic(item.node.topicName, item.node.subTopic01 || "");
                            const typeStats = getTypesStatsForTopic(item.node.topicName, item.node.subTopic01 || "");
                            return (
                              <div key={item.id} className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100/80 space-y-1.5 text-[11px]">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-1 flex-1">
                                    <p className="font-black text-slate-800 leading-tight">{item.node.topicName}</p>
                                    {item.node.subTopic01 && (
                                      <p className="text-[10px] text-slate-500 font-semibold leading-none pt-0.5 pb-1">
                                        📍 Subtopic: <span className="text-indigo-650 font-bold">{item.node.subTopic01}</span>
                                      </p>
                                    )}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[9px] text-slate-450 font-extrabold tracking-tight uppercase mr-0.5">{item.node.chapterName}</span>
                                      <span className="text-[8.5px] bg-emerald-50 text-emerald-750 border border-emerald-100/60 px-1 py-0.2 rounded font-mono font-bold">
                                        {stats.easy}E
                                      </span>
                                      <span className="text-[8.5px] bg-amber-50 text-amber-750 border border-amber-100/60 px-1 py-0.2 rounded font-mono font-bold">
                                        {stats.medium}M
                                      </span>
                                      <span className="text-[8.5px] bg-rose-50 text-rose-705 border border-rose-100/60 px-1 py-0.2 rounded font-mono font-bold">
                                        {stats.hard}H
                                      </span>
                                      <span className="text-[8.5px] bg-blue-50 text-blue-750 border border-blue-100/60 px-1 py-0.2 rounded font-mono font-bold">
                                        {typeStats.scq} SCQ
                                      </span>
                                      <span className="text-[8.5px] bg-purple-50 text-purple-750 border border-purple-100/60 px-1 py-0.2 rounded font-mono font-bold">
                                        {typeStats.numerical} NUM
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className={`font-mono font-black text-[10px] px-2 py-0.5 rounded border ${
                                      isCompleted 
                                        ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                                        : isGenerating 
                                        ? "bg-amber-50 border-amber-100 text-amber-700 animate-pulse font-extrabold" 
                                        : "bg-slate-100 border-slate-200 text-slate-655"
                                    }`}>
                                      {genCount} / {item.count}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="h-1 w-full bg-slate-100/80 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${isCompleted ? "bg-emerald-500" : "bg-amber-500"}`}
                                    style={{ width: `${Math.min(100, (genCount / item.count) * 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          (() => {
                            const customEasyCount = parsedQuestions.filter(q => (q.level || "Medium").toLowerCase().includes("easy")).length;
                            const customMediumCount = parsedQuestions.filter(q => {
                              const lvl = (q.level || "Medium").toLowerCase();
                              return !lvl.includes("easy") && !lvl.includes("hard") && !lvl.includes("diff");
                            }).length;
                            const customHardCount = parsedQuestions.filter(q => {
                              const lvl = (q.level || "Medium").toLowerCase();
                              return lvl.includes("hard") || lvl.includes("diff");
                            }).length;
                            const customScqCountGenerated = parsedQuestions.filter(q => !!(q.optionA || q.optionB || q.optionC || q.optionD)).length;
                            const customNumericalCountGenerated = parsedQuestions.filter(q => !(q.optionA || q.optionB || q.optionC || q.optionD)).length;

                            return (
                              <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100/80 space-y-1.5 text-[11px]">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-1 flex-1">
                                    <p className="font-black text-slate-800 leading-tight">{topic || "Custom Extract Focus"}</p>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[9px] text-slate-450 font-extrabold tracking-tight uppercase mr-0.5">{customSubject || "General Practice"}</span>
                                      <span className="text-[8.5px] bg-emerald-50 text-emerald-750 border border-emerald-100/60 px-1 py-0.2 rounded font-mono font-bold">
                                        {customEasyCount}E
                                      </span>
                                      <span className="text-[8.5px] bg-amber-50 text-amber-750 border border-amber-100/60 px-1 py-0.2 rounded font-mono font-bold">
                                        {customMediumCount}M
                                      </span>
                                      <span className="text-[8.5px] bg-rose-50 text-rose-705 border border-rose-100/60 px-1 py-0.2 rounded font-mono font-bold">
                                        {customHardCount}H
                                      </span>
                                      <span className="text-[8.5px] bg-blue-50 text-blue-750 border border-blue-100/60 px-1 py-0.2 rounded font-mono font-bold">
                                        {customScqCountGenerated} SCQ
                                      </span>
                                      <span className="text-[8.5px] bg-purple-50 text-purple-750 border border-purple-100/60 px-1 py-0.2 rounded font-mono font-bold">
                                        {customNumericalCountGenerated} NUM
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="font-mono font-black text-[10px] px-2 py-0.5 rounded border bg-indigo-50 border-indigo-100 text-indigo-700">
                                      {parsedQuestions.length} / {totalBasketQuestions || 5}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="h-1 w-full bg-slate-100/80 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-indigo-500 transition-all duration-300"
                                    style={{ width: `${Math.min(100, (parsedQuestions.length / (totalBasketQuestions || 5)) * 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Right Panel: Rendered Academic Document Canvas */}
              <div className="flex-1 bg-slate-100/50 p-6 overflow-y-auto h-full space-y-6">
                <Card className="min-h-full border border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden flex flex-col">
                  <header className="border-b bg-white sticky top-0 z-10 flex flex-col lg:flex-row lg:items-center justify-between p-4 lg:p-6 gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-800">Generated Output Draft</CardTitle>
                      <CardDescription className="text-xs text-slate-500 font-sans">
                        {generatedContent ? "Review mathematical equations, diagrams instructions, and answers below." : "AI engine is generating questions. Content streams real-time."}
                      </CardDescription>
                    </div>

                    {generatedContent && (
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Toggle Preview mode */}
                        <div className="flex items-center p-1 bg-slate-100 rounded-lg h-9 mr-1">
                          <button
                            type="button"
                            onClick={() => setPreviewMode("compiled")}
                            className={`text-[11px] px-3 py-1 font-bold rounded-md transition-all cursor-pointer ${
                              previewMode === "compiled"
                                ? "bg-white shadow-xs text-slate-800"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Compiled View
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewMode("raw")}
                            className={`text-[11px] px-3 py-1 font-bold rounded-md transition-all cursor-pointer ${
                              previewMode === "raw"
                                ? "bg-white shadow-xs text-slate-800"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Raw LaTeX Code
                          </button>
                        </div>

                        <div className="h-5 w-[1px] bg-slate-200 hidden xl:block mr-1" />

                        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 h-9 text-xs">
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {isCopied ? "Copied!" : "Copy Raw"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportAllToZip}
                          disabled={isExportingZip}
                          className="gap-1.5 h-9 text-xs font-black border-indigo-400 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 shadow-sm hover:scale-102 active:scale-98 transition-all"
                        >
                          {isExportingZip ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          ) : (
                            <Download className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                          Download ZIP (All Word + LaTeX)
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportToLatexDocWithoutCitation}
                          className="gap-1.5 h-9 text-xs font-bold border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 shadow-sm hover:scale-102 active:scale-98 transition-all"
                        >
                          <Download className="w-3.5 h-3.5 text-teal-600" />
                          LaTeX Doc (No Citation)
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadCompiledViewHtml}
                          className="gap-1.5 h-9 text-xs font-bold border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 shadow-sm hover:scale-102 active:scale-98 transition-all"
                        >
                          <Download className="w-3.5 h-3.5 text-rose-600" />
                          Compiled HTML View
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => triggerPrint("question")} className="gap-1.5 h-9 text-xs font-bold border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700">
                          <Download className="w-3.5 h-3.5" />
                          PDF (Question)
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => triggerPrint("solutions")} className="gap-1.5 h-9 text-xs font-bold border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700">
                          <Download className="w-3.5 h-3.5" />
                          PDF (Quest+Sol)
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportToLatexQuestionsOnly} className="gap-1.5 h-9 text-xs font-bold border-slate-200">
                          <Download className="w-3.5 h-3.5" />
                          LaTeX (.tex) Q
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportToLatexWithSolutions} className="gap-1.5 h-9 text-xs font-bold border-slate-200">
                          <Download className="w-3.5 h-3.5" />
                          LaTeX (.tex) Q+S
                        </Button>
                      </div>
                    )}
                  </header>

                  <CardContent className="p-6 flex-1 bg-slate-50/50 overflow-y-auto">
                    {generatedContent ? (
                      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs p-8 relative overflow-hidden selection:bg-brand-orange/10 max-w-4xl mx-auto my-2">
                        {/* Subtle badge indicating stream style instantly */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5">
                          <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-sm border ${
                            examPattern === "JEE" 
                              ? "bg-purple-50 text-purple-700 border-purple-200/60" 
                              : examPattern === "NEET" 
                                ? "bg-amber-50 text-amber-700 border-amber-200/60" 
                                : "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          }`}>
                            {examPattern} Pattern
                          </span>
                        </div>

                        {/* Compiled KaTeX content area or Raw uncompiled LaTeX template */}
                        {previewMode === "raw" ? (
                          <div className="mt-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider font-mono">Uncompiled Source Markdown & KaTeX Markup</span>
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={handleCopy}
                                className="h-7 text-[11px] gap-1 px-2 cursor-pointer font-bold border-slate-200"
                              >
                                {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                {isCopied ? "Copied" : "Copy Source"}
                              </Button>
                            </div>
                            <pre className="math-raw-code leading-relaxed text-xs block whitespace-pre-wrap select-all font-mono">
                              {generatedContent}
                            </pre>
                          </div>
                        ) : (
                          <div className="mt-6 space-y-6 text-slate-800">
                            {/* Copy Tools directly inside the box */}
                            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-3">
                              <span className="text-xs text-slate-500 font-bold flex items-center gap-1.5 font-sans">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                                Section-Wise Exam Paper Draft (Count-Numbered)
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => handleCopyAsFormat("readable")}
                                  className="h-7 text-xs gap-1 px-2.5 font-bold hover:bg-slate-50 border-slate-200"
                                >
                                  {isCopiedReadable ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                  {isCopiedReadable ? "Copied" : "Copy Readable Draft"}
                                </Button>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => handleCopyAsFormat("raw")}
                                  className="h-7 text-xs gap-1 px-2.5 font-bold hover:bg-slate-50 border-slate-200"
                                >
                                  {isCopiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                  {isCopiedRaw ? "Copied" : "Copy Raw LaTeX"}
                                </Button>
                              </div>
                            </div>

                            {/* Section-Wise Readable Formatting */}
                            {(() => {
                              if (parsedQuestions.length === 0) {
                                return (
                                  <div className="prose prose-slate max-w-none text-sm leading-relaxed">
                                    <RichMathMarkdown content={generatedContent} />
                                  </div>
                                );
                              }

                              const scqs = parsedQuestions.filter(q => q.optionA || q.optionB || q.optionC || q.optionD);
                              const numericals = parsedQuestions.filter(q => !(q.optionA || q.optionB || q.optionC || q.optionD));
                              let unifiedIndex = 1;

                              return (
                                <div className="space-y-8 text-left">
                                  {scqs.length > 0 && (
                                    <div className="space-y-6">
                                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 font-black text-xs text-slate-800 tracking-wider text-center uppercase font-sans">
                                        SECTION I: SINGLE CHOICE QUESTIONS
                                      </div>
                                      <div className="space-y-6">
                                        {scqs.map((q) => {
                                          const currentNum = unifiedIndex++;
                                          return (
                                            <div key={q.id || currentNum} className="border-b border-slate-100 pb-6 space-y-3 last:border-0 last:pb-0 font-sans">
                                              <div className="font-bold text-sm text-slate-950 flex items-start gap-1">
                                                <span className="shrink-0">Question {currentNum}:</span>
                                                <span className="font-medium text-slate-900 leading-relaxed max-w-full">
                                                  <MathMarkdown content={q.questionText} />
                                                </span>
                                              </div>

                                              <div className="space-y-1 pl-6">
                                                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Options:</div>
                                                {(() => {
                                                  const lenA = q.optionA?.length || 0;
                                                  const lenB = q.optionB?.length || 0;
                                                  const lenC = q.optionC?.length || 0;
                                                  const lenD = q.optionD?.length || 0;
                                                  const maxLen = Math.max(lenA, lenB, lenC, lenD);
                                                  
                                                  let gridClass = "grid-cols-1";
                                                  if (maxLen < 15) {
                                                    gridClass = "grid-cols-2 sm:grid-cols-4";
                                                  } else if (maxLen < 45) {
                                                    gridClass = "grid-cols-1 sm:grid-cols-2";
                                                  }
                                                  
                                                  return (
                                                    <div className={`grid ${gridClass} gap-x-8 gap-y-2`}>
                                                      {q.optionA && (
                                                        <div className="text-xs text-slate-755 flex items-start gap-1.5 leading-relaxed">
                                                          <span className="font-bold text-slate-500 shrink-0 select-none">(a)</span>
                                                          <span className="text-slate-800">
                                                            <MathMarkdown content={q.optionA} />
                                                          </span>
                                                        </div>
                                                      )}
                                                      {q.optionB && (
                                                        <div className="text-xs text-slate-755 flex items-start gap-1.5 leading-relaxed">
                                                          <span className="font-bold text-slate-500 shrink-0 select-none">(b)</span>
                                                          <span className="text-slate-800">
                                                            <MathMarkdown content={q.optionB} />
                                                          </span>
                                                        </div>
                                                      )}
                                                      {q.optionC && (
                                                        <div className="text-xs text-slate-755 flex items-start gap-1.5 leading-relaxed">
                                                          <span className="font-bold text-slate-500 shrink-0 select-none">(c)</span>
                                                          <span className="text-slate-800">
                                                            <MathMarkdown content={q.optionC} />
                                                          </span>
                                                        </div>
                                                      )}
                                                      {q.optionD && (
                                                        <div className="text-xs text-slate-755 flex items-start gap-1.5 leading-relaxed">
                                                          <span className="font-bold text-slate-500 shrink-0 select-none">(d)</span>
                                                          <span className="text-slate-800">
                                                            <MathMarkdown content={q.optionD} />
                                                          </span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })()}
                                              </div>

                                              <div className="bg-slate-50/60 p-4 rounded-xl space-y-2 border border-slate-100/60 text-xs pl-6">
                                                <div>
                                                  <span className="font-bold text-slate-700 mr-1.5">Answer:</span>
                                                  <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-sm font-bold text-[11px]">{q.answer || "N/A"}</span>
                                                </div>
                                                {q.solution && (
                                                  <div className="leading-relaxed text-slate-650">
                                                    <span className="font-bold text-slate-700 block mb-1">Solution:</span>
                                                    <div className="text-slate-800">
                                                      <MathMarkdown content={q.solution} />
                                                    </div>
                                                  </div>
                                                )}
                                                <div className="flex flex-wrap gap-4 text-[10px] text-slate-400 uppercase tracking-wider font-semibold border-t border-slate-100 pt-2.5 mt-2 select-none">
                                                  <span>Question Type: <strong className="text-slate-600 font-bold">SCQ</strong></span>
                                                  <span>Level: <strong className="text-slate-600 font-bold">{q.level || "Medium"}</strong></span>
                                                  {q.citation && <span>Citation: <strong className="text-slate-600 font-bold">{q.citation}</strong></span>}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {numericals.length > 0 && (
                                    <div className="space-y-6 pt-4">
                                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 font-black text-xs text-slate-800 tracking-wider text-center uppercase font-sans">
                                        SECTION II: INTEGER-TYPE NUMERICAL QUESTIONS
                                      </div>
                                      <div className="space-y-6">
                                        {numericals.map((q) => {
                                          const currentNum = unifiedIndex++;
                                          return (
                                            <div key={q.id || currentNum} className="border-b border-slate-100 pb-6 space-y-3 last:border-0 last:pb-0 font-sans">
                                              <div className="font-bold text-sm text-slate-950 flex items-start gap-1">
                                                <span className="shrink-0">Question {currentNum}:</span>
                                                <span className="font-medium text-slate-900 leading-relaxed max-w-full">
                                                  <MathMarkdown content={q.questionText} />
                                                </span>
                                              </div>

                                              <div className="bg-slate-50/60 p-4 rounded-xl space-y-2 border border-slate-100/60 text-xs pl-6">
                                                <div>
                                                  <span className="font-bold text-slate-700 mr-1.5">Answer:</span>
                                                  <span className="font-mono bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-sm font-bold text-[11px]">{q.answer || "N/A"}</span>
                                                </div>
                                                {q.solution && (
                                                  <div className="leading-relaxed text-slate-650">
                                                    <span className="font-bold text-slate-700 block mb-1">Solution:</span>
                                                    <div className="text-slate-800">
                                                      <MathMarkdown content={q.solution} />
                                                    </div>
                                                  </div>
                                                )}
                                                <div className="flex flex-wrap gap-4 text-[10px] text-slate-400 uppercase tracking-wider font-semibold border-t border-slate-100 pt-2.5 mt-2 select-none">
                                                  <span>Question Type: <strong className="text-slate-600 font-bold">Numerical</strong></span>
                                                  <span>Level: <strong className="text-slate-600 font-bold">{q.level || "Medium"}</strong></span>
                                                  {q.citation && <span>Citation: <strong className="text-slate-600 font-bold">{q.citation}</strong></span>}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    ) : error ? (
                      <div className="h-full flex flex-col items-center justify-center p-12 text-center min-h-[380px] bg-white border border-slate-200/80 rounded-xl max-w-4xl mx-auto my-2 shadow-xs">
                        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4 text-rose-500 border border-rose-100 shadow-sm animate-bounce">
                          <AlertTriangle className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-bold text-slate-950 mb-1 font-sans">Generation Flow Interrupted</h3>
                        <p className="text-xs text-slate-500 max-w-md font-sans mb-4">
                          The streaming connection received a failure state from the backend engine:
                        </p>
                        <div className="max-w-md w-full text-xs leading-relaxed text-rose-800 bg-rose-50/70 border border-rose-100/80 p-4 rounded-xl text-left font-mono my-3 whitespace-pre-wrap select-all overflow-x-auto">
                          <strong>Error Details:</strong>{"\n"}{error}
                        </div>
                        <p className="max-w-md text-[11px] text-slate-400 font-sans leading-relaxed mt-1">
                          This typically points to either a missing/malconfigured <strong>GEMINI_API_KEY</strong> secret in this environment, a temporary Google API quota limitation, or a large source visual document payload size (above 50MB payload limits).
                        </p>
                        <div className="flex items-center gap-3 mt-6">
                          <Button
                            onClick={() => { setError(""); setCurrentView("CONFIG"); }}
                            variant="outline"
                            className="text-xs h-9 font-bold border-slate-200 hover:bg-slate-50 cursor-pointer"
                          >
                            Edit Configuration
                          </Button>
                          <Button
                            onClick={() => { setError(""); handleGenerate(); }}
                            className="bg-primary hover:bg-primary/95 text-white text-xs h-9 font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Retry Generation
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 text-center min-h-[300px]">
                        <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-4 animate-pulse">
                          <FileQuestion className="w-8 h-8 text-primary/40 animate-bounce" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 mb-1">Synthesizing Problem Set...</h3>
                        <p className="max-w-md text-xs leading-relaxed text-slate-500 text-center font-sans">
                          Please wait. The AI model is preparing difficulty-tagged exam items, solutions, and mathematical formulas using standard LaTeX. Content will start rendering in real-time below.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Hidden printing layout for PDF exports */}
      {printType && (
        <div className="hidden print:block fixed inset-0 bg-white z-[99999] overflow-y-auto p-8 font-sans text-slate-900 leading-relaxed text-sm">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              @page { size: A4; margin: 15mm; }
              .no-print { display: none !important; }
              .diacolumn-flow {
                column-count: 2 !important;
                -webkit-column-count: 2 !important;
                -moz-column-count: 2 !important;
                column-gap: 24px !important;
                column-rule: 0.5px solid #cbd5e1 !important;
              }
              .page-break-avoid {
                page-break-inside: auto !important;
                break-inside: auto !important;
                -webkit-column-break-inside: auto !important;
                display: block !important;
              }
            }
          `}} />
          {(() => {
            const questions = parsedQuestions;
            const scqs = questions.filter(q => q.optionA || q.optionB || q.optionC || q.optionD);
            const numericals = questions.filter(q => !(q.optionA || q.optionB || q.optionC || q.optionD));
            let unifiedIndex = 1;

            return (
              <div className="max-w-[800px] mx-auto">
                <div className="diacolumn-flow font-sans">
                  {/* Section I */}
                  {scqs.length > 0 && (
                    <>
                      <div className="page-break-avoid border-y-2 border-slate-900 py-1.5 mb-5 text-center font-bold text-xs uppercase tracking-wider font-sans">
                        SECTION I: MULTIPLE CHOICE QUESTIONS
                      </div>
                      {scqs.map((q) => {
                        const currentNum = unifiedIndex++;
                        return (
                          <div key={q.id || currentNum} className="page-break-avoid border-b border-dashed border-slate-200 pb-5 mb-5 space-y-2 last:border-0 last:pb-0 last:mb-0 font-sans">
                            <div className="font-bold flex items-start gap-1 text-sm text-slate-950">
                              <span className="shrink-0">Question {currentNum}:</span>
                              <div className="font-normal text-slate-900 leading-relaxed">
                                <MathMarkdown content={q.questionText} />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pl-6 text-xs text-slate-800">
                              {q.optionA && (
                                <div className="flex items-start gap-1">
                                  <strong>(a)</strong>
                                  <div>
                                    <MathMarkdown content={q.optionA} />
                                  </div>
                                </div>
                              )}
                              {q.optionB && (
                                <div className="flex items-start gap-1">
                                  <strong>(b)</strong>
                                  <div>
                                    <MathMarkdown content={q.optionB} />
                                  </div>
                                </div>
                              )}
                              {q.optionC && (
                                <div className="flex items-start gap-1">
                                  <strong>(c)</strong>
                                  <div>
                                    <MathMarkdown content={q.optionC} />
                                  </div>
                                </div>
                              )}
                              {q.optionD && (
                                <div className="flex items-start gap-1">
                                  <strong>(d)</strong>
                                  <div>
                                    <MathMarkdown content={q.optionD} />
                                  </div>
                                </div>
                              )}
                            </div>

                            {printType === "solutions" && (
                              <div className="text-xs pl-6 mt-2 space-y-1 page-break-avoid">
                                <p className="text-slate-950 font-bold">Answer: ({q.answer ? q.answer.trim().toUpperCase().replace(/[()]/g, '') : "A"})</p>
                                {q.solution && (
                                  <div className="text-slate-900 space-y-1">
                                    <strong>Solution:</strong>
                                    <div className="text-slate-800 leading-relaxed font-sans mt-0.5">
                                      <MathMarkdown content={q.solution} />
                                    </div>
                                  </div>
                                )}
                                <p className="text-[10px] text-slate-500 font-medium italic pt-1">Level: {q.level || "Medium"} | Taxonomy Reference: {q.citation || "N/A"}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Section II */}
                  {numericals.length > 0 && (
                    <>
                      <div className="page-break-avoid border-y-2 border-slate-900 py-1.5 my-5 text-center font-bold text-xs uppercase tracking-wider font-sans">
                        SECTION II: INTEGER-TYPE NUMERICAL QUESTIONS
                      </div>
                      {numericals.map((q) => {
                        const currentNum = unifiedIndex++;
                        return (
                          <div key={q.id || currentNum} className="page-break-avoid border-b border-dashed border-slate-200 pb-5 mb-5 space-y-2 last:border-0 last:pb-0 last:mb-0 font-sans">
                            <div className="font-bold flex items-start gap-1 text-sm text-slate-950">
                              <span className="shrink-0">Question {currentNum}:</span>
                              <div className="font-normal text-slate-900 leading-relaxed">
                                <MathMarkdown content={q.questionText} />
                              </div>
                            </div>

                            {printType === "solutions" && (
                              <div className="text-xs pl-6 mt-2 space-y-1 page-break-avoid">
                                <p className="text-slate-950 font-bold">Answer: {q.answer ? q.answer.trim() : "N/A"}</p>
                                {q.solution && (
                                  <div className="text-slate-900 space-y-1">
                                    <strong>Solution:</strong>
                                    <div className="text-slate-800 leading-relaxed font-sans mt-0.5">
                                      <MathMarkdown content={q.solution} />
                                    </div>
                                  </div>
                                )}
                                <p className="text-[10px] text-slate-500 font-medium italic pt-1">Level: {q.level || "Medium"} | Taxonomy Reference: {q.citation || "N/A"}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
