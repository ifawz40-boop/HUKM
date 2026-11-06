# HUKM static Arabic library — source and licensing notice

The full book texts are bundled as one lazy-loaded JSON file per book under `books/`. The initial application catalogue contains metadata only. The deployed website does not fetch book content from Firebase or from Hugging Face at runtime.

## Dataset and rights method

- Dataset: [Bayanat-Labs/open-arabic-books](https://huggingface.co/datasets/Bayanat-Labs/open-arabic-books)
- Version: 0.1.0; pinned revision: [39876c0e7f28c2d16887c7c139800e0df9f87263](https://huggingface.co/datasets/Bayanat-Labs/open-arabic-books/tree/39876c0e7f28c2d16887c7c139800e0df9f87263)
- Source corpus: Andreas Hallberg, The Arabic E-Book Corpus, version 1, University of Gothenburg, 2024, https://doi.org/10.5878/7rbh-gy93.
- Publisher: Hindawi Foundation.
- Selected books follow one of two rights paths: (1) explicit CC BY 4.0 colophon for the Arabic translation plus public-domain original; or (2) public-domain original with all credited rights-relevant persons recorded as deceased by 1955 (life+70 screen as of 2026).
- CC BY 4.0 translations retain their required attribution and licence notices; CC BY 4.0 does not impose a ShareAlike condition. Public-domain original texts remain public domain. The dataset metadata/attribution is CC BY 4.0.
- Attribution is preserved verbatim per book. Each JSON retains the exact colophon quotation, source URL, source hash, credits and pinned dataset revision.
- The underlying source dataset contains 1,545 books. This HUKM batch contains 23 automatically selected, rights-screened books from a 24-book target; selection uses category quotas and a target length of about 8,000 words. It is not yet manually curated or individually proofread.
- The selector keeps at most one book per upstream book-level near_duplicate_group; the group identifier is retained in each book's rights metadata.
- First-batch integrity totals: 23 books, 285 sections, 360,244 words and 734 footnotes. The source metadata records 48 omitted images, 64 omitted SVG elements and 1 omitted tables across this batch; these assets are not embedded in the reader.

## Included books

### رسالة لغوية عن الرتب والألقاب المصرية: لرجال الجيش والهيئات العلمية والقلمية منذ عهد أمير المؤمنين عمر الفاروق
- Author(s): أحمد تيمور باشا
- Translator(s): not specified
- Category: التاريخ (history)
- Length: 8,515 words; 5 sections.
- Source: https://www.hindawi.org/books/69073918/
- Attribution: «رسالة لغوية عن الرتب والألقاب المصرية: لرجال الجيش والهيئات العلمية والقلمية منذ عهد أمير المؤمنين عمر الفاروق» (author: أحمد تيمور باشا). Hindawi Foundation edition, https://www.hindawi.org/books/69073918/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### مئذنة الجامع الأبيض في الرملة
- Author(s): عبد الله مخلص
- Translator(s): not specified
- Category: التاريخ (history)
- Length: 8,835 words; 3 sections.
- Source: https://www.hindawi.org/books/24716913/
- Attribution: «مئذنة الجامع الأبيض في الرملة» (author: عبد الله مخلص). Hindawi Foundation edition, https://www.hindawi.org/books/24716913/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### المرأة في الجاهلية
- Author(s): حبيب الزيات
- Translator(s): not specified
- Category: التاريخ (history)
- Length: 9,026 words; 3 sections.
- Source: https://www.hindawi.org/books/49296385/
- Attribution: «المرأة في الجاهلية» (author: حبيب الزيات). Hindawi Foundation edition, https://www.hindawi.org/books/49296385/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### الفردوس
- Author(s): عبد الرحمن البرقوقي
- Translator(s): not specified
- Category: الأدب (literature)
- Length: 9,896 words; 4 sections.
- Source: https://www.hindawi.org/books/16420804/
- Attribution: «الفردوس» (author: عبد الرحمن البرقوقي). Hindawi Foundation edition, https://www.hindawi.org/books/16420804/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### مناجاة أرواح
- Author(s): جبران خليل جبران
- Translator(s): not specified
- Category: الأدب (literature)
- Length: 10,617 words; 24 sections.
- Source: https://www.hindawi.org/books/46050302/
- Attribution: «مناجاة أرواح» (author: جبران خليل جبران). Hindawi Foundation edition, https://www.hindawi.org/books/46050302/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### عبرة التاريخ
- Author(s): أحمد زكي أبو شادي
- Translator(s): not specified
- Category: الروايات (novels)
- Length: 13,041 words; 13 sections.
- Source: https://www.hindawi.org/books/80272839/
- Attribution: «عبرة التاريخ» (author: أحمد زكي أبو شادي). Hindawi Foundation edition, https://www.hindawi.org/books/80272839/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### أحدب نوتردام
- Author(s): فيكتور هوجو
- Translator(s): أميرة علي عبد الصادق
- Category: الروايات (novels)
- Length: 14,110 words; 18 sections.
- Source: https://www.hindawi.org/books/14850838/
- Attribution: «أحدب نوتردام» (author: فيكتور هوجو; translator: أميرة علي عبد الصادق). Hindawi Foundation edition, https://www.hindawi.org/books/14850838/. Publisher's colophon: Arabic translation and book design CC BY 4.0; original text public domain. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب، وتصميم الغلاف، والترجمة العربية لنص هذا الكتاب مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: CC BY 4.0 — الترجمة العربية؛ النص الأصلي في الملكية العامة

### عائلة روبنسون السويسرية
- Author(s): يوهان ديفيد فيس
- Translator(s): فايقه جرجس حنا
- Category: الروايات (novels)
- Length: 15,042 words; 21 sections.
- Source: https://www.hindawi.org/books/71584294/
- Attribution: «عائلة روبنسون السويسرية» (author: يوهان ديفيد فيس; translator: فايقه جرجس حنا). Hindawi Foundation edition, https://www.hindawi.org/books/71584294/. Publisher's colophon: Arabic translation and book design CC BY 4.0; original text public domain. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب، وتصميم الغلاف، والترجمة العربية لنص هذا الكتاب مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: CC BY 4.0 — الترجمة العربية؛ النص الأصلي في الملكية العامة

### من عالم الأرواح
- Author(s): روبرت بار
- Translator(s): أمنية طلعت
- Category: الأدب البوليسي (detective.fiction)
- Length: 23,864 words; 17 sections.
- Source: https://www.hindawi.org/books/63052914/
- Attribution: «من عالم الأرواح» (author: روبرت بار; translator: أمنية طلعت). Hindawi Foundation edition, https://www.hindawi.org/books/63052914/. Publisher's colophon: Arabic translation and book design CC BY 4.0; original text public domain. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب، وتصميم الغلاف، والترجمة العربية لنص هذا الكتاب مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: CC BY 4.0 — الترجمة العربية؛ النص الأصلي في الملكية العامة

### المُحقق الخاص: مجموعة تجليات من واقع قضايا الشرطة
- Author(s): أندرو فورستر
- Translator(s): إسلام سميح الردان
- Category: الأدب البوليسي (detective.fiction)
- Length: 26,282 words; 5 sections.
- Source: https://www.hindawi.org/books/83159415/
- Attribution: «المُحقق الخاص: مجموعة تجليات من واقع قضايا الشرطة» (author: أندرو فورستر; translator: إسلام سميح الردان). Hindawi Foundation edition, https://www.hindawi.org/books/83159415/. Publisher's colophon: Arabic translation and book design CC BY 4.0; original text public domain. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب، وتصميم الغلاف، والترجمة العربية لنص هذا الكتاب مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: CC BY 4.0 — الترجمة العربية؛ النص الأصلي في الملكية العامة

### مذكرات
- Author(s): أبو القاسم الشابي
- Translator(s): not specified
- Category: السير والتراجم (biographies)
- Length: 12,065 words; 22 sections.
- Source: https://www.hindawi.org/books/75140946/
- Attribution: «مذكرات» (author: أبو القاسم الشابي). Hindawi Foundation edition, https://www.hindawi.org/books/75140946/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### لامرتين
- Author(s): إلياس أبو شبكة
- Translator(s): not specified
- Category: السير والتراجم (biographies)
- Length: 14,023 words; 7 sections.
- Source: https://www.hindawi.org/books/97573697/
- Attribution: «لامرتين» (author: إلياس أبو شبكة). Hindawi Foundation edition, https://www.hindawi.org/books/97573697/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### مُغَامَرَاتُ الثَّعْلَبِ ريدي
- Author(s): ثورنتون دبليو برجس
- Translator(s): ندى أحمد قاسم
- Category: قصص الأطفال (children.stories)
- Length: 11,222 words; 26 sections.
- Source: https://www.hindawi.org/books/62815719/
- Attribution: «مُغَامَرَاتُ الثَّعْلَبِ ريدي» (author: ثورنتون دبليو برجس; translator: ندى أحمد قاسم). Hindawi Foundation edition, https://www.hindawi.org/books/62815719/. Publisher's colophon: Arabic translation and book design CC BY 4.0; original text public domain. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب، وتصميم الغلاف، والترجمة العربية لنص هذا الكتاب مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: CC BY 4.0 — الترجمة العربية؛ النص الأصلي في الملكية العامة

### مُغَامَرَاتُ الْقُنْدُسِ بادي
- Author(s): ثورنتون دبليو برجس
- Translator(s): لبنى عماد تركي
- Category: قصص الأطفال (children.stories)
- Length: 11,760 words; 22 sections.
- Source: https://www.hindawi.org/books/95247424/
- Attribution: «مُغَامَرَاتُ الْقُنْدُسِ بادي» (author: ثورنتون دبليو برجس; translator: لبنى عماد تركي). Hindawi Foundation edition, https://www.hindawi.org/books/95247424/. Publisher's colophon: Arabic translation and book design CC BY 4.0; original text public domain. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب، وتصميم الغلاف، والترجمة العربية لنص هذا الكتاب مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: CC BY 4.0 — الترجمة العربية؛ النص الأصلي في الملكية العامة

### الذرة والقنابل الذرية
- Author(s): علي مصطفى مشرفة
- Translator(s): not specified
- Category: العلوم (science)
- Length: 13,115 words; 12 sections.
- Source: https://www.hindawi.org/books/60714615/
- Attribution: «الذرة والقنابل الذرية» (author: علي مصطفى مشرفة). Hindawi Foundation edition, https://www.hindawi.org/books/60714615/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### نحن والعلم
- Author(s): علي مصطفى مشرفة
- Translator(s): not specified
- Category: العلوم (science)
- Length: 13,134 words; 7 sections.
- Source: https://www.hindawi.org/books/64704849/
- Attribution: «نحن والعلم» (author: علي مصطفى مشرفة). Hindawi Foundation edition, https://www.hindawi.org/books/64704849/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### ما الحياة؟: الجانب الفيزيائي للخلية الحية
- Author(s): إرفين شرودنجر
- Translator(s): أحمد سمير سعد
- Category: الفلسفة (philosophy)
- Length: 22,721 words; 11 sections.
- Source: https://www.hindawi.org/books/72531648/
- Attribution: «ما الحياة؟: الجانب الفيزيائي للخلية الحية» (author: إرفين شرودنجر; translator: أحمد سمير سعد). Hindawi Foundation edition, https://www.hindawi.org/books/72531648/. Publisher's colophon: Arabic translation and book design CC BY 4.0; original text public domain. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب، وتصميم الغلاف، والترجمة العربية لنص هذا الكتاب مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: CC BY 4.0 — الترجمة العربية؛ النص الأصلي في الملكية العامة

### فلسفة الوجود
- Author(s): نقولا حداد
- Translator(s): not specified
- Category: الفلسفة (philosophy)
- Length: 27,898 words; 18 sections.
- Source: https://www.hindawi.org/books/69316182/
- Attribution: «فلسفة الوجود» (author: نقولا حداد). Hindawi Foundation edition, https://www.hindawi.org/books/69316182/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### حقوق النساء في الإسلام
- Author(s): قاسم أمين
- Translator(s): not specified
- Category: العلوم الاجتماعية (social.sciences)
- Length: 8,911 words; 3 sections.
- Source: https://www.hindawi.org/books/64837516/
- Attribution: «حقوق النساء في الإسلام» (author: قاسم أمين). Hindawi Foundation edition, https://www.hindawi.org/books/64837516/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### النهضة العربية: في العصر الحاضر
- Author(s): شكيب أرسلان
- Translator(s): not specified
- Category: العلوم الاجتماعية (social.sciences)
- Length: 9,027 words; 16 sections.
- Source: https://www.hindawi.org/books/95716864/
- Attribution: «النهضة العربية: في العصر الحاضر» (author: شكيب أرسلان). Hindawi Foundation edition, https://www.hindawi.org/books/95716864/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### الواسطة في معرفة أحوال مالطة
- Author(s): أحمد فارس الشدياق
- Translator(s): not specified
- Category: أدب الرحلات (travel.literature)
- Length: 20,782 words; 8 sections.
- Source: https://www.hindawi.org/books/84130273/
- Attribution: «الواسطة في معرفة أحوال مالطة» (author: أحمد فارس الشدياق). Hindawi Foundation edition, https://www.hindawi.org/books/84130273/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### رحلة إلى الحجاز
- Author(s): إبراهيم عبد القادر المازني
- Translator(s): not specified
- Category: أدب الرحلات (travel.literature)
- Length: 26,675 words; 9 sections.
- Source: https://www.hindawi.org/books/72603515/
- Attribution: «رحلة إلى الحجاز» (author: إبراهيم عبد القادر المازني). Hindawi Foundation edition, https://www.hindawi.org/books/72603515/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### نور الأندلس
- Author(s): أمين الريحاني
- Translator(s): not specified
- Category: أدب الرحلات (travel.literature)
- Length: 29,683 words; 11 sections.
- Source: https://www.hindawi.org/books/59603514/
- Attribution: «نور الأندلس» (author: أمين الريحاني). Hindawi Foundation edition, https://www.hindawi.org/books/59603514/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

## Build summary

- Books: 23
- Sections: 285
- Words: 360,244
- JSON payload: 4.24 MiB before compression.
- Generated snapshot: 2026-11-04 (deterministic source snapshot)

## Limitations

- The publisher colophon and life+70 screen are evidence, not legal advice. Copyright terms differ by jurisdiction; verify before redistribution.
- Images, SVG figures and some tables are omitted; per-book omission counts are stored in each JSON file.
- The 95% word-count threshold and section-count checks detect incomplete extraction, not proofreading or textual accuracy.
