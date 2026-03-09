const RTL_LANGUAGES = ["ar", "fa", "he"] as const;

export type TemplateLanguage = "en" | (typeof RTL_LANGUAGES)[number];

export const CURRENT_LANGUAGE: TemplateLanguage = "en";

const ui = {
  en: {
    metadataTitle: "bejamas/ui Astro project",
    welcomeMessage: "Welcome to {project} Astro project.",
    getStartedMessage: "Get started by editing src/pages/index.astro.",
    readDocs: "Read docs",
    getCustomDemo: "Get custom demo",
  },
  ar: {
    metadataTitle: "مشروع Astro من bejamas/ui",
    welcomeMessage: "مرحبًا بك في مشروع Astro الخاص بـ {project}.",
    getStartedMessage: "ابدأ بتحرير src/pages/index.astro.",
    readDocs: "اقرأ التوثيق",
    getCustomDemo: "احصل على عرض توضيحي مخصص",
  },
  fa: {
    metadataTitle: "پروژه Astro با bejamas/ui",
    welcomeMessage: "به پروژه Astro با {project} خوش آمدید.",
    getStartedMessage: "برای شروع src/pages/index.astro را ویرایش کنید.",
    readDocs: "مطالعه مستندات",
    getCustomDemo: "درخواست دموی سفارشی",
  },
  he: {
    metadataTitle: "פרויקט Astro עם bejamas/ui",
    welcomeMessage: "ברוכים הבאים לפרויקט Astro של {project}.",
    getStartedMessage: "התחילו בעריכת src/pages/index.astro.",
    readDocs: "קריאת התיעוד",
    getCustomDemo: "קבלת דמו מותאם",
  },
} as const satisfies Record<TemplateLanguage, Record<string, string>>;

export const appUi = {
  lang: CURRENT_LANGUAGE,
  dir: RTL_LANGUAGES.includes(
    CURRENT_LANGUAGE as (typeof RTL_LANGUAGES)[number],
  )
    ? "rtl"
    : "ltr",
  ...ui[CURRENT_LANGUAGE],
};
