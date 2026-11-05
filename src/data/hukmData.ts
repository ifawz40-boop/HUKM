import { BookProject, CategoryItem, ChapterMedia } from '../types/hukm';

export const HUKM_LOGO = '/assets/aistudio/Screenshot_2026-08-15_192106_2319f985.png';

export const HUKM_MOTTO = '«وعشان الموضوع مش زي ما إنت فاكر… تعالى نعرف.»';
export const HUKM_DESCRIPTION =
  'من العلوم والتكنولوجيا إلى مجالات التاريخ والفلسفة؛ نقتفي أثر الأسئلة التي تستحق البحث، ونقرأ ما بين السطور لنستخرج من بينها الـ "حُكم". نبحث، نفكك، ونفهم.';

export const HUKM_PRESET_MEDIA: ChapterMedia[] = [
  {
    id: 'preset-video-1',
    type: 'video',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-vintage-clock-gears-turning-42091-large.mp4',
    title: 'فيديو قصير: حركة التروس والساعات الميكانيكية الأولى',
    caption: 'توثيق ديناميكي لتطور أنظمة التروس الميكانيكية التي ابتكرت في القرون الوسطى لتنظيم الوقت بدقة.',
    durationSeconds: 6,
    aspectRatio: '16:9',
    placement: 'header',
    loop: true,
    autoplay: true,
    badgeText: 'فيديو توثيقي 6 ثوانٍ',
  },
  {
    id: 'preset-video-2',
    type: 'video',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-man-flipping-through-pages-of-a-book-43405-large.mp4',
    title: 'فيديو قصير: استعراض صفحات المخطوطات والوثائق النادرة',
    caption: 'مشهد توثيقي مقتطع لتقليب صفحات المخطوطات المحفوظة في الأرشيفات التاريخية العريقة.',
    durationSeconds: 7,
    aspectRatio: '16:9',
    placement: 'header',
    loop: true,
    autoplay: true,
    badgeText: 'فيديو أرشيفي 7 ثوانٍ',
  },
  {
    id: 'preset-gif-1',
    type: 'gif',
    url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHF4YnZubmF0b240OXFwMW5pOHg4cWZpMXk5YWF6bnh5d3J1OWVreCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26AHONQ79FdWZhAI0/giphy.gif',
    title: 'صورة متحركة GIF: رصد الأجرام والمدارات الفلكية',
    caption: 'رسم متحرك يوضح حساب مسارات الكواكب باستخدام الأسطرلاب العربي ونماذج بطليموس وابن الشاطر.',
    aspectRatio: '16:9',
    placement: 'header',
    loop: true,
    badgeText: 'GIF متحرك',
  },
  {
    id: 'preset-image-1',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=1200&q=80',
    title: 'صورة أرشيفية: خريطة الشريف الإدريسي في نزهة المشتاق',
    caption: 'أعظم خريطة جغرافية عرفها العالم القديم، رسمها الإدريسي في صقلية عام 1154 للميلاد.',
    aspectRatio: '16:9',
    placement: 'header',
    badgeText: 'وثيقة أرشيفية عالية الدقة',
  },
  {
    id: 'preset-image-2',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    title: 'صورة فضائية: الأرض والشبكات الرقمية والذكاء الاصطناعي',
    caption: 'رصد بصري لاتصال البيانات وشبكات المعرفة البشرية عبر القارات.',
    aspectRatio: '16:9',
    placement: 'header',
    badgeText: 'صورة توضيحية للبحث',
  },
];

export const INITIAL_CATEGORIES: CategoryItem[] = [
  {
    id: 'investigations',
    name: 'سلسلة «مش زي ما إنت فاكر»',
    description: 'تفكيك الخرافات التاريخية والعلمية وإعادة قراءة المسلمات',
  },
  {
    id: 'science_tech',
    name: 'العلوم والتكنولوجيا والذكاء الاصطناعي',
    description: 'فيزياء الكون، خوارزميات التفكير، وحدود العقل البشري',
  },
  {
    id: 'history',
    name: 'التاريخ والوثائقيات والتحقيقات',
    description: 'سقوط الحضارات، الوثائق السرية، والصراعات الكبرى',
  },
  {
    id: 'philosophy',
    name: 'الفلسفة والتفكير النقدي',
    description: 'كشف المغالطات المنطقية، فلسفة الحُكم، وتشريح الوعي',
  },
];

// Pristine empty initial books library ready for real publications
export const INITIAL_BOOKS: BookProject[] = [];
