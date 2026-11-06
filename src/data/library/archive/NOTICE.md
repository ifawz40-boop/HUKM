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
- The underlying source dataset contains 1,545 books. This HUKM batch contains 24 automatically selected, rights-screened books from a 24-book target; selection uses category quotas and a target length of about 50,000 words. It is not yet manually curated or individually proofread.
- The selector keeps at most one book per upstream book-level near_duplicate_group; the group identifier is retained in each book's rights metadata.
- Upstream chapter duplicate annotations are preserved on each chapter without removing or merging text: 0 sections carry exact_duplicate_group and 0 carry near_duplicate_group.
- First-batch integrity totals: 24 books, 529 sections, 1,144,156 words and 2,283 footnotes. The source metadata records 204 omitted images, 0 omitted SVG elements and 14 omitted tables across this batch; these assets are not embedded in the reader.

## Included books

### تاريخ الإسرائيليين
- Author(s): شاهين مكاريوس
- Translator(s): not specified
- Category: التاريخ (history)
- Length: 49,785 words; 18 sections.
- Source: https://www.hindawi.org/books/93717253/
- Attribution: «تاريخ الإسرائيليين» (author: شاهين مكاريوس). Hindawi Foundation edition, https://www.hindawi.org/books/93717253/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### قلب العراق رحلات وتاريخ
- Author(s): أمين الريحاني
- Translator(s): not specified
- Category: التاريخ (history)
- Length: 48,276 words; 21 sections.
- Source: https://www.hindawi.org/books/42409306/
- Attribution: «قلب العراق رحلات وتاريخ» (author: أمين الريحاني). Hindawi Foundation edition, https://www.hindawi.org/books/42409306/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### الإدارة الإسلامية في عز العرب
- Author(s): محمد كرد علي
- Translator(s): not specified
- Category: التاريخ (history)
- Length: 46,889 words; 6 sections.
- Source: https://www.hindawi.org/books/59250728/
- Attribution: «الإدارة الإسلامية في عز العرب» (author: محمد كرد علي). Hindawi Foundation edition, https://www.hindawi.org/books/59250728/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### خطوة في الظلام
- Author(s): إثيل لينا وايت
- Translator(s): دينا عادل غراب
- Category: الأدب (literature)
- Length: 52,606 words; 27 sections.
- Source: https://www.hindawi.org/books/31609295/
- Attribution: «خطوة في الظلام» (author: إثيل لينا وايت; translator: دينا عادل غراب). Hindawi Foundation edition, https://www.hindawi.org/books/31609295/. Publisher's colophon: Arabic translation and book design CC BY 4.0; original text public domain. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب، وتصميم الغلاف، والترجمة العربية لنص هذا الكتاب مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: CC BY 4.0 — الترجمة العربية؛ النص الأصلي في الملكية العامة

### كتاب المساكين
- Author(s): مصطفى صادق الرافعي
- Translator(s): not specified
- Category: الأدب (literature)
- Length: 46,499 words; 19 sections.
- Source: https://www.hindawi.org/books/80383953/
- Attribution: «كتاب المساكين» (author: مصطفى صادق الرافعي). Hindawi Foundation edition, https://www.hindawi.org/books/80383953/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### النسائيات
- Author(s): ملك حفني ناصف
- Translator(s): not specified
- Category: الأدب (literature)
- Length: 46,085 words; 8 sections.
- Source: https://www.hindawi.org/books/15197275/
- Attribution: «النسائيات» (author: ملك حفني ناصف). Hindawi Foundation edition, https://www.hindawi.org/books/15197275/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### عجلة الحظ
- Author(s): إثيل لينا وايت
- Translator(s): سارة ياقوت
- Category: الروايات (novels)
- Length: 49,939 words; 33 sections.
- Source: https://www.hindawi.org/books/57316482/
- Attribution: «عجلة الحظ» (author: إثيل لينا وايت; translator: سارة ياقوت). Hindawi Foundation edition, https://www.hindawi.org/books/57316482/. Publisher's colophon: Arabic translation and book design CC BY 4.0; original text public domain. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب، وتصميم الغلاف، والترجمة العربية لنص هذا الكتاب مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: CC BY 4.0 — الترجمة العربية؛ النص الأصلي في الملكية العامة

### آدم الجديد: رواية اجتماعية عصرية
- Author(s): نقولا حداد
- Translator(s): not specified
- Category: الروايات (novels)
- Length: 46,767 words; 57 sections.
- Source: https://www.hindawi.org/books/49195362/
- Attribution: «آدم الجديد: رواية اجتماعية عصرية» (author: نقولا حداد). Hindawi Foundation edition, https://www.hindawi.org/books/49195362/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### إيفانهو
- Author(s): والتر سكوت
- Translator(s): ياسمين العربي
- Category: الروايات (novels)
- Length: 53,658 words; 43 sections.
- Source: https://www.hindawi.org/books/93029537/
- Attribution: «إيفانهو» (author: والتر سكوت; translator: ياسمين العربي). Hindawi Foundation edition, https://www.hindawi.org/books/93029537/. Publisher's colophon: Arabic translation and book design CC BY 4.0; original text public domain. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب، وتصميم الغلاف، والترجمة العربية لنص هذا الكتاب مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: CC BY 4.0 — الترجمة العربية؛ النص الأصلي في الملكية العامة

### ابنة الزمن
- Author(s): جوزفين تاي
- Translator(s): عبد الفتاح عبد الله، نيرة محمد صبري
- Category: الأدب البوليسي (detective.fiction)
- Length: 48,150 words; 17 sections.
- Source: https://www.hindawi.org/books/35759391/
- Attribution: «ابنة الزمن» (author: جوزفين تاي; translator: عبد الفتاح عبد الله; translator: نيرة محمد صبري). Hindawi Foundation edition, https://www.hindawi.org/books/35759391/. Publisher's colophon: Arabic translation and book design CC BY 4.0; original text public domain. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب، وتصميم الغلاف، والترجمة العربية لنص هذا الكتاب مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: CC BY 4.0 — الترجمة العربية؛ النص الأصلي في الملكية العامة

### صخرة في بحر البلطيق
- Author(s): روبرت بار
- Translator(s): إسلام سميح الردان
- Category: الأدب البوليسي (detective.fiction)
- Length: 52,154 words; 21 sections.
- Source: https://www.hindawi.org/books/35083053/
- Attribution: «صخرة في بحر البلطيق» (author: روبرت بار; translator: إسلام سميح الردان). Hindawi Foundation edition, https://www.hindawi.org/books/35083053/. Publisher's colophon: Arabic translation and book design CC BY 4.0; original text public domain. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب، وتصميم الغلاف، والترجمة العربية لنص هذا الكتاب مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: CC BY 4.0 — الترجمة العربية؛ النص الأصلي في الملكية العامة

### فيصل الأول: رحلات وتاريخ
- Author(s): أمين الريحاني
- Translator(s): not specified
- Category: السير والتراجم (biographies)
- Length: 50,820 words; 24 sections.
- Source: https://www.hindawi.org/books/26848631/
- Attribution: «فيصل الأول: رحلات وتاريخ» (author: أمين الريحاني). Hindawi Foundation edition, https://www.hindawi.org/books/26848631/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### مذكراتي
- Author(s): إسماعيل صدقي
- Translator(s): not specified
- Category: السير والتراجم (biographies)
- Length: 53,050 words; 33 sections.
- Source: https://www.hindawi.org/books/52646842/
- Attribution: «مذكراتي» (author: إسماعيل صدقي). Hindawi Foundation edition, https://www.hindawi.org/books/52646842/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### أطفال السكة الحديدية
- Author(s): إديث نسبيت
- Translator(s): إسلام سميح الردان
- Category: قصص الأطفال (children.stories)
- Length: 52,371 words; 15 sections.
- Source: https://www.hindawi.org/books/31717369/
- Attribution: «أطفال السكة الحديدية» (author: إديث نسبيت; translator: إسلام سميح الردان). Hindawi Foundation edition, https://www.hindawi.org/books/31717369/. Publisher's colophon: Arabic translation and book design CC BY 4.0; original text public domain. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب، وتصميم الغلاف، والترجمة العربية لنص هذا الكتاب مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: CC BY 4.0 — الترجمة العربية؛ النص الأصلي في الملكية العامة

### الرياح وأشجار الصفصاف
- Author(s): كينيث جرام
- Translator(s): أسامة إسماعيل عبد العليم
- Category: قصص الأطفال (children.stories)
- Length: 53,158 words; 12 sections.
- Source: https://www.hindawi.org/books/72597415/
- Attribution: «الرياح وأشجار الصفصاف» (author: كينيث جرام; translator: أسامة إسماعيل عبد العليم). Hindawi Foundation edition, https://www.hindawi.org/books/72597415/. Publisher's colophon: Arabic translation and book design CC BY 4.0; original text public domain. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب، وتصميم الغلاف، والترجمة العربية لنص هذا الكتاب مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: CC BY 4.0 — الترجمة العربية؛ النص الأصلي في الملكية العامة

### مطالعات علمية
- Author(s): علي مصطفى مشرفة
- Translator(s): not specified
- Category: العلوم (science)
- Length: 37,908 words; 25 sections.
- Source: https://www.hindawi.org/books/28471509/
- Attribution: «مطالعات علمية» (author: علي مصطفى مشرفة). Hindawi Foundation edition, https://www.hindawi.org/books/28471509/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### الكيمياء عند العرب
- Author(s): روحي الخالدي
- Translator(s): not specified
- Category: العلوم (science)
- Length: 19,948 words; 4 sections.
- Source: https://www.hindawi.org/books/58627085/
- Attribution: «الكيمياء عند العرب» (author: روحي الخالدي). Hindawi Foundation edition, https://www.hindawi.org/books/58627085/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### أين الإنسان
- Author(s): طنطاوي جوهري
- Translator(s): not specified
- Category: الفلسفة (philosophy)
- Length: 47,491 words; 24 sections.
- Source: https://www.hindawi.org/books/48270516/
- Attribution: «أين الإنسان» (author: طنطاوي جوهري). Hindawi Foundation edition, https://www.hindawi.org/books/48270516/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### مائدة أفلاطون: كلام في الحب
- Author(s): محمد لطفي جمعة
- Translator(s): not specified
- Category: الفلسفة (philosophy)
- Length: 41,642 words; 8 sections.
- Source: https://www.hindawi.org/books/95280646/
- Attribution: «مائدة أفلاطون: كلام في الحب» (author: محمد لطفي جمعة). Hindawi Foundation edition, https://www.hindawi.org/books/95280646/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### الرسائل الزينبية
- Author(s): زينب فواز
- Translator(s): not specified
- Category: العلوم الاجتماعية (social.sciences)
- Length: 51,383 words; 73 sections.
- Source: https://www.hindawi.org/books/86864915/
- Attribution: «الرسائل الزينبية» (author: زينب فواز). Hindawi Foundation edition, https://www.hindawi.org/books/86864915/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### طبائع الاستبداد ومصارع الاستعباد
- Author(s): عبد الرحمن الكواكبي
- Translator(s): not specified
- Category: العلوم الاجتماعية (social.sciences)
- Length: 33,053 words; 11 sections.
- Source: https://www.hindawi.org/books/30272530/
- Attribution: «طبائع الاستبداد ومصارع الاستعباد» (author: عبد الرحمن الكواكبي). Hindawi Foundation edition, https://www.hindawi.org/books/30272530/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### الرحلة إلى أمريكا
- Author(s): محمد لبيب البتنوني
- Translator(s): not specified
- Category: أدب الرحلات (travel.literature)
- Length: 58,700 words; 4 sections.
- Source: https://www.hindawi.org/books/26183813/
- Attribution: «الرحلة إلى أمريكا» (author: محمد لبيب البتنوني). Hindawi Foundation edition, https://www.hindawi.org/books/26183813/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### رحلة الأندلس
- Author(s): محمد لبيب البتنوني
- Translator(s): not specified
- Category: أدب الرحلات (travel.literature)
- Length: 39,412 words; 14 sections.
- Source: https://www.hindawi.org/books/36319075/
- Attribution: «رحلة الأندلس» (author: محمد لبيب البتنوني). Hindawi Foundation edition, https://www.hindawi.org/books/36319075/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

### حضارة الإسلام في دار السلام
- Author(s): جميل نخلة المدور
- Translator(s): not specified
- Category: أدب الرحلات (travel.literature)
- Length: 64,412 words; 12 sections.
- Source: https://www.hindawi.org/books/16093946/
- Attribution: «حضارة الإسلام في دار السلام» (author: جميل نخلة المدور). Hindawi Foundation edition, https://www.hindawi.org/books/16093946/. Publisher's colophon: original text in the public domain; book design CC BY 4.0. Via The Arabic E-Book Corpus (Andreas Hallberg, 2024, https://doi.org/10.5878/7rbh-gy93), CC BY 4.0. Split into chapters, footnotes separated and text normalised by Bayanat Labs.
- Colophon: جميع حقوق النشر الخاصة بتصميم هذا الكتاب وتصميم الغلاف مُرَخَّصة بموجب رخصة المشاع الإبداعي: نَسْبُ المُصنَّف، الإصدار ٤٫٠. جميع حقوق النشر الخاصة بنص العمل الأصلي خاضعة للملكية العامة.
- Rights: الملكية العامة — فحص مدة 70 سنة لحقوق المؤلفين والمساهمين

## Build summary

- Books: 24
- Sections: 529
- Words: 1,144,156
- JSON payload: 12.57 MiB before compression.
- Generated snapshot: 2026-11-04 (deterministic source snapshot)

## Limitations

- The publisher colophon and life+70 screen are evidence, not legal advice. Copyright terms differ by jurisdiction; verify before redistribution.
- Images, SVG figures and some tables are omitted; per-book omission counts are stored in each JSON file.
- The 95% word-count threshold and section-count checks detect incomplete extraction, not proofreading or textual accuracy.
