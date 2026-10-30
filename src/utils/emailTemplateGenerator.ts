import { BookProject, BookChapter } from '../types/hukm';
import { HUKM_LOGO, HUKM_MOTTO, DEFAULT_CREATOR } from '../data/hukmData';

export function getHukmEmailHeader(): string {
  return `
    <!-- HUKM BRAND HEADER -->
    <tr>
      <td align="center" style="padding: 40px 20px 24px 20px; background: linear-gradient(180deg, #050914 0%, #070d1e 100%); border-bottom: 2px solid #c59b27;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="max-width: 520px; width: 100%;">
          <tr>
            <td align="center">
              <div style="display: inline-block; overflow: hidden; border: 2px solid rgba(197, 155, 39, 0.65); border-radius: 18px; background-color: #050a16; box-shadow: 0 8px 24px rgba(0,0,0,0.6);">
                <img src="${HUKM_LOGO}" alt="حُكم | HUKM MEDIA" width="80" height="80" style="display: block; border-radius: 16px; object-fit: cover;" />
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 14px;">
              <h1 style="margin: 0; font-family: 'Cairo', 'Amiri', Tahoma, sans-serif; font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; line-height: 1.3;">
                حُكم <span style="color: #c59b27; font-size: 18px; font-weight: 700; border-right: 1.5px solid rgba(197, 155, 39, 0.5); padding-right: 8px; margin-right: 6px;">HUKM MEDIA</span>
              </h1>
              <p style="margin: 6px 0 0 0; font-family: 'Cairo', 'Amiri', Tahoma, sans-serif; font-size: 13px; color: #f0cb69; font-weight: 600; letter-spacing: 0.5px;">
                ${HUKM_MOTTO}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

export function getHukmEmailFooter(userEmail?: string): string {
  return `
    <!-- HUKM BRAND FOOTER -->
    <tr>
      <td style="padding: 32px 24px; background-color: #050a16; border-top: 1px solid rgba(197, 155, 39, 0.2); text-align: center;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
          <tr>
            <td align="center" style="padding-bottom: 16px;">
              <p style="margin: 0 0 10px 0; font-family: 'Cairo', Tahoma, sans-serif; font-size: 12px; font-weight: bold; color: #cbd5e1;">
                مشاريع منصة حُكم على وسائل التواصل الاجتماعي
              </p>
              <div style="display: inline-block;">
                <a href="https://youtube.com/@hukmmedia" target="_blank" style="display: inline-block; margin: 0 5px; padding: 6px 14px; border-radius: 8px; background-color: #0d172e; color: #f0cb69; text-decoration: none; font-family: 'Cairo', Tahoma, sans-serif; font-size: 11px; font-weight: bold; border: 1px solid rgba(197,155,39,0.3);">
                  ▶️ يوتيوب
                </a>
                <a href="https://x.com/hukmmedia" target="_blank" style="display: inline-block; margin: 0 5px; padding: 6px 14px; border-radius: 8px; background-color: #0d172e; color: #f0cb69; text-decoration: none; font-family: 'Cairo', Tahoma, sans-serif; font-size: 11px; font-weight: bold; border: 1px solid rgba(197,155,39,0.3);">
                  𝕏 ثريدات وتغطيات
                </a>
                <a href="https://instagram.com/hukmmedia" target="_blank" style="display: inline-block; margin: 0 5px; padding: 6px 14px; border-radius: 8px; background-color: #0d172e; color: #f0cb69; text-decoration: none; font-family: 'Cairo', Tahoma, sans-serif; font-size: 11px; font-weight: bold; border: 1px solid rgba(197,155,39,0.3);">
                  📷 إنستغرام
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06);">
              <p style="margin: 0; font-family: 'Cairo', Tahoma, sans-serif; font-size: 11px; color: #64748b; line-height: 1.8;">
                تصلك هذه الرسالة التلقائية لأنك مسجل ومعتمد في منصة <strong>حُكم | HUKM MEDIA</strong>.<br/>
                ${userEmail ? `تم الإرسال إلى: <span style="color: #cbd5e1;">${userEmail}</span> | ` : ''}
                الناشر الرسمي والمؤسس: <strong style="color: #f0cb69;">${DEFAULT_CREATOR.name}</strong>
              </p>
              <p style="margin: 8px 0 0 0; font-family: 'Cairo', Tahoma, sans-serif; font-size: 10px; color: #475569;">
                © ${new Date().getFullYear()} حُكم HUKM MEDIA — جميع حقوق التوثيق والاستقصاء محفوظة.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

/**
 * Generate Welcome Email HTML for new signups
 */
export function generateWelcomeEmailHtml(userName: string, userEmail: string): string {
  const safeName = userName || 'قارئنا الكريم';
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>أهلاً بك في منصة حُكم | HUKM MEDIA</title>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: 'Cairo', Tahoma, sans-serif; direction: rtl; text-align: right; -webkit-font-smoothing: antialiased;">
  <center style="width: 100%; background-color: #030712; padding: 24px 0;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="max-width: 620px; width: 100%; margin: 0 auto; background-color: #0a1226; border-radius: 24px; overflow: hidden; border: 1.5px solid #c59b27; box-shadow: 0 20px 50px rgba(0,0,0,0.85);">
      ${getHukmEmailHeader()}

      <!-- CONTENT BODY -->
      <tr>
        <td style="padding: 36px 30px; background-color: #0a1226;">
          <!-- Welcome Salutation -->
          <div style="border-right: 4px solid #c59b27; padding-right: 14px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; color: #f0cb69; font-weight: bold;">
              ✨ رسالة ترحيب رسمية من فريق التحرير
            </p>
            <h2 style="margin: 4px 0 0 0; font-size: 22px; font-weight: 900; color: #ffffff;">
              مرحباً بك يا ${safeName}، في محراب البحث والتوثيق
            </h2>
          </div>

          <p style="font-size: 14px; line-height: 1.9; color: #cbd5e1; margin: 0 0 18px 0;">
            يسرّنا انضمامك إلى مجتمع قراء <strong>حُكم MEDIA</strong>. تم تفعيل حسابك واشتراكك التلقائي بنجاح لتصلك كل الفصول الاستقصائية، الكتب المحققة، والحلقات المفرقة بمجرد نشرها.
          </p>

          <!-- Golden Quote Card -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin: 24px 0; background: linear-gradient(135deg, #0e1935 0%, #162752 100%); border-radius: 16px; border: 1px solid rgba(197, 155, 39, 0.4);">
            <tr>
              <td style="padding: 22px 20px; text-align: center;">
                <span style="font-size: 24px; color: #c59b27; display: block; margin-bottom: 6px;">«</span>
                <p style="margin: 0; font-family: 'Amiri', serif; font-size: 18px; line-height: 1.7; font-weight: 700; color: #f0cb69;">
                  وعشان الموضوع مش زي ما إنت فاكر… تعالى نعرف.
                </p>
                <span style="display: block; margin-top: 10px; font-size: 11px; color: #94a3b8; font-family: 'Cairo', sans-serif;">
                  — المنهج الاستقصائي لحُكم | إبراهيم فوزي
                </span>
              </td>
            </tr>
          </table>

          <!-- What you get section -->
          <div style="background-color: #070d1e; border-radius: 14px; padding: 20px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 26px;">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: bold; color: #f0cb69;">
              ماذا ينتظرك كقارئ معتمد في حُكم؟
            </h3>
            <ul style="margin: 0; padding: 0 18px 0 0; font-size: 13px; color: #cbd5e1; line-height: 2;">
              <li>📚 <strong>وصول غير محدود:</strong> قراءة كامل فصول الكتب الاستقصائية وتتبع المراجع والوثائق.</li>
              <li>⚡ <strong>تنبيهات فورية:</strong> إشعار بريدي تلقائي لكل فصل أو وثائقي ينشره إبراهيم فوزي.</li>
              <li>🎬 <strong>حلقات مفرقة:</strong> ربط مباشر بين فصول الكتاب والحلقات المنشورة على اليوتيوب وX.</li>
              <li>🔖 <strong>حفظ المفضلة والمراجع:</strong> مزامنة مواضع القراءة واقتباسات السوشيال ميديا.</li>
            </ul>
          </div>

          <!-- CTA Button -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td align="center" style="border-radius: 14px; background: linear-gradient(135deg, #d4af37 0%, #c59b27 50%, #997314 100%); box-shadow: 0 8px 24px rgba(197, 155, 39, 0.35);">
                <a href="https://hukm.media" target="_blank" style="display: inline-block; padding: 14px 34px; font-family: 'Cairo', sans-serif; font-size: 14px; font-weight: 900; color: #070d1e; text-decoration: none; border-radius: 14px;">
                  📖 تصفح مكتبة حُكم الآن
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${getHukmEmailFooter(userEmail)}
    </table>
  </center>
</body>
</html>`;
}

/**
 * Generate Release Announcement Email HTML when owner posts a new book or chapter
 */
export function generateNewReleaseEmailHtml(
  book: BookProject,
  chapter?: BookChapter,
  subscriberName?: string
): string {
  const safeName = subscriberName || 'عزيزنا القارئ';
  const isChapterRelease = !!chapter;
  const releaseTitle = isChapterRelease
    ? `فصل جديد: ${chapter.title}`
    : `كتاب استقصائي جديد: ${book.title}`;

  const hasEpisode = book.standaloneEpisode?.hasStandaloneEpisode;
  const episodeUrl = book.standaloneEpisode?.videoUrl || book.socialLinks?.youtubeUrl;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${releaseTitle} | حُكم HUKM MEDIA</title>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: 'Cairo', Tahoma, sans-serif; direction: rtl; text-align: right; -webkit-font-smoothing: antialiased;">
  <center style="width: 100%; background-color: #030712; padding: 24px 0;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="max-width: 620px; width: 100%; margin: 0 auto; background-color: #0a1226; border-radius: 24px; overflow: hidden; border: 1.5px solid #c59b27; box-shadow: 0 20px 50px rgba(0,0,0,0.85);">
      ${getHukmEmailHeader()}

      <!-- CONTENT BODY -->
      <tr>
        <td style="padding: 34px 28px; background-color: #0a1226;">
          <!-- Badge -->
          <div style="margin-bottom: 14px;">
            <span style="display: inline-block; padding: 4px 12px; border-radius: 8px; background-color: rgba(197, 155, 39, 0.2); border: 1px solid rgba(197, 155, 39, 0.5); color: #f0cb69; font-size: 11px; font-weight: 800;">
              ${isChapterRelease ? '📖 صدور فصل استقصائي جديد' : '🏛️ إصدار كتاب جديد في الأرشيف'}
            </span>
            ${hasEpisode ? `
            <span style="display: inline-block; margin-right: 6px; padding: 4px 12px; border-radius: 8px; background-color: rgba(225, 29, 72, 0.2); border: 1px solid rgba(225, 29, 72, 0.5); color: #fda4af; font-size: 11px; font-weight: 800;">
              🎬 حلقة مفرقة مرافقة
            </span>` : ''}
          </div>

          <h2 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 900; color: #ffffff; line-height: 1.4;">
            ${releaseTitle}
          </h2>
          <p style="margin: 0 0 20px 0; font-size: 13px; color: #d4af37; font-weight: 600;">
            من مشروع: ${book.title}
          </p>

          <p style="font-size: 14px; line-height: 1.9; color: #cbd5e1; margin: 0 0 20px 0;">
            مرحباً ${safeName}، نضع بين يديك هذا البحث الاستقصائي المحقق كجزء من سلسلة <strong>حُكم MEDIA</strong> لفك أسرار وخبايا هذا الموضوع بالوثائق والمصادر العلمية.
          </p>

          <!-- Book Feature Banner -->
          <div style="border-radius: 16px; overflow: hidden; border: 1px solid rgba(197, 155, 39, 0.35); background-color: #070d1e; margin-bottom: 24px;">
            ${book.coverImage ? `
            <img src="${book.coverImage}" alt="${book.title}" width="100%" style="display: block; max-height: 240px; object-fit: cover;" />
            ` : ''}
            <div style="padding: 18px;">
              <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 800; color: #ffffff;">
                ${book.title}
              </h3>
              <p style="margin: 0; font-size: 12px; line-height: 1.7; color: #94a3b8;">
                ${chapter?.subtitle || book.subtitle || book.summary}
              </p>
            </div>
          </div>

          <!-- Standalone Episode Highlight if configured -->
          ${hasEpisode ? `
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px; background: rgba(225, 29, 72, 0.1); border-radius: 14px; border: 1px solid rgba(225, 29, 72, 0.35);">
            <tr>
              <td style="padding: 16px 18px;">
                <span style="font-size: 12px; font-weight: 900; color: #fda4af; display: block; margin-bottom: 4px;">
                  🎬 تنويه: تم تخصيص حلقة مفرقة ومستقلة لهذا الموضوع
                </span>
                <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.6;">
                  ${book.standaloneEpisode?.description || 'يمكنك مشاهدة الحلقة الوثائقية كاملة بجودة عالية بالتزامن مع قراءة فصول الكتاب.'}
                </p>
                ${episodeUrl ? `
                <div style="margin-top: 10px;">
                  <a href="${episodeUrl}" target="_blank" style="display: inline-block; padding: 6px 14px; background-color: #e11d48; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 11px; font-weight: bold;">
                    ▶️ مشاهدة الحلقة المفرقة الآن
                  </a>
                </div>` : ''}
              </td>
            </tr>
          </table>` : ''}

          <!-- Action CTA -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 10px auto 10px auto;">
            <tr>
              <td align="center" style="border-radius: 14px; background: linear-gradient(135deg, #d4af37 0%, #c59b27 50%, #997314 100%); box-shadow: 0 8px 24px rgba(197, 155, 39, 0.35);">
                <a href="https://hukm.media?book=${book.id}" target="_blank" style="display: inline-block; padding: 14px 34px; font-family: 'Cairo', sans-serif; font-size: 14px; font-weight: 900; color: #070d1e; text-decoration: none; border-radius: 14px;">
                  📖 بدء قراءة الإصدار الآن
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${getHukmEmailFooter()}
    </table>
  </center>
</body>
</html>`;
}

/**
 * Generate Custom Broadcast Email HTML from Owner
 */
export function generateCustomBroadcastEmailHtml(
  subject: string,
  bodyContent: string,
  actionUrl: string = 'https://hukm.media',
  actionLabel: string = 'زيارة منصة حُكم'
): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject} | حُكم HUKM MEDIA</title>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: 'Cairo', Tahoma, sans-serif; direction: rtl; text-align: right; -webkit-font-smoothing: antialiased;">
  <center style="width: 100%; background-color: #030712; padding: 24px 0;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="max-width: 620px; width: 100%; margin: 0 auto; background-color: #0a1226; border-radius: 24px; overflow: hidden; border: 1.5px solid #c59b27; box-shadow: 0 20px 50px rgba(0,0,0,0.85);">
      ${getHukmEmailHeader()}

      <!-- CONTENT BODY -->
      <tr>
        <td style="padding: 34px 28px; background-color: #0a1226;">
          <div style="border-right: 4px solid #c59b27; padding-right: 14px; margin-bottom: 20px;">
            <span style="font-size: 12px; color: #f0cb69; font-weight: bold; display: block;">
              📢 بيان وتنويه رسمي للمشتركين
            </span>
            <h2 style="margin: 4px 0 0 0; font-size: 21px; font-weight: 900; color: #ffffff; line-height: 1.4;">
              ${subject}
            </h2>
          </div>

          <div style="font-size: 14px; line-height: 1.9; color: #cbd5e1; margin: 0 0 24px 0; white-space: pre-line;">
            ${bodyContent}
          </div>

          <!-- CTA Button -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 10px auto;">
            <tr>
              <td align="center" style="border-radius: 14px; background: linear-gradient(135deg, #d4af37 0%, #c59b27 50%, #997314 100%); box-shadow: 0 8px 24px rgba(197, 155, 39, 0.35);">
                <a href="${actionUrl}" target="_blank" style="display: inline-block; padding: 14px 34px; font-family: 'Cairo', sans-serif; font-size: 14px; font-weight: 900; color: #070d1e; text-decoration: none; border-radius: 14px;">
                  ${actionLabel}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${getHukmEmailFooter()}
    </table>
  </center>
</body>
</html>`;
}
