import { en } from './en';
import { zh } from './zh';

export type TranslationKey = keyof typeof en;

type Translations = { [K in TranslationKey]: string };

const translations: Record<string, Translations> = {
	en: en as Translations,
	zh: zh as Translations,
};

let currentLang = 'en';

export function setLanguage(lang: string): void {
	currentLang = lang;
}

export function t(key: TranslationKey, vars?: Record<string, string>): string {
	const langMap = translations[currentLang] ?? translations['en'];
	let str: string = langMap[key] ?? (translations['en'][key] as string) ?? key;
	if (vars) {
		for (const [k, v] of Object.entries(vars)) {
			str = str.replace(`{${k}}`, v);
		}
	}
	return str;
}
