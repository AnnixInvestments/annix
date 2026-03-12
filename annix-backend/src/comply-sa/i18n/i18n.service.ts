import { Injectable } from "@nestjs/common";
import { af } from "./translations/af";
import { en } from "./translations/en";
import { zu } from "./translations/zu";

interface SupportedLanguage {
  code: string;
  name: string;
  active: boolean;
}

const translationMaps: Record<string, Record<string, string>> = {
  en,
  af,
  zu,
};

@Injectable()
export class ComplySaI18nService {
  supportedLanguages(): SupportedLanguage[] {
    return [
      { code: "en", name: "English", active: true },
      { code: "af", name: "Afrikaans", active: true },
      { code: "zu", name: "isiZulu", active: true },
    ];
  }

  translate(key: string, lang: string): string {
    const langMap = translationMaps[lang];
    if (langMap && langMap[key] !== undefined) {
      return langMap[key];
    }

    const englishValue = translationMaps["en"][key];
    if (englishValue !== undefined) {
      return englishValue;
    }

    return key;
  }
}
