import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Minus, Plus, RotateCcw } from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PdfLibraryItem } from '../types/pdfLibrary';
import {
  clampPdfPage,
  clampPdfZoom,
  getPdfReaderProgressKey,
  parsePdfReaderProgress,
  serializePdfReaderProgress,
} from '../utils/pdfReaderProgress';

type PdfDocument = Awaited<ReturnType<typeof getDocument>['promise']>;

interface PdfReaderViewProps {
  item: PdfLibraryItem;
  currentUserId?: string | null;
  onBack: () => void;
}

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const getStoredProgress = (key: string, totalPages: number) => {
  try {
    return parsePdfReaderProgress(window.localStorage.getItem(key), totalPages);
  } catch {
    return { page: 1, zoom: 1, fitToWidth: true };
  }
};

export const PdfReaderView: React.FC<PdfReaderViewProps> = ({
  item,
  currentUserId,
  onBack,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const documentRef = useRef<PdfDocument | null>(null);
  const loadingTaskRef = useRef<ReturnType<typeof getDocument> | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const progressKey = getPdfReaderProgressKey(item.id, currentUserId);
  const [totalPages, setTotalPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [zoom, setZoom] = useState(1);
  const [fitToWidth, setFitToWidth] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDocumentReady, setIsDocumentReady] = useState(false);
  const [renderedPage, setRenderedPage] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsDocumentReady(false);
    setError('');
    setTotalPages(0);
    setPageNumber(1);
    setPageInput('1');

    const loadingTask = getDocument({
      url: item.fileUrl,
      enableXfa: false,
    });
    loadingTaskRef.current = loadingTask;

    loadingTask.promise.then((pdf) => {
      if (cancelled) {
        void loadingTask.destroy();
        return;
      }

      documentRef.current = pdf;
      const saved = getStoredProgress(progressKey, pdf.numPages);
      setTotalPages(pdf.numPages);
      setPageNumber(saved.page);
      setPageInput(String(saved.page));
      setZoom(saved.zoom);
      setFitToWidth(saved.fitToWidth);
      setRenderedPage(0);
      setIsDocumentReady(true);
      setIsLoading(false);
    }).catch((loadError: unknown) => {
      if (cancelled) return;
      console.error('PDF document load failed:', loadError);
      setError('تعذر تحميل ملف PDF. قد يكون المصدر الخارجي غير متاح أو يمنع الاتصال المباشر. يمكنك فتح النسخة الأصلية من رابط المصدر.');
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      documentRef.current = null;
      const task = loadingTaskRef.current;
      loadingTaskRef.current = null;
      if (task) void task.destroy();
    };
  }, [item.id, item.fileUrl, progressKey]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => setContainerWidth(element.clientWidth);
    updateWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (!isDocumentReady || totalPages < 1) return;
    try {
      window.localStorage.setItem(progressKey, serializePdfReaderProgress(pageNumber, zoom, fitToWidth));
    } catch {
      // Private browsing or storage limits must not interrupt reading.
    }
  }, [isDocumentReady, progressKey, pageNumber, zoom, fitToWidth, totalPages]);

  useEffect(() => {
    const pdf = documentRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || !containerWidth || pageNumber < 1 || pageNumber > totalPages) return;

    let cancelled = false;
    const renderPage = async () => {
      try {
        renderTaskRef.current?.cancel();
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = Math.max(0.5, Math.min((containerWidth - 32) / baseViewport.width, 2.5));
        const viewport = page.getViewport({ scale: fitToWidth ? fitScale : zoom });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas 2D context is unavailable.');

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: outputScale !== 1
            ? [outputScale, 0, 0, outputScale, 0, 0]
            : undefined,
          intent: 'display',
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (!cancelled) setRenderedPage(pageNumber);
      } catch (renderError: unknown) {
        const name = renderError instanceof Error ? renderError.name : '';
        if (!cancelled && name !== 'RenderingCancelledException') {
          console.error('PDF page render failed:', renderError);
          setError('تعذر عرض هذه الصفحة من الملف.');
        }
      }
    };

    void renderPage();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [containerWidth, fitToWidth, isDocumentReady, pageNumber, totalPages, zoom]);

  const goToPage = (value: number) => {
    const nextPage = clampPdfPage(value, totalPages);
    setPageNumber(nextPage);
    setPageInput(String(nextPage));
    setError('');
  };

  const changeZoom = (delta: number) => {
    setFitToWidth(false);
    setZoom((current) => clampPdfZoom(current + delta));
  };

  return (
    <main className="min-h-[70vh] bg-[#070d1e] px-3 py-5 text-[#f4efe6] sm:px-6" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0a1329] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <button type="button" onClick={onBack} className="rounded-xl border border-white/10 p-2 text-[#f0cb69] hover:bg-white/5" aria-label="العودة إلى المكتبة">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-widest text-[#d4af37]">قارئ PDF من حُكم</p>
              <h1 className="mt-1 line-clamp-2 text-base font-black text-white sm:text-lg">{item.title}</h1>
              <p className="mt-1 text-xs text-slate-400">{item.author} · {item.publicationYear}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button type="button" onClick={() => changeZoom(-0.15)} disabled={zoom <= 0.7 || fitToWidth} className="rounded-lg border border-white/10 p-2 disabled:opacity-40" aria-label="تصغير">
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-12 text-center tabular-nums" dir="ltr">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => changeZoom(0.15)} disabled={zoom >= 2.5 || fitToWidth} className="rounded-lg border border-white/10 p-2 disabled:opacity-40" aria-label="تكبير">
              <Plus className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setFitToWidth(true)} className={`rounded-lg border px-3 py-2 ${fitToWidth ? 'border-[#c59b27]/50 bg-[#c59b27]/10 text-[#f0cb69]' : 'border-white/10 text-slate-300'}`}>
              ملاءمة العرض
            </button>
          </div>
        </header>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0a1329] p-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => goToPage(pageNumber - 1)} disabled={isLoading || pageNumber <= 1} className="rounded-lg border border-white/10 p-2 disabled:opacity-35" aria-label="الصفحة السابقة">
              <ChevronRight className="h-4 w-4" />
            </button>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              صفحة
              <input
                type="number"
                min={1}
                max={totalPages || undefined}
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                onBlur={() => goToPage(Number(pageInput))}
                onKeyDown={(event) => { if (event.key === 'Enter') goToPage(Number(pageInput)); }}
                disabled={isLoading || totalPages < 1}
                className="w-16 rounded-lg border border-white/10 bg-[#050a16] px-2 py-2 text-center text-white"
                dir="ltr"
                aria-label="رقم الصفحة"
              />
              <span className="text-slate-500" dir="ltr">/ {totalPages || '—'}</span>
            </label>
            <button type="button" onClick={() => goToPage(pageNumber + 1)} disabled={isLoading || pageNumber >= totalPages} className="rounded-lg border border-white/10 p-2 disabled:opacity-35" aria-label="الصفحة التالية">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            {renderedPage === pageNumber && !isLoading ? 'تم عرض الصفحة' : isLoading ? 'جارٍ تحميل الملف…' : 'جارٍ تجهيز الصفحة…'}
            <button type="button" onClick={() => { setRenderedPage(0); setError(''); goToPage(pageNumber); }} className="rounded-lg border border-white/10 p-2 hover:bg-white/5" aria-label="إعادة تحميل الصفحة">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        {error && (
          <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-7 text-amber-100">
            <p>{error}</p>
            <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 font-bold underline underline-offset-4">
              فتح ملف PDF الأصلي <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        <div ref={containerRef} className="min-h-[55vh] overflow-x-auto rounded-2xl border border-white/10 bg-[#101a2e] p-3 sm:p-6">
          {isLoading ? (
            <div className="flex min-h-[55vh] items-center justify-center text-sm text-slate-400">جارٍ تحميل النسخة المصورة…</div>
          ) : (
            <div className="flex min-h-[55vh] justify-center">
              <canvas ref={canvasRef} className="h-auto max-w-full bg-white shadow-2xl" aria-label={`صفحة ${pageNumber} من ${item.title}`} />
            </div>
          )}
        </div>

        <footer className="grid gap-3 rounded-2xl border border-[#c59b27]/20 bg-[#0a1329] p-4 text-xs leading-7 text-slate-300 sm:grid-cols-2">
          <div>
            <p className="font-bold text-[#f0cb69]">بيانات النسخة المصورة</p>
            <p>{item.attribution}</p>
            {item.sourceRevisionId && <p className="text-[10px] text-slate-500">معرّف مراجعة صفحة المصدر: {item.sourceRevisionId}</p>}
            <p className="mt-1">حالة الملف: {item.license}</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-start">
            <p>هذه نسخة مصورة؛ البحث النصي وOCR غير متاحين في هذا الإصدار من القارئ. يُحفظ موضع القراءة محليًا على هذا الجهاز والحساب، دون مزامنة سحابية حاليًا.</p>
            <div className="flex flex-wrap gap-3">
              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-[#f0cb69] underline underline-offset-4">صفحة المصدر</a>
              <a href={item.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">بيان الحقوق</a>
              <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">فتح الملف الأصلي</a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
};

export default PdfReaderView;
