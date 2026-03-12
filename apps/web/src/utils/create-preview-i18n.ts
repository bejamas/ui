import type { AppLanguageValue } from "@bejamas/create-config/browser";

export const CREATE_PREVIEW_FALLBACK_LANGUAGE = "en" as const;

export const CREATE_PREVIEW_TRANSLATIONS = {
  en: {
    "hero.title":
      "Ship an Astro design system without hand-tuning every token.",
    "hero.description":
      "Preview a style preset, confirm the form controls, and copy the init command.",
    "overview.title": "Style overview",
    "overview.description":
      "Preview the core theme tokens without relying on chart-only variables.",
    "icons.title": "Card with icons",
    "icons.description":
      "The active icon library should stay consistent across compact surfaces.",
    "form.projectName": "Project name",
    "form.feedback": "Feedback",
    "form.feedbackPlaceholder": "A compact create flow with sane defaults.",
    "form.region": "Region",
    "form.regionPlaceholder": "Europe / Warsaw",
    "form.regionEu": "Europe / Warsaw",
    "form.regionUs": "United States / New York",
    "form.regionApac": "Asia Pacific / Tokyo",
    "form.regionDescription":
      "Match the preview workspace to the team's operating region.",
    "form.emailDigests": "Email digests",
    "form.emailDigestsDescription":
      "Weekly product updates and component release notes.",
    "form.releaseNotes": "Keep release notes pinned",
    "form.releaseNotesDescription":
      "Highlight important changes for the workspace after deploys.",
    "team.name": "Design System Team",
    "team.reviewers": "3 reviewers online",
    "actions.previewDocs": "Preview docs",
    "actions.createProject": "Create project",
    "quickActions.title": "Quick actions",
    "quickActions.description":
      "Check the shape of compact interactive components.",
    "quickActions.tabOverview": "Overview",
    "quickActions.tabActivity": "Activity",
    "quickActions.notificationsEnabled": "Notifications enabled",
    "quickActions.notificationsDescription":
      "Product updates and component releases.",
    "quickActions.weeklyReview": "Weekly review",
    "quickActions.weeklyReviewTime": "Thursday at 13:00 CET",
    "quickActions.registrySynced": "Registry synced",
    "quickActions.registrySyncedDescription": "Styles and docs are in sync.",
    "quickActions.menuSurface": "Menu surface",
    "quickActions.menuSurfaceDescription":
      "Accent and inversion should be obvious here.",
    "quickActions.activeMenuItem": "Active menu item",
    "quickActions.secondaryAction": "Secondary action",
    "quickActions.billingPortal": "Open billing portal",
    "structured.title": "Structured content",
    "structured.description":
      "Accordion, popovers, and grouped items should all pick up the same style language.",
    "structured.accordionInstallQuestion":
      "How does the preset affect the install flow?",
    "structured.accordionInstallAnswer":
      "The init command writes style, base color, RTL, and component defaults into the generated project.",
    "structured.accordionComponentsQuestion":
      "Can I still add components later?",
    "structured.accordionComponentsAnswer":
      "Yes. The registry stays style-aware, so later installs keep matching the preset.",
    "structured.billingSummary": "Billing summary",
    "structured.currentPlan": "Current plan",
    "structured.currentPlanDescription":
      "Starter workspace, 3 seats, monthly billing.",
    "structured.cardRequired": "Card required",
    "structured.cardRequiredTooltip":
      "Connect billing before enabling production usage.",
    "people.title": "People",
    "people.description":
      "Avatar, badge, and item density all stay consistent.",
    "people.teamName": "Astro Platform Team",
    "people.teamRole": "Registry maintainers",
    "people.coreBadge": "Core",
    "people.releaseManager": "Release manager",
    "people.releaseManagerDescription": "Last published 18 minutes ago.",
    "people.developerExperience": "Developer experience",
    "people.developerExperienceDescription": "Owns the CLI and docs pipeline.",
  },
  ar: {
    "hero.title": "أنشئ نظام تصميم Astro من دون ضبط يدوي لكل رمز تصميم.",
    "hero.description":
      "عاين النمط، وتحقق من عناصر النموذج، ثم انسخ أمر التهيئة.",
    "overview.title": "نظرة عامة على النمط",
    "overview.description":
      "عاين رموز المظهر الأساسية من دون الاعتماد على متغيرات المخططات.",
    "icons.title": "بطاقة مع أيقونات",
    "icons.description":
      "يجب أن تبقى مكتبة الأيقونات النشطة متسقة عبر الأسطح المدمجة.",
    "form.projectName": "اسم المشروع",
    "form.feedback": "ملاحظات",
    "form.feedbackPlaceholder": "واجهة إنشاء مختصرة بإعدادات افتراضية مناسبة.",
    "form.region": "المنطقة",
    "form.regionPlaceholder": "أوروبا / وارسو",
    "form.regionEu": "أوروبا / وارسو",
    "form.regionUs": "الولايات المتحدة / نيويورك",
    "form.regionApac": "آسيا والمحيط الهادئ / طوكيو",
    "form.regionDescription": "طابق مساحة العمل التجريبية مع منطقة عمل الفريق.",
    "form.emailDigests": "ملخصات البريد الإلكتروني",
    "form.emailDigestsDescription":
      "تحديثات أسبوعية للمنتج وملاحظات إصدار المكونات.",
    "form.releaseNotes": "أبقِ ملاحظات الإصدار مثبتة",
    "form.releaseNotesDescription":
      "أبرز التغييرات المهمة لمساحة العمل بعد عمليات النشر.",
    "team.name": "فريق نظام التصميم",
    "team.reviewers": "3 مراجعين متصلين",
    "actions.previewDocs": "معاينة التوثيق",
    "actions.createProject": "إنشاء مشروع",
    "quickActions.title": "إجراءات سريعة",
    "quickActions.description": "تحقق من شكل المكونات التفاعلية المدمجة.",
    "quickActions.tabOverview": "نظرة عامة",
    "quickActions.tabActivity": "النشاط",
    "quickActions.notificationsEnabled": "الإشعارات مفعلة",
    "quickActions.notificationsDescription":
      "تحديثات المنتج وإصدارات المكونات.",
    "quickActions.weeklyReview": "المراجعة الأسبوعية",
    "quickActions.weeklyReviewTime": "الخميس عند 13:00 CET",
    "quickActions.registrySynced": "تمت مزامنة السجل",
    "quickActions.registrySyncedDescription": "الأنماط والتوثيق متزامنان.",
    "quickActions.menuSurface": "سطح القائمة",
    "quickActions.menuSurfaceDescription":
      "يجب أن يكون التمييز والعكس واضحين هنا.",
    "quickActions.activeMenuItem": "عنصر القائمة النشط",
    "quickActions.secondaryAction": "إجراء ثانوي",
    "quickActions.billingPortal": "فتح بوابة الفوترة",
    "structured.title": "محتوى منظم",
    "structured.description":
      "يجب أن تلتقط الأكورديونات والنوافذ المنبثقة والعناصر المجمعة اللغة البصرية نفسها.",
    "structured.accordionInstallQuestion":
      "كيف يؤثر الإعداد المسبق في التثبيت؟",
    "structured.accordionInstallAnswer":
      "يكتب أمر التهيئة النمط واللون الأساسي وRTL وإعدادات المكونات الافتراضية داخل المشروع الناتج.",
    "structured.accordionComponentsQuestion": "هل يمكنني إضافة مكونات لاحقًا؟",
    "structured.accordionComponentsAnswer":
      "نعم. يظل السجل واعيًا للنمط، لذلك تستمر الإضافات اللاحقة في مطابقة الإعداد المسبق.",
    "structured.billingSummary": "ملخص الفوترة",
    "structured.currentPlan": "الخطة الحالية",
    "structured.currentPlanDescription":
      "مساحة عمل ابتدائية، 3 مقاعد، فوترة شهرية.",
    "structured.cardRequired": "البطاقة مطلوبة",
    "structured.cardRequiredTooltip":
      "اربط الفوترة قبل تفعيل الاستخدام الإنتاجي.",
    "people.title": "الأشخاص",
    "people.description": "تبقى كثافة الصور الرمزية والشارات والعناصر متسقة.",
    "people.teamName": "فريق منصة Astro",
    "people.teamRole": "مشرفو السجل",
    "people.coreBadge": "أساسي",
    "people.releaseManager": "مدير الإصدار",
    "people.releaseManagerDescription": "نُشر آخر إصدار قبل 18 دقيقة.",
    "people.developerExperience": "تجربة المطور",
    "people.developerExperienceDescription": "يمتلك واجهة CLI ومسار التوثيق.",
  },
  fa: {
    "hero.title":
      "یک سیستم طراحی Astro را بدون تنظیم دستی تک‌تک توکن‌ها منتشر کنید.",
    "hero.description":
      "یک استایل آماده را پیش‌نمایش کنید، فرم‌ها را بررسی کنید و دستور راه‌اندازی را کپی کنید.",
    "overview.title": "نمای کلی استایل",
    "overview.description":
      "توکن‌های اصلی تم را بدون تکیه بر متغیرهای مربوط به نمودارها بررسی کنید.",
    "icons.title": "کارت با آیکون‌ها",
    "icons.description":
      "کتابخانه آیکون فعال باید در سطوح فشرده یکدست باقی بماند.",
    "form.projectName": "نام پروژه",
    "form.feedback": "بازخورد",
    "form.feedbackPlaceholder": "جریان ساخت جمع‌وجور با پیش‌فرض‌های منطقی.",
    "form.region": "منطقه",
    "form.regionPlaceholder": "اروپا / ورشو",
    "form.regionEu": "اروپا / ورشو",
    "form.regionUs": "ایالات متحده / نیویورک",
    "form.regionApac": "آسیا اقیانوسیه / توکیو",
    "form.regionDescription":
      "فضای پیش‌نمایش را با منطقه کاری تیم هماهنگ کنید.",
    "form.emailDigests": "خلاصه‌های ایمیلی",
    "form.emailDigestsDescription":
      "به‌روزرسانی هفتگی محصول و یادداشت انتشار کامپوننت‌ها.",
    "form.releaseNotes": "یادداشت‌های انتشار را سنجاق کن",
    "form.releaseNotesDescription":
      "تغییرات مهم را بعد از انتشار برای فضای کار برجسته کن.",
    "team.name": "تیم سیستم طراحی",
    "team.reviewers": "۳ بازبین آنلاین",
    "actions.previewDocs": "پیش‌نمایش مستندات",
    "actions.createProject": "ایجاد پروژه",
    "quickActions.title": "اقدام‌های سریع",
    "quickActions.description":
      "فرم کلی کامپوننت‌های تعاملی فشرده را بررسی کنید.",
    "quickActions.tabOverview": "نمای کلی",
    "quickActions.tabActivity": "فعالیت",
    "quickActions.notificationsEnabled": "اعلان‌ها فعال هستند",
    "quickActions.notificationsDescription":
      "به‌روزرسانی‌های محصول و انتشار کامپوننت‌ها.",
    "quickActions.weeklyReview": "مرور هفتگی",
    "quickActions.weeklyReviewTime": "پنج‌شنبه ساعت ۱۳:۰۰ CET",
    "quickActions.registrySynced": "رجیستری همگام شد",
    "quickActions.registrySyncedDescription":
      "استایل‌ها و مستندات هماهنگ هستند.",
    "quickActions.menuSurface": "سطح منو",
    "quickActions.menuSurfaceDescription":
      "تأکید و حالت وارونه باید اینجا واضح باشد.",
    "quickActions.activeMenuItem": "آیتم فعال منو",
    "quickActions.secondaryAction": "اقدام ثانویه",
    "quickActions.billingPortal": "باز کردن پرتال صورتحساب",
    "structured.title": "محتوای ساختاریافته",
    "structured.description":
      "آکاردئون‌ها، پاپ‌اورها و آیتم‌های گروه‌بندی‌شده باید همگی همان زبان بصری را بگیرند.",
    "structured.accordionInstallQuestion":
      "این پریست چه اثری روی جریان نصب دارد؟",
    "structured.accordionInstallAnswer":
      "دستور init استایل، رنگ پایه، RTL و پیش‌فرض‌های کامپوننت را در پروژه ایجادشده می‌نویسد.",
    "structured.accordionComponentsQuestion":
      "آیا بعداً هم می‌توانم کامپوننت اضافه کنم؟",
    "structured.accordionComponentsAnswer":
      "بله. رجیستری همچنان از استایل آگاه می‌ماند، بنابراین نصب‌های بعدی با پریست هماهنگ می‌مانند.",
    "structured.billingSummary": "خلاصه صورتحساب",
    "structured.currentPlan": "پلن فعلی",
    "structured.currentPlanDescription":
      "فضای کار Starter، ۳ صندلی، صورتحساب ماهانه.",
    "structured.cardRequired": "کارت لازم است",
    "structured.cardRequiredTooltip":
      "قبل از فعال کردن استفاده production، صورتحساب را متصل کنید.",
    "people.title": "افراد",
    "people.description": "تراکم آواتار، بج و آیتم‌ها یکدست باقی می‌ماند.",
    "people.teamName": "تیم پلتفرم Astro",
    "people.teamRole": "نگه‌دارندگان رجیستری",
    "people.coreBadge": "هسته",
    "people.releaseManager": "مدیر انتشار",
    "people.releaseManagerDescription": "آخرین انتشار ۱۸ دقیقه پیش انجام شد.",
    "people.developerExperience": "تجربه توسعه‌دهنده",
    "people.developerExperienceDescription": "مالک CLI و جریان مستندات است.",
  },
  he: {
    "hero.title": "השיקו מערכת עיצוב ל-Astro בלי לכוון ידנית כל טוקן.",
    "hero.description":
      "תצוגה מקדימה של סטייל מוכן, בדיקת טפסים והעתקת פקודת ההתקנה.",
    "overview.title": "סקירת סטייל",
    "overview.description":
      "תצוגה של טוקני העיצוב המרכזיים בלי להסתמך על משתני גרפים.",
    "icons.title": "כרטיס עם אייקונים",
    "icons.description":
      "ספריית האייקונים הפעילה צריכה להישאר עקבית בכל המשטחים הקומפקטיים.",
    "form.projectName": "שם הפרויקט",
    "form.feedback": "משוב",
    "form.feedbackPlaceholder": "זרימת יצירה קומפקטית עם ברירות מחדל הגיוניות.",
    "form.region": "אזור",
    "form.regionPlaceholder": "אירופה / ורשה",
    "form.regionEu": "אירופה / ורשה",
    "form.regionUs": "ארצות הברית / ניו יורק",
    "form.regionApac": "אסיה פסיפיק / טוקיו",
    "form.regionDescription":
      "התאימו את סביבת התצוגה המקדימה לאזור הפעילות של הצוות.",
    "form.emailDigests": "סיכומי אימייל",
    "form.emailDigestsDescription": "עדכוני מוצר שבועיים והערות שחרור לרכיבים.",
    "form.releaseNotes": "השאר הערות שחרור מוצמדות",
    "form.releaseNotesDescription":
      "הדגש שינויים חשובים בסביבת העבודה אחרי פריסות.",
    "team.name": "צוות מערכת העיצוב",
    "team.reviewers": "3 סוקרים מחוברים",
    "actions.previewDocs": "תצוגת תיעוד",
    "actions.createProject": "יצירת פרויקט",
    "quickActions.title": "פעולות מהירות",
    "quickActions.description":
      "בדקו את הצורה של רכיבים אינטראקטיביים קומפקטיים.",
    "quickActions.tabOverview": "סקירה",
    "quickActions.tabActivity": "פעילות",
    "quickActions.notificationsEnabled": "התראות פעילות",
    "quickActions.notificationsDescription": "עדכוני מוצר ושחרורי רכיבים.",
    "quickActions.weeklyReview": "סקירה שבועית",
    "quickActions.weeklyReviewTime": "יום חמישי ב-13:00 CET",
    "quickActions.registrySynced": "הרישום סונכרן",
    "quickActions.registrySyncedDescription": "הסגנונות והתיעוד מסונכרנים.",
    "quickActions.menuSurface": "משטח תפריט",
    "quickActions.menuSurfaceDescription":
      "ההדגשה וההיפוך צריכים להיות ברורים כאן.",
    "quickActions.activeMenuItem": "פריט תפריט פעיל",
    "quickActions.secondaryAction": "פעולה משנית",
    "quickActions.billingPortal": "פתיחת פורטל חיוב",
    "structured.title": "תוכן מובנה",
    "structured.description":
      "אקורדיונים, חלוניות קופצות ופריטים מקובצים צריכים כולם לאמץ את אותה שפה עיצובית.",
    "structured.accordionInstallQuestion":
      "איך ה-preset משפיע על תהליך ההתקנה?",
    "structured.accordionInstallAnswer":
      "פקודת init כותבת את הסטייל, צבע הבסיס, RTL וברירות המחדל של הרכיבים לתוך הפרויקט שנוצר.",
    "structured.accordionComponentsQuestion":
      "אפשר עדיין להוסיף רכיבים אחר כך?",
    "structured.accordionComponentsAnswer":
      "כן. הרישום נשאר מודע לסטייל, כך שהתקנות מאוחרות יותר ממשיכות להתאים ל-preset.",
    "structured.billingSummary": "סיכום חיוב",
    "structured.currentPlan": "התוכנית הנוכחית",
    "structured.currentPlanDescription":
      "סביבת Starter, שלושה מושבים, חיוב חודשי.",
    "structured.cardRequired": "נדרש כרטיס",
    "structured.cardRequiredTooltip": "חברו חיוב לפני הפעלת שימוש בפרודקשן.",
    "people.title": "אנשים",
    "people.description": "הצפיפות של אווטארים, תגיות ופריטים נשארת עקבית.",
    "people.teamName": "צוות פלטפורמת Astro",
    "people.teamRole": "מתחזקי הרישום",
    "people.coreBadge": "ליבה",
    "people.releaseManager": "מנהל שחרור",
    "people.releaseManagerDescription": "הפרסום האחרון היה לפני 18 דקות.",
    "people.developerExperience": "חוויית מפתחים",
    "people.developerExperienceDescription": "אחראי על ה-CLI ועל צינור התיעוד.",
  },
} as const satisfies Record<AppLanguageValue, Record<string, string>>;

export type CreatePreviewTextKey = keyof typeof CREATE_PREVIEW_TRANSLATIONS.en;
export type CreatePreviewCopy = Record<CreatePreviewTextKey, string>;

export function getCreatePreviewCopy(
  language: AppLanguageValue,
): CreatePreviewCopy {
  return (
    CREATE_PREVIEW_TRANSLATIONS[language] ??
    CREATE_PREVIEW_TRANSLATIONS[CREATE_PREVIEW_FALLBACK_LANGUAGE]
  );
}
