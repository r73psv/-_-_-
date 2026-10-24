import { YclientsConfig, YclientsDateRange, YclientsSyncResponse } from '../types';

const STORAGE_KEY_YCLIENTS_CONFIG = 'salon_yclients_config';

export function loadYclientsConfig(): YclientsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_YCLIENTS_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          companyId: parsed.companyId || '',
          partnerToken: parsed.partnerToken || '',
          userToken: parsed.userToken || '',
          saveInBrowser: true
        };
      }
    }
  } catch (e) {
    console.error('Failed to load Yclients config from localStorage', e);
  }

  return {
    companyId: '',
    partnerToken: '',
    userToken: '',
    saveInBrowser: true
  };
}

export function saveYclientsConfig(config: YclientsConfig): void {
  try {
    if (config.saveInBrowser !== false) {
      localStorage.setItem(STORAGE_KEY_YCLIENTS_CONFIG, JSON.stringify({
        companyId: config.companyId,
        partnerToken: config.partnerToken,
        userToken: config.userToken
      }));
    } else {
      localStorage.removeItem(STORAGE_KEY_YCLIENTS_CONFIG);
    }
  } catch (e) {
    console.error('Failed to save Yclients config to localStorage', e);
  }
}

export function clearSavedYclientsConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_YCLIENTS_CONFIG);
  } catch (e) {
    console.error('Failed to clear Yclients config', e);
  }
}

// Format Date object to YYYY-MM-DD
export function formatIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Preset date ranges for quick selection
export interface PeriodPreset {
  id: string;
  label: string;
  shortLabel: string;
  getRange: () => { startDate: string; endDate: string };
}

export const PERIOD_PRESETS: PeriodPreset[] = [
  {
    id: 'current_month',
    label: 'Текущий месяц',
    shortLabel: 'Этот месяц',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: formatIsoDate(start), endDate: formatIsoDate(end) };
    }
  },
  {
    id: 'prev_month',
    label: 'Прошлый месяц',
    shortLabel: 'Прошлый месяц',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: formatIsoDate(start), endDate: formatIsoDate(end) };
    }
  },
  {
    id: 'last_30_days',
    label: 'Последние 30 дней',
    shortLabel: '30 дней',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      return { startDate: formatIsoDate(start), endDate: formatIsoDate(end) };
    }
  },
  {
    id: 'current_week',
    label: 'Текущая неделя',
    shortLabel: 'Эта неделя',
    getRange: () => {
      const now = new Date();
      const day = now.getDay() || 7; // Monday = 1
      const start = new Date(now);
      start.setDate(now.getDate() - day + 1);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { startDate: formatIsoDate(start), endDate: formatIsoDate(end) };
    }
  },
  {
    id: 'prev_week',
    label: 'Прошлая неделя',
    shortLabel: 'Прошлая неделя',
    getRange: () => {
      const now = new Date();
      const day = now.getDay() || 7;
      const start = new Date(now);
      start.setDate(now.getDate() - day - 6);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { startDate: formatIsoDate(start), endDate: formatIsoDate(end) };
    }
  },
  {
    id: 'current_quarter',
    label: 'Текущий квартал',
    shortLabel: 'Квартал',
    getRange: () => {
      const now = new Date();
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1);
      const end = new Date(now.getFullYear(), qMonth + 3, 0);
      return { startDate: formatIsoDate(start), endDate: formatIsoDate(end) };
    }
  },
  {
    id: 'current_year',
    label: 'Текущий год',
    shortLabel: 'Год',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { startDate: formatIsoDate(start), endDate: formatIsoDate(end) };
    }
  }
];

export async function testYclientsConnection(config: YclientsConfig): Promise<{
  success: boolean;
  message: string;
  isDemo?: boolean;
  company?: { id: number | string; title: string; city?: string; timezone?: string; currency_short_title?: string };
}> {
  try {
    const response = await fetch('/api/yclients/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        companyId: config.companyId,
        partnerToken: config.partnerToken,
        userToken: config.userToken
      })
    });

    const data = await response.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: `Ошибка отправки запроса к серверу: ${err.message || 'Проверьте сетевое подключение'}`
    };
  }
}

export async function fetchYclientsData(params: {
  config: YclientsConfig;
  startDate: string;
  endDate: string;
  syncTransactions?: boolean;
  syncServices?: boolean;
  useDemo?: boolean;
}): Promise<YclientsSyncResponse> {
  const {
    config,
    startDate,
    endDate,
    syncTransactions = true,
    syncServices = true,
    useDemo = false
  } = params;

  try {
    const response = await fetch('/api/yclients/fetch-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        companyId: config.companyId,
        partnerToken: config.partnerToken,
        userToken: config.userToken,
        startDate,
        endDate,
        syncTransactions,
        syncServices,
        useDemo
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || `Сервер вернул статус HTTP ${response.status}`);
    }

    const data: YclientsSyncResponse = await response.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Не удалось получить данные из Yclients',
      records: [],
      services: []
    };
  }
}
