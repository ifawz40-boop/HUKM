import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sliders,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Share2,
  Type,
  Sun,
  Moon,
  Coffee,
  Check,
  RotateCcw,
  Volume2,
  Play,
  Pause,
  Square,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Highlighter,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { BookProject, BookChapter, ReaderAnnotation, ReaderAnnotationColor } from '../types/hukm';
import { UserProfile } from '../types/auth';
import { calculateWordsCount } from '../utils/hukmEngine';
import {
  recordChapterOpened,
  toggleChapterReadStatus,
  isChapterCompleted,
  saveChapterScrollPosition,
  getChapterScrollPosition,
} from '../utils/readingTracker';
import {
  saveReadingProgressToFirestore,
  fetchReaderAnnotationsFromFirestore,
  saveReaderAnnotationToFirestore,
  deleteReaderAnnotationFromFirestore,
} from '../firebase/firestoreService';
import {
  createReaderAnnotationId,
  getReaderAnnotationOffsets,
  getAllReaderAnnotations,
  getReaderAnnotationsForChapter,
  getReaderAnnotationStorageKey,
  mergeReaderAnnotations,
  removeReaderAnnotationLocal,
  saveAllReaderAnnotations,
  upsertReaderAnnotationLocal,
  MAX_READER_ANNOTATIONS_PER_CHAPTER,
} from '../utils/readerAnnotations';

interface BookReaderViewProps {
  book: BookProject;
  initialChapterId?: string;
  isOwner?: boolean;
  isBookmarked?: boolean;
  currentUser?: UserProfile | null;
  onBack: () => void;
  onOpenOverview?: () => void;
  onOpenWriter?: (bookId: string) => void;
  onChapterViewed?: (chapterId: string) => void;
  onToggleBookmark?: () => void;
  onShowToast?: (message: string) => void;
}

/**
 * Wait for web fonts and two paint frames before restoring a scroll checkpoint.
 * Adapted from the resource-readiness pattern in react-book-reader (MIT).
 */
const waitForReaderResources = async (): Promise<void> => {
  try {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch {
    // Font loading failure must not block reading-position restoration.
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
};

const renderSearchHighlights = (text: string, query: string): React.ReactNode => {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return text;

  const source = text.toLocaleLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let matchIndex = source.indexOf(needle, cursor);
  let key = 0;

  while (matchIndex !== -1) {
    if (matchIndex > cursor) parts.push(text.slice(cursor, matchIndex));
    parts.push(
      <mark key={key++} className="rounded bg-amber-300/70 text-[#1f2937] px-0.5">
        {text.slice(matchIndex, matchIndex + needle.length)}
      </mark>
    );
    cursor = matchIndex + needle.length;
    matchIndex = source.indexOf(needle, cursor);
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
};

const annotationMarkClasses: Record<ReaderAnnotationColor, string> = {
  gold: 'bg-amber-300/70 text-[#1f2937] decoration-amber-700',
  green: 'bg-emerald-300/65 text-[#123326] decoration-emerald-700',
  blue: 'bg-sky-300/70 text-[#102c46] decoration-sky-700',
  rose: 'bg-rose-300/70 text-[#451a2a] decoration-rose-700',
};

const renderAnnotatedParagraph = (
  text: string,
  paragraphIndex: number,
  annotations: ReaderAnnotation[],
  searchQuery: string
): React.ReactNode => {
  const anchors = annotations
    .filter((item) =>
      item.paragraphIndex === paragraphIndex &&
      item.startOffset >= 0 &&
      item.endOffset <= text.length &&
      item.endOffset > item.startOffset &&
      text.slice(item.startOffset, item.endOffset) === item.selectedText
    )
    .sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset);

  if (anchors.length === 0) return renderSearchHighlights(text, searchQuery);

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const annotation of anchors) {
    if (annotation.startOffset < cursor) continue;
    if (annotation.startOffset > cursor) {
      parts.push(renderSearchHighlights(text.slice(cursor, annotation.startOffset), searchQuery));
    }
    parts.push(
      <mark
        key={key++}
        className={`rounded px-0.5 decoration-2 underline-offset-2 ${annotationMarkClasses[annotation.color] || annotationMarkClasses.gold}`}
        title={annotation.note || 'مقتطف محفوظ'}
      >
        {text.slice(annotation.startOffset, annotation.endOffset)}
      </mark>
    );
    cursor = annotation.endOffset;
  }

  if (cursor < text.length) parts.push(renderSearchHighlights(text.slice(cursor), searchQuery));
  return <>{parts}</>;
};

export const BookReaderView: React.FC<BookReaderViewProps> = ({
  book,
  initialChapterId,
  isOwner = false,
  isBookmarked = false,
  currentUser = null,
  onBack,
  onOpenOverview,
  onOpenWriter,
  onChapterViewed,
  onToggleBookmark,
  onShowToast,
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    initialChapterId || book.chapters[0]?.id || ''
  );

  // Typography & Reader Preferences (stored in localStorage)
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('hukm_reader_fontsize'));
      if (Number.isFinite(saved) && saved >= 15 && saved <= 32) return saved;
    } catch {}
    return 20;
  });

  const [fontFamily, setFontFamily] = useState<'amiri' | 'cairo' | 'tajawal' | 'readex'>(() => {
    try {
      const saved = localStorage.getItem('hukm_reader_font');
      if (saved === 'amiri' || saved === 'cairo' || saved === 'tajawal' || saved === 'readex') return saved;
    } catch {}
    return 'amiri';
  });

  const [theme, setTheme] = useState<'dark' | 'sepia' | 'light' | 'black'>(() => {
    try {
      const saved = localStorage.getItem('hukm_reader_theme');
      if (saved === 'dark' || saved === 'sepia' || saved === 'light' || saved === 'black') return saved;
    } catch {}
    return 'dark';
  });

  const [contentWidth, setContentWidth] = useState<'normal' | 'wide' | 'compact'>(() => {
    try {
      const saved = localStorage.getItem('hukm_reader_width');
      if (saved === 'normal' || saved === 'wide' || saved === 'compact') return saved;
    } catch {}
    return 'normal';
  });
  const [lineHeight, setLineHeight] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('hukm_reader_lineheight'));
      if (Number.isFinite(saved) && saved >= 1.6 && saved <= 2.6) return saved;
    } catch {}
    return 2.1;
  });
  const [readingSpeedWpm, setReadingSpeedWpm] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('hukm_reader_speed'));
      if (Number.isFinite(saved) && saved >= 120 && saved <= 400) return saved;
    } catch {}
    return 220;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const [isChapterSearchOpen, setIsChapterSearchOpen] = useState(false);
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');
  const [activeSearchMatch, setActiveSearchMatch] = useState(0);
  const [speechStatus, setSpeechStatus] = useState<'idle' | 'speaking' | 'paused'>('idle');
  const [speechRate, setSpeechRate] = useState(1);
  const [activeSpeechParagraph, setActiveSpeechParagraph] = useState<number | null>(null);
  const speechSessionRef = useRef(0);
  const speechParagraphRef = useRef<(index: number) => void>(() => {});
  const [readerAnnotations, setReaderAnnotations] = useState<ReaderAnnotation[]>([]);
  const [isAnnotationsOpen, setIsAnnotationsOpen] = useState(false);
  const [isAnnotationEditorOpen, setIsAnnotationEditorOpen] = useState(false);
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(false);
  const [isSavingAnnotation, setIsSavingAnnotation] = useState(false);
  const isSavingAnnotationRef = useRef(false);
  const [selectedTextDraft, setSelectedTextDraft] = useState('');
  const [selectedParagraphIndex, setSelectedParagraphIndex] = useState<number | null>(null);
  const [selectedAnnotationChapterId, setSelectedAnnotationChapterId] = useState<string | null>(null);
  const [selectedAnnotationOwnerId, setSelectedAnnotationOwnerId] = useState<string | null>(null);
  const [selectedStartOffset, setSelectedStartOffset] = useState(0);
  const [selectedEndOffset, setSelectedEndOffset] = useState(0);
  const [annotationNoteDraft, setAnnotationNoteDraft] = useState('');
  const [annotationColor, setAnnotationColor] = useState<ReaderAnnotationColor>('gold');
  const annotationSyncPromisesRef = useRef<Map<string, Promise<boolean>>>(new Map());
  const syncAnnotationToCloud = useCallback((annotation: ReaderAnnotation): Promise<boolean> => {
    if (!annotation.userId) return Promise.resolve(false);
    const existingRequest = annotationSyncPromisesRef.current.get(annotation.id);
    if (existingRequest) return existingRequest;

    const request = saveReaderAnnotationToFirestore(annotation)
      .catch(() => false)
      .finally(() => {
        annotationSyncPromisesRef.current.delete(annotation.id);
      });
    annotationSyncPromisesRef.current.set(annotation.id, request);
    return request;
  }, []);




  // Sync index
  const currentChapterIndex = book.chapters.findIndex((c) => c.id === selectedChapterId);
  const currentChapter = book.chapters[currentChapterIndex] || book.chapters[0];
  const visibleReaderAnnotations = readerAnnotations.filter((annotation) =>
    annotation.bookId === book.id &&
    annotation.chapterId === currentChapter?.id &&
    (currentUser?.id ? annotation.userId === currentUser.id : !annotation.userId)
  );
  // Keep the open reader in sync with the profile notebook and other browser tabs.
  useEffect(() => {
    const refreshCurrentChapterNotes = () => {
      setReaderAnnotations(getReaderAnnotationsForChapter(book.id, currentChapter?.id || '', currentUser?.id));
    };
    const handleAnnotationUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string | null }>).detail;
      if ((detail?.userId || undefined) !== currentUser?.id) return;
      refreshCurrentChapterNotes();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === getReaderAnnotationStorageKey(currentUser?.id)) refreshCurrentChapterNotes();
    };
    window.addEventListener('hukm:reader-annotations-updated', handleAnnotationUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('hukm:reader-annotations-updated', handleAnnotationUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [book.id, currentChapter?.id, currentUser?.id]);

  // Load chapter annotations from the current account's private local/cloud partitions.
  useEffect(() => {
    if (!currentChapter?.id) {
      setReaderAnnotations([]);
      return;
    }

    let cancelled = false;
    setIsAnnotationEditorOpen(false);
    setIsAnnotationsOpen(false);
    setSelectedTextDraft('');
    setSelectedParagraphIndex(null);
    setSelectedAnnotationChapterId(null);
    setSelectedAnnotationOwnerId(null);
    const userId = currentUser?.id;
    const localForChapter = getReaderAnnotationsForChapter(book.id, currentChapter.id, userId);
    setReaderAnnotations(localForChapter);

    if (!userId) {
      setIsLoadingAnnotations(false);
      return () => { cancelled = true; };
    }

    setIsLoadingAnnotations(true);
    fetchReaderAnnotationsFromFirestore(userId, book.id, currentChapter.id).then(async (cloudRecords) => {
      if (cancelled || !cloudRecords) return;

      const latestLocalAll = getAllReaderAnnotations(userId);
      const latestLocalChapter = latestLocalAll.filter(
        (item) => item.bookId === book.id && item.chapterId === currentChapter.id
      );
      const mergedChapter = mergeReaderAnnotations(latestLocalChapter, cloudRecords);
      const otherChapters = latestLocalAll.filter(
        (item) => item.bookId !== book.id || item.chapterId !== currentChapter.id
      );
      saveAllReaderAnnotations([...otherChapters, ...mergedChapter], userId);
      if (!cancelled) setReaderAnnotations(mergedChapter);

      for (const pending of mergedChapter.filter((item) => item.syncStatus === 'pending')) {
        const saved = await syncAnnotationToCloud(pending);
        if (!saved || cancelled) continue;
        const synced = { ...pending, syncStatus: 'synced' as const };
        upsertReaderAnnotationLocal(synced, userId);
        if (!cancelled) {
          setReaderAnnotations((current) => current.map((item) => item.id === synced.id ? synced : item));
        }
      }
    }).catch(() => {
      // Local notes remain available if the cloud is unreachable.
    }).finally(() => {
      if (!cancelled) setIsLoadingAnnotations(false);
    });

    return () => { cancelled = true; };
  }, [book.id, currentChapter?.id, currentUser?.id, syncAnnotationToCloud]);



  const prevChapter = currentChapterIndex > 0 ? book.chapters[currentChapterIndex - 1] : null;
  const nextChapter =
    currentChapterIndex >= 0 && currentChapterIndex < book.chapters.length - 1
      ? book.chapters[currentChapterIndex + 1]
      : null;

  const searchMatchIndexes = React.useMemo(() => {
    const query = chapterSearchQuery.trim().toLocaleLowerCase();
    if (!query || !currentChapter) return [];
    return currentChapter.content.reduce<number[]>((matches, paragraph, index) => {
      if (paragraph.toLocaleLowerCase().includes(query)) matches.push(index);
      return matches;
    }, []);
  }, [chapterSearchQuery, currentChapter?.id, currentChapter?.content]);

  useEffect(() => {
    setActiveSearchMatch(0);
  }, [chapterSearchQuery, currentChapter?.id]);

  const jumpToSearchMatch = (direction: -1 | 1) => {
    if (searchMatchIndexes.length === 0) return;
    const nextIndex = (activeSearchMatch + direction + searchMatchIndexes.length) % searchMatchIndexes.length;
    setActiveSearchMatch(nextIndex);
    const paragraphIndex = searchMatchIndexes[nextIndex];
    document.getElementById(`reader-paragraph-${paragraphIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };


  // Progress state is local-first. Cloud writes are rate-limited to avoid a write on every scroll.
  const scrollDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredChapterRef = useRef<Record<string, boolean>>({});
  const trackedChapterViewsRef = useRef<Record<string, boolean>>({});
  const scrollProgressRef = useRef(0);
  const lastCloudSyncRef = useRef<Record<string, { percent: number; timestamp: number }>>({});
  const cloudSyncInFlightRef = useRef<Set<string>>(new Set());
  const onChapterViewedRef = useRef(onChapterViewed);
  useEffect(() => { onChapterViewedRef.current = onChapterViewed; }, [onChapterViewed]);

  const persistProgress = useCallback((progressPercent: number, forceCloudSync = false) => {
    if (!currentChapter?.id) return;
    const clamped = Math.min(100, Math.max(0, progressPercent));
    scrollProgressRef.current = clamped;

    // Local storage remains the immediate source of truth while reading.
    saveChapterScrollPosition(book.id, currentChapter.id, clamped, currentUser?.id);

    if (!currentUser?.id) return;

    const syncKey = `${currentUser.id}:${book.id}:${currentChapter.id}`;
    const now = Date.now();
    const lastSync = lastCloudSyncRef.current[syncKey];
    const shouldSync = forceCloudSync || !lastSync ||
      Math.abs(clamped - lastSync.percent) >= 4 ||
      now - lastSync.timestamp >= 15000;

    if (!shouldSync || cloudSyncInFlightRef.current.has(syncKey)) return;

    cloudSyncInFlightRef.current.add(syncKey);
    saveReadingProgressToFirestore({
      id: '',
      userId: currentUser.id,
      bookId: book.id,
      chapterId: currentChapter.id,
      chapterIndex: currentChapterIndex >= 0 ? currentChapterIndex : 0,
      scrollPercent: clamped,
      lastReadAt: new Date().toISOString(),
      completed: isChapterCompleted(book.id, currentChapter.id, currentUser.id),
    }).then((saved) => {
      if (saved) lastCloudSyncRef.current[syncKey] = { percent: clamped, timestamp: Date.now() };
    }).catch(() => {
      // Keep the previous successful checkpoint so a later scroll or chapter exit retries.
    }).finally(() => {
      cloudSyncInFlightRef.current.delete(syncKey);
    });
  }, [book.id, currentChapter?.id, currentChapterIndex, currentUser?.id]);

  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    setIsCompleted(currentChapter
      ? isChapterCompleted(book.id, currentChapter.id, currentUser?.id)
      : false);
  }, [book.id, currentChapter?.id, currentUser?.id]);

  // Debounced local checkpoints, with cloud sync throttled inside persistProgress.
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalScroll > 0 ? (window.scrollY / totalScroll) * 100 : 0;
      const clamped = Math.min(100, Math.max(0, progress));
      scrollProgressRef.current = clamped;
      setScrollProgress(clamped);

      if (scrollDebounceTimerRef.current) clearTimeout(scrollDebounceTimerRef.current);
      scrollDebounceTimerRef.current = setTimeout(() => {
        persistProgress(clamped);
      }, 1200);
    };

    const flushProgress = () => persistProgress(scrollProgressRef.current, true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushProgress();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pagehide', flushProgress);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pagehide', flushProgress);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (scrollDebounceTimerRef.current) {
        clearTimeout(scrollDebounceTimerRef.current);
        scrollDebounceTimerRef.current = null;
      }
      if (scrollProgressRef.current > 0) persistProgress(scrollProgressRef.current, true);
    };
  }, [persistProgress]);

  // Save preferences
  useEffect(() => {
    try {
      localStorage.setItem('hukm_reader_fontsize', fontSize.toString());
      localStorage.setItem('hukm_reader_font', fontFamily);
      localStorage.setItem('hukm_reader_theme', theme);
      localStorage.setItem('hukm_reader_lineheight', String(lineHeight));
      localStorage.setItem('hukm_reader_speed', String(readingSpeedWpm));
      localStorage.setItem('hukm_reader_width', contentWidth);
    } catch {}
  }, [fontSize, fontFamily, theme, lineHeight, readingSpeedWpm, contentWidth]);

  // Track chapter view and restore its last position without changing completion state.
  useEffect(() => {
    if (!currentChapter?.id) return;

    const chapterSessionKey = `${book.id}:${currentUser?.id || 'guest'}:${currentChapter.id}`;
    if (!trackedChapterViewsRef.current[chapterSessionKey]) {
      trackedChapterViewsRef.current[chapterSessionKey] = true;
      onChapterViewedRef.current?.(currentChapter.id);
    }
    recordChapterOpened(book.id, currentChapter.id, currentUser?.id);
    const savedPosition = getChapterScrollPosition(book.id, currentChapter.id, currentUser?.id);
    scrollProgressRef.current = savedPosition;
    setScrollProgress(savedPosition);
    persistProgress(savedPosition, true);

    if (!hasRestoredChapterRef.current[chapterSessionKey]) {
      hasRestoredChapterRef.current[chapterSessionKey] = true;
      if (savedPosition > 2) {
        let cancelled = false;
        void waitForReaderResources().then(() => {
          if (cancelled) return;
          const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
          if (totalScroll > 50) {
            const targetY = (totalScroll * savedPosition) / 100;
            window.scrollTo({ top: targetY, behavior: 'smooth' });
            setShowRestoredNotice(true);
            setTimeout(() => setShowRestoredNotice(false), 3000);
          }
        });
        return () => { cancelled = true; };
      }
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [currentChapter?.id, book.id, currentUser?.id, persistProgress]);

  // Keyboard navigation: Left = Prev, Right = Next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsChapterSearchOpen(false);
        setIsSettingsOpen(false);
        setIsAnnotationEditorOpen(false);
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsChapterSearchOpen(true);
        return;
      }

      if (e.key === 'ArrowLeft' && prevChapter) {
        setSelectedChapterId(prevChapter.id);
      } else if (e.key === 'ArrowRight' && nextChapter) {
        setSelectedChapterId(nextChapter.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevChapter, nextChapter]);

  // Handle chapter change
  const navigateToChapter = (chapterId: string) => {
    // Flush current chapter progress before switching
    if (currentChapter?.id && scrollProgressRef.current > 0) {
      persistProgress(scrollProgressRef.current, true);
    }
    scrollProgressRef.current = 0;
    setScrollProgress(0);
    setSelectedChapterId(chapterId);
  };

  const handleToggleRead = async () => {
    if (!currentChapter) return;
    const updated = toggleChapterReadStatus(book.id, currentChapter.id, currentUser?.id);
    const completed = updated.completedChapterIds.includes(currentChapter.id);
    setIsCompleted(completed);

    if (currentUser?.id) {
      const saved = await saveReadingProgressToFirestore({
        id: '',
        userId: currentUser.id,
        bookId: book.id,
        chapterId: currentChapter.id,
        chapterIndex: Math.max(0, currentChapterIndex),
        scrollPercent: getChapterScrollPosition(book.id, currentChapter.id, currentUser.id),
        lastReadAt: new Date().toISOString(),
        completed,
      });
      onShowToast?.(saved
        ? 'تم تحديث حالة القراءة ومزامنتها مع حسابك ✓'
        : 'تم تحديث الحالة على هذا الجهاز، لكن تعذرت مزامنتها سحابياً.');
      return;
    }
    onShowToast?.('تم تحديث حالة القراءة على هذا الجهاز ✓');
  };

  const speakParagraph = useCallback((paragraphIndex: number) => {
    if (!currentChapter || typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      onShowToast?.('القراءة الصوتية غير مدعومة في هذا المتصفح.');
      setSpeechStatus('idle');
      return;
    }

    const paragraph = currentChapter.content[paragraphIndex];
    if (!paragraph) {
      setSpeechStatus('idle');
      setActiveSpeechParagraph(null);
      return;
    }

    const sessionId = speechSessionRef.current;
    const utterance = new SpeechSynthesisUtterance(paragraph);
    utterance.lang = 'ar';
    utterance.rate = speechRate;
    const arabicVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('ar'));
    if (arabicVoice) utterance.voice = arabicVoice;

    utterance.onstart = () => {
      if (speechSessionRef.current === sessionId) {
        setSpeechStatus('speaking');
        setActiveSpeechParagraph(paragraphIndex);
        document.getElementById(`reader-paragraph-${paragraphIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    utterance.onend = () => {
      if (speechSessionRef.current !== sessionId) return;
      if (paragraphIndex + 1 < currentChapter.content.length) {
        speechParagraphRef.current(paragraphIndex + 1);
      } else {
        setSpeechStatus('idle');
        setActiveSpeechParagraph(null);
      }
    };
    utterance.onerror = () => {
      if (speechSessionRef.current !== sessionId) return;
      setSpeechStatus('idle');
      setActiveSpeechParagraph(null);
      onShowToast?.('توقفت القراءة الصوتية بسبب خطأ من محرك النطق في الجهاز.');
    };

    window.speechSynthesis.speak(utterance);
  }, [currentChapter?.id, currentChapter?.content, speechRate, onShowToast]);

  useEffect(() => {
    speechParagraphRef.current = speakParagraph;
  }, [speakParagraph]);

  const startSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onShowToast?.('متصفحك لا يدعم القراءة الصوتية.');
      return;
    }
    if (speechStatus === 'paused') {
      window.speechSynthesis.resume();
      setSpeechStatus('speaking');
      return;
    }
    speechSessionRef.current += 1;
    window.speechSynthesis.cancel();
    setActiveSpeechParagraph(0);
    setSpeechStatus('speaking');
    speechParagraphRef.current(0);
  };

  const pauseSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.pause();
    setSpeechStatus('paused');
  };

  const stopSpeech = () => {
    speechSessionRef.current += 1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeechStatus('idle');
    setActiveSpeechParagraph(null);
  };

  useEffect(() => {
    setSpeechStatus('idle');
    setActiveSpeechParagraph(null);
    return () => {
      speechSessionRef.current += 1;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [currentChapter?.id]);

  // Retry local-first notes when the browser regains connectivity.
  useEffect(() => {
    if (!currentUser?.id || !currentChapter?.id) return;
    let cancelled = false;

    const retryPendingAnnotations = async () => {
      const pending = getReaderAnnotationsForChapter(book.id, currentChapter.id, currentUser.id)
        .filter((item) => item.syncStatus === 'pending');
      for (const annotation of pending) {
        const saved = await syncAnnotationToCloud(annotation);
        if (!saved || cancelled) continue;
        const synced = { ...annotation, syncStatus: 'synced' as const };
        upsertReaderAnnotationLocal(synced, currentUser.id);
        if (!cancelled) {
          setReaderAnnotations((current) => current.map((item) => item.id === synced.id ? synced : item));
        }
      }
    };

    window.addEventListener('online', retryPendingAnnotations);
    return () => {
      cancelled = true;
      window.removeEventListener('online', retryPendingAnnotations);
    };
  }, [book.id, currentChapter?.id, currentUser?.id, syncAnnotationToCloud]);

  const handleCaptureSelection = () => {
    const selection = typeof window !== 'undefined' ? window.getSelection() : null;
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      onShowToast?.('حدد مقتطفاً من نص الفصل أولاً.');
      return;
    }

    const range = selection.getRangeAt(0);
    const startNode = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer as Element
      : range.startContainer.parentElement;
    const endNode = range.endContainer.nodeType === Node.ELEMENT_NODE
      ? range.endContainer as Element
      : range.endContainer.parentElement;
    const paragraph = startNode?.closest('p[data-paragraph-index]');

    if (!paragraph || !endNode || !paragraph.contains(endNode)) {
      onShowToast?.('حدد النص داخل فقرة واحدة فقط حتى نحفظ موضعه بدقة.');
      return;
    }

    const rawText = range.toString();
    const prefixRange = range.cloneRange();
    prefixRange.selectNodeContents(paragraph);
    prefixRange.setEnd(range.startContainer, range.startOffset);
    const anchor = getReaderAnnotationOffsets(
      paragraph.textContent || '',
      prefixRange.toString(),
      rawText
    );
    const paragraphIndex = Number(paragraph.getAttribute('data-paragraph-index'));

    if (!anchor) {
      onShowToast?.(rawText.trim().length > 2000
        ? 'الحد الأقصى للمقتطف الواحد 2000 حرف.'
        : 'تعذر تثبيت موضع المقتطف بدقة. حاول تحديده مرة أخرى.');
      return;
    }
    if (!Number.isInteger(paragraphIndex) || paragraphIndex < 0) {
      onShowToast?.('تعذر تحديد موضع الفقرة. حاول مرة أخرى.');
      return;
    }
    const { selectedText, startOffset, endOffset } = anchor;

    setSelectedTextDraft(selectedText);
    setSelectedParagraphIndex(paragraphIndex);
    setSelectedAnnotationChapterId(currentChapter?.id || null);
    setSelectedAnnotationOwnerId(currentUser?.id || null);
    setSelectedStartOffset(startOffset);
    setSelectedEndOffset(endOffset);
    setAnnotationNoteDraft('');
    setAnnotationColor('gold');
    setIsAnnotationEditorOpen(true);
  };

  const handleSaveAnnotation = async () => {
    if (
      isSavingAnnotationRef.current ||
      !currentChapter ||
      selectedAnnotationChapterId !== currentChapter.id ||
      selectedAnnotationOwnerId !== (currentUser?.id || null) ||
      selectedParagraphIndex === null ||
      !selectedTextDraft
    ) return;

    isSavingAnnotationRef.current = true;
    setIsSavingAnnotation(true);
    try {
      if (visibleReaderAnnotations.length >= MAX_READER_ANNOTATIONS_PER_CHAPTER) {
        onShowToast?.(`وصلت إلى الحد الأقصى وهو ${MAX_READER_ANNOTATIONS_PER_CHAPTER} مقتطفاً لهذا الفصل.`);
        return;
      }

      const now = new Date().toISOString();
      const annotation: ReaderAnnotation = {
        id: createReaderAnnotationId(),
        userId: currentUser?.id,
        bookId: book.id,
        chapterId: currentChapter.id,
        paragraphIndex: selectedParagraphIndex,
        startOffset: selectedStartOffset,
        endOffset: selectedEndOffset,
        selectedText: selectedTextDraft,
        note: annotationNoteDraft.trim(),
        color: annotationColor,
        createdAt: now,
        updatedAt: now,
        syncStatus: currentUser?.id ? 'pending' : 'local',
      };

      const allLocal = getAllReaderAnnotations(currentUser?.id);
      const nextLocal = [...allLocal, annotation];
      if (!saveAllReaderAnnotations(nextLocal, currentUser?.id)) {
        onShowToast?.('تعذر حفظ المقتطف على هذا الجهاز. قد تكون مساحة التخزين ممتلئة.');
        return;
      }

      setReaderAnnotations((current) => [...current, annotation]);
      setIsAnnotationEditorOpen(false);
      window.getSelection()?.removeAllRanges();

      if (currentUser?.id) {
        const saved = await syncAnnotationToCloud(annotation);
        if (saved) {
          const synced = { ...annotation, syncStatus: 'synced' as const };
          upsertReaderAnnotationLocal(synced, currentUser.id);
          setReaderAnnotations((current) => current.map((item) => item.id === synced.id ? synced : item));
          onShowToast?.('تم حفظ المقتطف ومزامنته مع حسابك ✓');
        } else {
          onShowToast?.('تم حفظ المقتطف على هذا الجهاز، وستتم محاولة مزامنته عند عودة الاتصال.');
        }
        return;
      }

      onShowToast?.('تم حفظ المقتطف على هذا الجهاز فقط.');
    } catch {
      onShowToast?.('تعذر إكمال مزامنة المقتطف. إن كان قد حُفظ محلياً فسيظل في دفتر هذا الجهاز.');
    } finally {
      isSavingAnnotationRef.current = false;
      setIsSavingAnnotation(false);
    }
  };

  const handleDeleteAnnotation = async (annotation: ReaderAnnotation) => {
    if (currentUser?.id) {
      // Wait for any pending create/update to finish, then delete its cloud result to avoid resurrection.
      const inFlightSync = annotationSyncPromisesRef.current.get(annotation.id);
      if (inFlightSync) await inFlightSync;
      // A pending local edit can still have an older cloud document; delete both copies.
      const deleted = await deleteReaderAnnotationFromFirestore(currentUser.id, annotation);
      if (!deleted) {
        onShowToast?.('تعذر حذف المقتطف من السحابة؛ لم نحذفه من جهازك.');
        return;
      }
    }

    const next = removeReaderAnnotationLocal(annotation.id, currentUser?.id);
    setReaderAnnotations(next.filter((item) => item.bookId === book.id && item.chapterId === currentChapter?.id));
    onShowToast?.('تم حذف المقتطف.');
  };

  const handleShare = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API is unavailable in this browser context.');
      }
      await navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      onShowToast?.('تم نسخ رابط القراءة بنجاح.');
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {
      setCopiedShare(false);
      onShowToast?.('تعذر نسخ الرابط تلقائيًا. يمكنك نسخ عنوان الصفحة من شريط المتصفح.');
    }
  };

  // Theme styling definitions
  const themeClasses = {
    dark: {
      bg: 'bg-[#070d1e]',
      text: 'text-[#ece7de]',
      navBg: 'bg-[#0a1226]/90 border-[#c59b27]/20',
      cardBg: 'bg-[#0b1329] border-white/10',
      pillBg: 'bg-white/5 text-[#94a3b8]',
      accent: 'text-[#f0cb69]',
    },
    sepia: {
      bg: 'bg-[#f7efe1]',
      text: 'text-[#3c3124]',
      navBg: 'bg-[#eedfc8]/95 border-[#c8b293]',
      cardBg: 'bg-[#f0e3ce] border-[#dfcdb5]',
      pillBg: 'bg-[#e4d3bc] text-[#5c4c38]',
      accent: 'text-[#8b5e28]',
    },
    light: {
      bg: 'bg-[#fafafa]',
      text: 'text-[#1e293b]',
      navBg: 'bg-white/95 border-slate-200 shadow-sm',
      cardBg: 'bg-white border-slate-200',
      pillBg: 'bg-slate-100 text-slate-600',
      accent: 'text-amber-700',
    },
    black: {
      bg: 'bg-[#000000]',
      text: 'text-[#e5e5e5]',
      navBg: 'bg-[#0a0a0a]/95 border-neutral-800',
      cardBg: 'bg-[#111111] border-neutral-800',
      pillBg: 'bg-neutral-900 text-neutral-400',
      accent: 'text-amber-400',
    },
  }[theme];

  const fontClasses = {
    amiri: 'font-amiri',
    cairo: 'font-cairo',
    tajawal: 'font-tajawal',
    readex: 'font-readex',
  }[fontFamily];

  const widthClasses = {
    compact: 'max-w-2xl',
    normal: 'max-w-4xl',
    wide: 'max-w-6xl',
  }[contentWidth];

  const wordsCount = currentChapter ? calculateWordsCount(currentChapter.content) : 0;
  const readTime = Math.ceil(wordsCount / readingSpeedWpm);
  const estimatedRemainingMinutes = Math.ceil((wordsCount * (1 - Math.min(100, Math.max(0, scrollProgress)) / 100)) / readingSpeedWpm);

  return (
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} transition-colors duration-300 pb-28`} dir="rtl">
      {/* Top Fixed Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-black/20">
        <div
          className="h-full bg-gradient-to-r from-[#d4af37] to-[#f0cb69] transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Restored Position Floating Notice */}
      {showRestoredNotice && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 rounded-full bg-emerald-600/95 text-white px-4 py-1.5 text-xs font-bold shadow-xl backdrop-blur-md flex items-center gap-1.5 transition-all border border-emerald-400/40">
          <Check className="h-3.5 w-3.5 text-white" />
          <span>تمت استعادة موضع القراءة السابق بنجاح ✓</span>
        </div>
      )}

      {/* Reader Sticky Header */}
      <header
        className={`sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors px-4 sm:px-6 py-3 ${themeClasses.navBg}`}
      >
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
          {/* Back & Novel Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenOverview || onBack}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors hover:opacity-80"
              title="العودة لصفحة تفاصيل الكتاب"
            >
              <ArrowRight className="h-4 w-4" />
              <span className="hidden sm:inline">تفاصيل الكتاب</span>
            </button>

            <div className="border-r border-current/20 pr-3">
              <h2 className="text-xs sm:text-sm font-black font-cairo truncate max-w-[180px] sm:max-w-xs">
                {book.title}
              </h2>
              <span className="text-[11px] opacity-75 truncate block">
                {currentChapter?.title || 'الفصل'}
              </span>
            </div>
          </div>

          {/* Center: Fast Chapters Selector Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedChapterId}
              onChange={(e) => navigateToChapter(e.target.value)}
              className="rounded-xl border border-current/20 bg-transparent px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer max-w-[140px] sm:max-w-[220px] truncate"
              title="الانتقال السريع لأي فصل"
            >
              {book.chapters.map((ch) => (
                <option
                  key={ch.id}
                  value={ch.id}
                  className="bg-[#0b1329] text-white py-1"
                >
                  الفصل {ch.chapterNumber}: {ch.title}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Settings & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onToggleBookmark && (
              <button
                onClick={onToggleBookmark}
                className="p-2 rounded-xl transition-colors hover:bg-black/10"
                title={isBookmarked ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="h-4 w-4 text-[#d4af37]" />
                ) : (
                  <Bookmark className="h-4 w-4 opacity-75" />
                )}
              </button>
            )}

            <button
              onClick={() => setIsChapterSearchOpen((open) => !open)}
              className={`p-2 rounded-xl transition-colors hover:bg-black/10 ${isChapterSearchOpen ? 'bg-[#c59b27]/20 text-[#d4af37]' : ''}`}
              title="البحث داخل الفصل (Ctrl+F)"
              aria-label="البحث داخل الفصل"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCaptureSelection}
              className="p-2 rounded-xl transition-colors hover:bg-black/10"
              title="احفظ النص المحدد كمقتطف أو ملاحظة"
              aria-label="حفظ النص المحدد"
            >
              <Highlighter className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsAnnotationsOpen((open) => !open)}
              className={`relative p-2 rounded-xl transition-colors hover:bg-black/10 ${isAnnotationsOpen ? 'bg-[#c59b27]/20 text-[#d4af37]' : ''}`}
              title="مقتطفاتي وملاحظاتي"
              aria-label="عرض المقتطفات والملاحظات"
            >
              <StickyNote className="h-4 w-4" />
              {visibleReaderAnnotations.length > 0 && (
                <span className="absolute -top-1 -left-1 min-w-4 h-4 rounded-full bg-[#c59b27] px-1 text-[9px] font-black text-[#070d1e] flex items-center justify-center">
                  {visibleReaderAnnotations.length}
                </span>
              )}
            </button>

            <button
              onClick={handleShare}
              className="p-2 rounded-xl transition-colors hover:bg-black/10"
              title="مشاركة رابط الفصل"
            >
              {copiedShare ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4 opacity-75" />}
            </button>

            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold border border-current/20 transition-all ${
                isSettingsOpen ? 'bg-[#c59b27] text-[#070d1e] border-transparent' : 'hover:bg-black/10'
              }`}
              title="تخصيص الخط والخلفية للقراءة"
            >
              <Type className="h-3.5 w-3.5" />
              <span className="hidden md:inline">الخط والمظهر</span>
            </button>

            {isOwner && onOpenWriter && (
              <button
                onClick={() => onOpenWriter(book.id)}
                className="rounded-xl bg-[#c59b27]/20 border border-[#c59b27]/40 px-2.5 py-1.5 text-xs font-bold text-[#f0cb69] hover:bg-[#c59b27]/30 transition-colors"
                title="تعديل هذا الفصل في الاستوديو"
              >
                تعديل ✏️
              </button>
            )}
          </div>
        </div>

        {isChapterSearchOpen && (
          <div className="mx-auto max-w-4xl mt-3 pt-3 border-t border-current/15 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
              <input
                autoFocus
                value={chapterSearchQuery}
                onChange={(e) => setChapterSearchQuery(e.target.value)}
                placeholder="ابحث عن كلمة أو عبارة داخل هذا الفصل..."
                className="w-full rounded-xl border border-current/20 bg-black/5 py-2.5 pr-9 pl-9 text-xs outline-none focus:border-[#c59b27]"
                aria-label="البحث داخل الفصل الحالي"
              />
              {chapterSearchQuery && (
                <button type="button" onClick={() => setChapterSearchQuery('')} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-1 hover:bg-black/10" aria-label="مسح البحث">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-[88px] text-center opacity-75">
                {searchMatchIndexes.length ? `${activeSearchMatch + 1} من ${searchMatchIndexes.length} فقرة` : 'لا توجد نتائج'}
              </span>
              <button type="button" onClick={() => jumpToSearchMatch(-1)} disabled={!searchMatchIndexes.length} className="rounded-lg border border-current/20 p-2 disabled:opacity-30" aria-label="النتيجة السابقة">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => jumpToSearchMatch(1)} disabled={!searchMatchIndexes.length} className="rounded-lg border border-current/20 p-2 disabled:opacity-30" aria-label="النتيجة التالية">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Reader Customization Settings Drawer */}
        {isSettingsOpen && (
          <div className="mx-auto max-w-5xl mt-3 pt-3 border-t border-current/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* 1. Theme Mode */}
            <div className="space-y-1.5">
              <span className="font-bold opacity-75 block">نمط الإضاءة والخلفية:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border ${
                    theme === 'dark' ? 'bg-[#c59b27] text-[#070d1e] border-[#c59b27]' : 'border-current/20'
                  }`}
                >
                  <Moon className="h-3 w-3" />
                  <span>داكن</span>
                </button>
                <button
                  onClick={() => setTheme('sepia')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border ${
                    theme === 'sepia' ? 'bg-[#8b5e28] text-white border-[#8b5e28]' : 'border-current/20'
                  }`}
                >
                  <Coffee className="h-3 w-3" />
                  <span>هادئ (Sepia)</span>
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border ${
                    theme === 'light' ? 'bg-slate-800 text-white border-slate-800' : 'border-current/20'
                  }`}
                >
                  <Sun className="h-3 w-3" />
                  <span>فاتح</span>
                </button>
                <button
                  onClick={() => setTheme('black')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border ${
                    theme === 'black' ? 'bg-white text-black border-white' : 'border-current/20'
                  }`}
                >
                  <span>AMOLED</span>
                </button>
              </div>
            </div>

            {/* 2. Font Size (A- / A+) */}
            <div className="space-y-1.5">
              <span className="font-bold opacity-75 block">حجم الخط ({fontSize}px):</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFontSize((s) => Math.max(15, s - 1))}
                  className="rounded-lg border border-current/20 px-3 py-1 font-bold hover:bg-black/10"
                >
                  A -
                </button>
                <input
                  type="range"
                  min={15}
                  max={32}
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full cursor-pointer accent-[#c59b27]"
                />
                <button
                  onClick={() => setFontSize((s) => Math.min(32, s + 1))}
                  className="rounded-lg border border-current/20 px-3 py-1 font-bold hover:bg-black/10"
                >
                  A +
                </button>
              </div>
            </div>

            {/* 3. Font Family */}
            <div className="space-y-1.5">
              <span className="font-bold opacity-75 block">نوع الخط العربي:</span>
              <div className="flex items-center gap-1">
                {(['amiri', 'cairo', 'tajawal', 'readex'] as const).map((font) => (
                  <button
                    key={font}
                    onClick={() => setFontFamily(font)}
                    className={`rounded-lg px-2 py-1 text-xs font-bold border capitalize ${
                      fontFamily === font ? 'bg-[#c59b27] text-[#070d1e] border-[#c59b27]' : 'border-current/20'
                    }`}
                  >
                    {font === 'amiri' ? 'أميري' : font === 'cairo' ? 'كايرو' : font === 'tajawal' ? 'تجوال' : 'ريدكس'}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Reading column width */}
            <div className="space-y-1.5">
              <span className="font-bold opacity-75 block">عرض صفحة القراءة:</span>
              <div className="flex items-center gap-1.5">
                {(['compact', 'normal', 'wide'] as const).map((width) => (
                  <button
                    key={width}
                    onClick={() => setContentWidth(width)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold border ${contentWidth === width ? 'bg-[#c59b27] text-[#070d1e] border-[#c59b27]' : 'border-current/20'}`}
                  >
                    {width === 'compact' ? 'ضيّق' : width === 'normal' ? 'متوسط' : 'واسع'}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Paragraph line height */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold opacity-75">تباعد السطور</span>
                <span className="font-mono opacity-70">{lineHeight.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={1.6}
                max={2.6}
                step={0.1}
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
                className="w-full cursor-pointer accent-[#c59b27]"
                aria-label="تباعد السطور"
              />
            </div>

            {/* 6. Personal reading-speed estimate */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold opacity-75">سرعة القراءة التقديرية</span>
                <span className="font-mono opacity-70">{readingSpeedWpm} كلمة/د</span>
              </div>
              <input
                type="range"
                min={120}
                max={400}
                step={10}
                value={readingSpeedWpm}
                onChange={(e) => setReadingSpeedWpm(Number(e.target.value))}
                className="w-full cursor-pointer accent-[#c59b27]"
                aria-label="سرعة القراءة بالكلمات في الدقيقة"
              />
            </div>
          </div>
        )}
      </header>

      {/* Main Chapter Reading Area */}
      <main className={`mx-auto ${widthClasses} px-5 sm:px-8 py-10 space-y-8`}>
        {/* Chapter Header Card */}
        <div className={`rounded-2xl p-6 sm:p-8 border ${themeClasses.cardBg} text-center space-y-3`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-current/20 px-3 py-1 text-xs font-bold">
            <span>{book.title}</span>
            <span>•</span>
            <span className={themeClasses.accent}>الفصل {currentChapter?.chapterNumber}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-cairo leading-snug">
            {currentChapter?.title}
          </h1>

          {currentChapter?.subtitle && (
            <p className="text-sm opacity-80 font-medium">
              {currentChapter.subtitle}
            </p>
          )}

          <div className="flex items-center justify-center gap-4 text-xs opacity-75 pt-2 border-t border-current/10">
            <span>{wordsCount} كلمة</span>
            <span>•</span>
            <span>~{readTime} دقائق قراءة إجمالاً</span>
            <span>•</span>
            <span>باقي ~{estimatedRemainingMinutes} دقيقة</span>
            <span>•</span>
            <span>المؤلف: {book.author || 'غير منسوب'}</span>
          </div>
          {book.rights && (
            <p className="border-t border-current/10 pt-3 text-[10px] leading-6 opacity-70">
              النص من <a href={book.rights.sourceUrl} target="_blank" rel="noreferrer" className="underline">مؤسسة هنداوي</a>، مرخص وفق <a href={book.rights.licenseUrl} target="_blank" rel="noreferrer" className="underline">{book.rights.license}</a>. <a href={book.rights.datasetUrl} target="_blank" rel="noreferrer" className="underline">بيانات المصدر والترخيص</a>.
            </p>
          )}
        </div>

        {/* Native, no-API Arabic text-to-speech controls */}
        <section className={`rounded-2xl border p-4 sm:p-5 ${themeClasses.cardBg} flex flex-col sm:flex-row sm:items-center justify-between gap-4`} aria-label="القراءة الصوتية">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-[#c59b27]/15 p-2.5 text-[#d4af37]"><Volume2 className="h-5 w-5" /></span>
            <div>
              <h3 className="text-sm font-bold">استمع إلى الفصل</h3>
              <p className="mt-1 text-[11px] opacity-65 leading-relaxed">يستخدم أصوات النطق المثبتة على جهازك؛ لا يحتاج إلى اشتراك أو مفتاح API. جودة الصوت وتوفر العربية يعتمدان على النظام والمتصفح.</p>
              {activeSpeechParagraph !== null && (
                <p className="mt-1 text-[10px] text-[#d4af37]">الفقرة {activeSpeechParagraph + 1} من {currentChapter?.content.length || 0}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={startSpeech} disabled={!currentChapter?.content.length} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-3.5 py-2 text-xs font-bold text-[#070d1e] disabled:opacity-40">
              {speechStatus === 'paused' ? <Play className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              {speechStatus === 'paused' ? 'استئناف' : speechStatus === 'speaking' ? 'إعادة من البداية' : 'تشغيل'}
            </button>
            <button type="button" onClick={pauseSpeech} disabled={speechStatus !== 'speaking'} className="rounded-xl border border-current/20 p-2 disabled:opacity-30" aria-label="إيقاف مؤقت">
              <Pause className="h-4 w-4" />
            </button>
            <button type="button" onClick={stopSpeech} disabled={speechStatus === 'idle'} className="rounded-xl border border-current/20 p-2 disabled:opacity-30" aria-label="إيقاف القراءة الصوتية">
              <Square className="h-4 w-4" />
            </button>
            <label className="flex items-center gap-2 rounded-xl border border-current/15 px-2.5 py-1.5 text-[11px]">
              <span>السرعة</span>
              <select value={speechRate} onChange={(e) => setSpeechRate(Number(e.target.value))} className="bg-transparent font-bold outline-none">
                <option value={0.75}>0.75×</option>
                <option value={1}>1×</option>
                <option value={1.25}>1.25×</option>
                <option value={1.5}>1.5×</option>
              </select>
            </label>
          </div>
        </section>

        {/* Chapter Body Content */}
        <article
          className={`space-y-6 ${fontClasses} leading-loose`}
          style={{ fontSize: `${fontSize}px`, lineHeight }}
        >
          {currentChapter ? (
            currentChapter.content.map((paragraph, idx) => (
              <p
                id={`reader-paragraph-${idx}`}
                data-paragraph-index={idx}
                key={idx}
                className={`text-justify tracking-wide rounded-lg transition-colors ${activeSpeechParagraph === idx ? 'bg-[#c59b27]/10 ring-1 ring-[#c59b27]/30 px-3 py-2' : ''}`}
              >
                {renderAnnotatedParagraph(paragraph, idx, visibleReaderAnnotations, chapterSearchQuery)}
              </p>
            ))
          ) : (
            <div className="text-center py-12 text-sm opacity-75">
              لا يتوفر محتوى لهذا الفصل حالياً.
            </div>
          )}
        </article>

        {currentChapter?.footnotes && currentChapter.footnotes.length > 0 && (
          <section className={`mt-8 rounded-2xl border p-4 sm:p-5 space-y-3 ${themeClasses.cardBg}`} aria-label="حواشي الفصل">
            <h3 className="text-sm font-black">الحواشي والتعليقات</h3>
            <ol className="list-decimal list-inside space-y-3">
              {currentChapter.footnotes.map((note, index) => (
                <li key={`${note.marker}-${index}`} className="text-xs leading-7 opacity-85">
                  {note.marker && <strong className="ml-2">{note.marker}</strong>}
                  {note.text}
                </li>
              ))}
            </ol>
          </section>
        )}

        {currentChapter?.omittedMedia && (currentChapter.omittedMedia.images > 0 || currentChapter.omittedMedia.svgs > 0 || currentChapter.omittedMedia.tables > 0) && (
          <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] leading-6 text-amber-100/80">
            تنبيه مصدر: النسخة الرقمية الأصلية تشير إلى عناصر غير نصية لم تُضمّن هنا:
            {currentChapter.omittedMedia.images > 0 ? ` ${currentChapter.omittedMedia.images} صورة` : ''}
            {currentChapter.omittedMedia.svgs > 0 ? `، ${currentChapter.omittedMedia.svgs} رسمًا` : ''}
            {currentChapter.omittedMedia.tables > 0 ? `، ${currentChapter.omittedMedia.tables} جدولًا` : ''}.
          </p>
        )}

        {isAnnotationsOpen && (
          <section className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${themeClasses.cardBg}`} aria-label="المقتطفات والملاحظات">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black">مقتطفاتي وملاحظاتي</h3>
                <p className="mt-1 text-[11px] opacity-65">تُحفظ مواضع النصوص داخل الفقرة نفسها، وتُزامن ملاحظات الحساب مع السحابة.</p>
              </div>
              <button type="button" onClick={() => setIsAnnotationsOpen(false)} className="rounded-lg border border-current/15 p-2" aria-label="إغلاق المقتطفات">
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoadingAnnotations ? (
              <p className="py-4 text-center text-xs opacity-60">جاري تحميل المقتطفات...</p>
            ) : visibleReaderAnnotations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-current/20 p-6 text-center">
                <Highlighter className="mx-auto h-6 w-6 opacity-40" />
                <p className="mt-2 text-xs font-bold">لا توجد مقتطفات محفوظة في هذا الفصل بعد.</p>
                <p className="mt-1 text-[11px] opacity-60">حدد جملة من النص ثم اضغط أيقونة التمييز أعلى القارئ.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleReaderAnnotations.map((annotation) => (
                  <article key={annotation.id} className="rounded-xl border border-current/10 bg-black/5 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <blockquote className={`border-r-2 pr-3 text-sm font-bold leading-relaxed ${annotationMarkClasses[annotation.color] || annotationMarkClasses.gold}`}>
                        «{annotation.selectedText}»
                      </blockquote>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnotation(annotation)}
                        className="shrink-0 rounded-lg border border-rose-500/25 p-2 text-rose-500 hover:bg-rose-500/10"
                        aria-label="حذف المقتطف"
                        title="حذف المقتطف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {annotation.note && <p className="text-xs leading-relaxed whitespace-pre-wrap opacity-85">{annotation.note}</p>}
                    <div className="flex items-center justify-between gap-2 text-[10px] opacity-55">
                      <span>الفقرة {annotation.paragraphIndex + 1}</span>
                      <span>
                        {annotation.syncStatus === 'pending'
                          ? 'بانتظار المزامنة'
                          : annotation.syncStatus === 'synced'
                            ? 'متزامن مع الحساب'
                            : 'محفوظ على هذا الجهاز'}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {isAnnotationEditorOpen && selectedAnnotationChapterId === currentChapter?.id && selectedAnnotationOwnerId === (currentUser?.id || null) && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation">
            <div role="dialog" aria-modal="true" aria-labelledby="reader-annotation-title" className="w-full max-w-xl rounded-2xl border border-[#c59b27]/35 bg-[#0a1226] p-5 sm:p-6 text-white shadow-2xl space-y-4" dir="rtl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 id="reader-annotation-title" className="text-base font-black text-[#f0cb69]">حفظ مقتطف من الكتاب</h3>
                  <p className="mt-1 text-[11px] text-[#94a3b8]">سيُحفظ النص مع موضعه الدقيق داخل الفقرة.</p>
                </div>
                <button type="button" onClick={() => setIsAnnotationEditorOpen(false)} className="rounded-lg p-2 text-[#94a3b8] hover:bg-white/5" aria-label="إغلاق">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <blockquote className={`rounded-xl border-r-4 p-3 text-sm leading-relaxed ${annotationMarkClasses[annotationColor]}`}>
                {selectedTextDraft}
              </blockquote>

              <label className="block space-y-2">
                <span className="text-xs font-bold text-[#cbd5e1]">ملاحظتك (اختياري)</span>
                <textarea
                  value={annotationNoteDraft}
                  onChange={(e) => setAnnotationNoteDraft(e.target.value.slice(0, 2000))}
                  maxLength={2000}
                  rows={4}
                  placeholder="اكتب تفسيراً أو فكرة أو سؤالاً تريد الرجوع إليه..."
                  className="w-full resize-y rounded-xl border border-white/15 bg-[#050a16] px-3 py-2.5 text-xs leading-relaxed text-white outline-none focus:border-[#c59b27]"
                />
                <span className="block text-left text-[10px] text-[#64748b]">{annotationNoteDraft.length}/2000</span>
              </label>

              <div className="space-y-2">
                <span className="text-xs font-bold text-[#cbd5e1]">لون التمييز</span>
                <div className="flex flex-wrap gap-2">
                  {(['gold', 'green', 'blue', 'rose'] as const).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAnnotationColor(color)}
                      className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold ${annotationMarkClasses[color]} ${annotationColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a1226]' : 'opacity-70'}`}
                    >
                      {color === 'gold' ? 'ذهبي' : color === 'green' ? 'أخضر' : color === 'blue' ? 'أزرق' : 'وردي'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsAnnotationEditorOpen(false)} className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-[#cbd5e1]">
                  إلغاء
                </button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleSaveAnnotation} disabled={isSavingAnnotation || !selectedTextDraft} className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#c59b27] px-4 py-2 text-xs font-black text-[#070d1e] disabled:opacity-50">
                  {isSavingAnnotation ? 'جاري الحفظ...' : currentUser?.id ? 'حفظ ومزامنة' : 'حفظ على الجهاز'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Chapter Completion & Status */}
        <div className={`rounded-2xl p-5 border ${themeClasses.cardBg} flex flex-col sm:flex-row items-center justify-between gap-4 mt-12`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-5 w-5 ${isCompleted ? 'text-emerald-500' : 'opacity-40'}`} />
            <span className="text-xs font-bold">
              {isCompleted ? 'تم إكمال قراءة هذا الفصل' : 'انتهيت من القراءة؟'}
            </span>
          </div>

          <button
            onClick={handleToggleRead}
            className="rounded-xl border border-current/20 px-4 py-2 text-xs font-bold hover:bg-black/10 transition-colors"
          >
            {isCompleted ? 'تعليم كـ «غير مقروء»' : '✓ تعليم الفصل كـ «مكتمل»'}
          </button>
        </div>

        {/* BOTTOM NAVIGATION: PREVIOUS CHAPTER / INDEX / NEXT CHAPTER (مثل truthnovel.top تماماً) */}
        <div className="pt-6 border-t border-current/15">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Prev Chapter */}
            {prevChapter ? (
              <button
                onClick={() => navigateToChapter(prevChapter.id)}
                className={`flex items-center justify-between rounded-2xl border p-4 transition-all hover:scale-102 ${themeClasses.cardBg} hover:border-[#c59b27]`}
              >
                <div className="text-right">
                  <span className="text-[10px] opacity-75 block">« الفصل السابق</span>
                  <span className="text-xs font-bold truncate block max-w-[150px]">
                    الفصل {prevChapter.chapterNumber}: {prevChapter.title}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 opacity-75" />
              </button>
            ) : (
              <div className={`rounded-2xl border p-4 opacity-40 text-center text-xs font-bold ${themeClasses.cardBg}`}>
                بداية الرواية (لا يوجد فصل سابق)
              </div>
            )}

            {/* Chapters Index / Back to Overview */}
            <button
              onClick={onOpenOverview || onBack}
              className={`flex items-center justify-center gap-2 rounded-2xl border p-4 text-xs font-black transition-all hover:scale-102 ${themeClasses.cardBg} hover:border-[#c59b27]`}
            >
              <BookOpen className="h-4 w-4" />
              <span>فهرس وتفاصيل العمل</span>
            </button>

            {/* Next Chapter */}
            {nextChapter ? (
              <button
                onClick={() => navigateToChapter(nextChapter.id)}
                className="flex items-center justify-between rounded-2xl bg-gradient-to-l from-[#d4af37] to-[#c59b27] p-4 text-[#070d1e] font-bold shadow-lg transition-all hover:scale-102"
              >
                <ChevronLeft className="h-5 w-5 shrink-0" />
                <div className="text-left">
                  <span className="text-[10px] opacity-90 block">الفصل التالي »</span>
                  <span className="text-xs font-black truncate block max-w-[150px]">
                    الفصل {nextChapter.chapterNumber}: {nextChapter.title}
                  </span>
                </div>
              </button>
            ) : (
              <div className={`rounded-2xl border p-4 opacity-75 text-center text-xs font-bold ${themeClasses.cardBg}`}>
                {book.status === 'completed'
                  ? 'تم الوصول لنهاية الرواية المكتملة ✓'
                  : 'أنت في أحدث فصل متوفر حالياً! ترقب الفصول القادمة.'}
              </div>
            )}
          </div>

          <p className="text-center text-[11px] opacity-60 mt-4">
            💡 يمكنك أيضاً استخدام الأسهم في لوحة المفاتيح: (السهم الأيمن للفصل التالي، والسهم الأيسر للسابق).
          </p>
        </div>
      </main>
    </div>
  );
};
