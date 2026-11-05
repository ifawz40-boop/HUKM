import type { BookProject, CategoryItem } from '../../types/hukm';

export const PUBLIC_LIBRARY_CATEGORIES: CategoryItem[] = [
  { id: 'adab', name: 'الأدب والتراث', description: 'كتب الأدب والنوادر والنصوص التراثية' },
  { id: 'language', name: 'اللغة والبلاغة', description: 'علوم العربية والبيان واللغة' },
  { id: 'literature', name: 'الأدب والنقد', description: 'المؤلفات الأدبية والنقدية' },
  { id: 'history', name: 'التاريخ والتراجم', description: 'التاريخ والسير وأخبار الأمم' },
  { id: 'philosophy', name: 'الفلسفة والفكر', description: 'الفلسفة والفكر والرسائل' },
  { id: 'science', name: 'العلوم والمعرفة', description: 'المعرفة والعلوم في التراث العربي' },
  { id: 'geography', name: 'الجغرافيا والبلدان', description: 'البلدان والرحلات والجغرافيا' },
  { id: 'travel', name: 'الرحلات والأسفار', description: 'أدب الرحلات والمشاهدات' },
];

const bundledBookModules = import.meta.glob('./books/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, BookProject>;

export const PUBLIC_LIBRARY_BOOKS: BookProject[] = Object.values(bundledBookModules)
  .filter((book) => book && book.id && Array.isArray(book.chapters))
  .sort((a, b) => a.title.localeCompare(b.title, 'ar'));

export const PUBLIC_LIBRARY_SOURCE = {
  name: 'Bayanat Labs — Arabic Wikisource Public-Domain Works',
  version: '0.1.0',
  datasetUrl: 'https://huggingface.co/datasets/Bayanat-Labs/arabic-wikisource-pd',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
} as const;
