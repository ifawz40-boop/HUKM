import type { PdfLibraryItem } from '../../types/pdfLibrary';

/**
 * Legally cleared scan used as the first PDF.js reader fixture.
 * The Commons file page identifies this as a mechanical scan of a public-domain
 * 1891 edition. The separate Wikisource transcription is CC BY-SA 4.0 and is
 * intentionally not bundled or imported here.
 */
export const PDF_LIBRARY_ITEMS: readonly PdfLibraryItem[] = [
  {
    id: 'lisan-ghusn-lubnan-1891-scan',
    title: 'لسان غصن لبنان في انتقاد العربية العصرية',
    author: 'شاكر شقير اللبناني',
    publicationYear: 1891,
    pageCount: 79,
    description: 'نسخة مصورة من طبعة المطبعة العثمانية في بعبدا. هذه تجربة لقارئ PDF وليست استيرادًا للتفريغ النصي.',
    fileUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/%D9%83%D8%AA%D8%A7%D8%A8_%D9%84%D8%B3%D8%A7%D9%86_%D8%BA%D8%B5%D9%86_%D9%84%D8%A8%D9%86%D8%A7%D9%86_%D9%81%D9%8A_%D8%A7%D9%86%D8%AA%D9%82%D8%A7%D8%AF_%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9_%D8%A7%D9%84%D8%B9%D8%B5%D8%B1%D9%8A%D8%A9.pdf',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:%D9%83%D8%AA%D8%A7%D8%A8_%D9%84%D8%B3%D8%A7%D9%86_%D8%BA%D8%B5%D9%86_%D9%84%D8%A8%D9%86%D8%A7%D9%86_%D9%81%D9%8A_%D8%A7%D9%86%D8%AA%D9%82%D8%A7%D8%AF_%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9_%D8%A7%D9%84%D8%B9%D8%B5%D8%B1%D9%8A%D8%A9.pdf',
    sourceNameAr: 'ويكيميديا كومنز',
    license: 'الملكية العامة — مسح ميكانيكي لعمل في الملكية العامة',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
    attribution: 'شاكر شقير، لسان غصن لبنان في انتقاد العربية العصرية، المطبعة العثمانية في بعبدا، 1891. ملف المسح من ويكيميديا كومنز.',
    isScanned: true,
    searchAvailable: false,
  },
] as const;
