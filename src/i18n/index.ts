import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import esCommon from './locales/es/common.json';
import frCommon from './locales/fr/common.json';
import enCommon from './locales/en/common.json';
import esAuth from './locales/es/auth.json';
import frAuth from './locales/fr/auth.json';
import enAuth from './locales/en/auth.json';
import esCatalog from './locales/es/catalog.json';
import frCatalog from './locales/fr/catalog.json';
import enCatalog from './locales/en/catalog.json';
import esOrders from './locales/es/orders.json';
import frOrders from './locales/fr/orders.json';
import enOrders from './locales/en/orders.json';
import esNav from './locales/es/nav.json';
import frNav from './locales/fr/nav.json';
import enNav from './locales/en/nav.json';
import esAgent from './locales/es/agent.json';
import frAgent from './locales/fr/agent.json';
import enAgent from './locales/en/agent.json';
import esClient from './locales/es/client.json';
import frClient from './locales/fr/client.json';
import enClient from './locales/en/client.json';
import esAdmin from './locales/es/admin.json';
import frAdmin from './locales/fr/admin.json';
import enAdmin from './locales/en/admin.json';
import esValidation from './locales/es/validation.json';
import frValidation from './locales/fr/validation.json';
import enValidation from './locales/en/validation.json';

export const SUPPORTED_LANGUAGES = ['es', 'fr', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'es';

export function toSupportedLanguage(code: string | null | undefined): SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(code as SupportedLanguage)
    ? (code as SupportedLanguage)
    : DEFAULT_LANGUAGE;
}

function detectDeviceLanguage(): SupportedLanguage {
  const deviceLocale = Localization.getLocales()[0]?.languageCode;
  return toSupportedLanguage(deviceLocale);
}

i18next.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  lng: detectDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'common',
  ns: ['common', 'auth', 'catalog', 'orders', 'nav', 'agent', 'client', 'admin', 'validation'],
  resources: {
    es: { common: esCommon, auth: esAuth, catalog: esCatalog, orders: esOrders, nav: esNav, agent: esAgent, client: esClient, admin: esAdmin, validation: esValidation },
    fr: { common: frCommon, auth: frAuth, catalog: frCatalog, orders: frOrders, nav: frNav, agent: frAgent, client: frClient, admin: frAdmin, validation: frValidation },
    en: { common: enCommon, auth: enAuth, catalog: enCatalog, orders: enOrders, nav: enNav, agent: enAgent, client: enClient, admin: enAdmin, validation: enValidation },
  },
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18next;
