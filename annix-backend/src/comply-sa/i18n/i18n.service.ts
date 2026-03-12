import { Injectable } from "@nestjs/common";

interface SupportedLanguage {
  code: string;
  name: string;
  active: boolean;
}

@Injectable()
export class ComplySaI18nService {
  supportedLanguages(): SupportedLanguage[] {
    return [
      { code: "en", name: "English", active: true },
      { code: "af", name: "Afrikaans", active: false },
      { code: "zu", name: "isiZulu", active: false },
    ];
  }

  translate(key: string, _lang: string): string {
    return key;
  }
}
