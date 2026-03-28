import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

const localeAssetVersion = encodeURIComponent(__LOCALE_ASSET_VERSION__);

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "ko",
    supportedLngs: ["en", "ko"],
    ns: ["common", "auth", "capture", "persona"],
    defaultNS: "common",
    backend: {
      loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json?v=${localeAssetVersion}`
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "pm_lang",
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
