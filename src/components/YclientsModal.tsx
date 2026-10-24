import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  Building2, 
  SlidersHorizontal, 
  ArrowRight, 
  ShieldCheck, 
  HelpCircle, 
  DollarSign, 
  Scissors, 
  Sparkles, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Database,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  YclientsConfig, 
  YclientsSyncResponse, 
  RawRecord, 
  RawServiceRecord 
} from '../types';
import { 
  loadYclientsConfig, 
  saveYclientsConfig, 
  testYclientsConnection, 
  fetchYclientsData, 
  PERIOD_PRESETS, 
  formatIsoDate 
} from '../services/yclientsService';

interface YclientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (data: {
    records: RawRecord[];
    services: RawServiceRecord[];
    startDate: string;
    endDate: string;
    sourceTitle: string;
    isDemo?: boolean;
  }) => void;
  initialCutoffDate?: string;
}

export default function YclientsModal({
  isOpen,
  onClose,
  onDataLoaded,
  initialCutoffDate
}: YclientsModalProps) {
  // Configuration
  const [config, setConfig] = useState<YclientsConfig>(() => loadYclientsConfig());
  const [showPartnerToken, setShowPartnerToken] = useState<boolean>(false);
  const [showUserToken, setShowUserToken] = useState<boolean>(false);

  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    loading: boolean;
    success?: boolean;
    message?: string;
    companyTitle?: string;
    isDemo?: boolean;
  }>({ tested: false, loading: false });

  // Date Range Selection
  const [activePreset, setActivePreset] = useState<string>('current_month');
  const [startDate, setStartDate] = useState<string>(() => {
    const defaultRange = PERIOD_PRESETS[0].getRange();
    return defaultRange.startDate;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const defaultRange = PERIOD_PRESETS[0].getRange();
    return defaultRange.endDate;
  });

  // Data Options to Sync
  const [syncTransactions, setSyncTransactions] = useState<boolean>(true);
  const [syncServices, setSyncServices] = useState<boolean>(true);

  // Sync execution status
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgressStep, setSyncProgressStep] = useState<string>('');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccessResult, setSyncSuccessResult] = useState<YclientsSyncResponse | null>(null);

  // Guide accordion
  const [showApiGuide, setShowApiGuide] = useState<boolean>(false);

  // Initialize dates and config when modal opens
  useEffect(() => {
    if (isOpen) {
      const saved = loadYclientsConfig();
      setConfig(saved);
      setSyncError(null);
      setSyncSuccessResult(null);
    }
  }, [isOpen]);

  // Handle Preset click
  const handleSelectPreset = (presetId: string) => {
    setActivePreset(presetId);
    const found = PERIOD_PRESETS.find(p => p.id === presetId);
    if (found) {
      const { startDate: s, endDate: e } = found.getRange();
      setStartDate(s);
      setEndDate(e);
    }
  };

  const handleCustomStartDateChange = (val: string) => {
    setStartDate(val);
    setActivePreset('custom');
  };

  const handleCustomEndDateChange = (val: string) => {
    setEndDate(val);
    setActivePreset('custom');
  };

  // Test Connection
  const handleTestConnection = async () => {
    setConnectionStatus({ tested: false, loading: true });
    setSyncError(null);

    const res = await testYclientsConnection(config);
    setConnectionStatus({
      tested: true,
      loading: false,
      success: res.success,
      message: res.message,
      companyTitle: res.company?.title,
      isDemo: res.isDemo
    });

    if (res.success && config.saveInBrowser) {
      saveYclientsConfig(config);
    }
  };

  // Execute Sync
  const handleExecuteSync = async (forceDemo: boolean = false) => {
    if (!syncTransactions && !syncServices) {
      setSyncError('Пожалуйста, выберите хотя бы один тип данных для загрузки (финансовые операции или отчет по услугам).');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setSyncError('Дата начала не может быть позже даты окончания периода.');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccessResult(null);

    setSyncProgressStep('Инициализация запроса к API Yclients...');
    await new Promise(r => setTimeout(r, 200));

    if (syncTransactions) {
      setSyncProgressStep('Получение финансовых операций и кассовых ордеров...');
      await new Promise(r => setTimeout(r, 250));
    }

    if (syncServices) {
      setSyncProgressStep('Получение журнала визитов, записей и структуры оплат...');
      await new Promise(r => setTimeout(r, 250));
    }

    setSyncProgressStep('Формирование аналитических структур и распределение по залам...');

    try {
      const result = await fetchYclientsData({
        config,
        startDate,
        endDate,
        syncTransactions,
        syncServices,
        useDemo: forceDemo
      });

      if (!result.success && result.records.length === 0 && result.services.length === 0) {
        throw new Error(result.message || 'Не удалось загрузить данные из Yclients.');
      }

      // Save credentials if selected
      if (config.saveInBrowser) {
        saveYclientsConfig(config);
      }

      setSyncSuccessResult(result);
      setIsSyncing(false);
      setSyncProgressStep('');

      // Notify parent app
      const periodLabel = `${formatRuDateStr(startDate)} — ${formatRuDateStr(endDate)}`;
      const sourceTitle = result.companyInfo?.title 
        ? `${result.companyInfo.title} (${periodLabel})`
        : `Yclients (${periodLabel})`;

      onDataLoaded({
        records: result.records || [],
        services: result.services || [],
        startDate,
        endDate,
        sourceTitle,
        isDemo: result.isDemo
      });
    } catch (err: any) {
      setIsSyncing(false);
      setSyncProgressStep('');
      setSyncError(err.message || 'Произошла непредвиденная ошибка при синхронизации с Yclients.');
    }
  };

  // Human date format
  const formatRuDateStr = (iso: string) => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return iso;
  };

  // Calculate day difference
  const daysCount = useMemo(() => {
    try {
      const s = new Date(startDate).getTime();
      const e = new Date(endDate).getTime();
      if (isNaN(s) || isNaN(e)) return 0;
      return Math.max(1, Math.round((e - s) / 86400000) + 1);
    } catch {
      return 0;
    }
  }, [startDate, endDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative w-full max-w-3xl my-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-lg">
              Y
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                Интеграция с Yclients
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                  API v1 / v2
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Загрузка финансовых операций и отчета по услугам напрямую из CRM за любой период
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Status Alert if previously tested */}
          {connectionStatus.tested && (
            <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
              connectionStatus.success 
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
            }`}>
              {connectionStatus.success ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{connectionStatus.message}</p>
                {connectionStatus.companyTitle && (
                  <p className="mt-0.5 opacity-90">Филиал: <span className="font-medium">{connectionStatus.companyTitle}</span></p>
                )}
              </div>
            </div>
          )}

          {/* Sync Success Card if just loaded */}
          {syncSuccessResult && (
            <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-700/60 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Данные успешно синхронизированы из Yclients!</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-emerald-200 dark:border-emerald-900/60 text-slate-800 dark:text-slate-200">
                  <div className="text-[11px] text-slate-500">Финансовых операций</div>
                  <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400">
                    {syncSuccessResult.records?.length || 0}
                  </div>
                </div>
                <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-emerald-200 dark:border-emerald-900/60 text-slate-800 dark:text-slate-200">
                  <div className="text-[11px] text-slate-500">Строк услуг</div>
                  <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400">
                    {syncSuccessResult.services?.length || 0}
                  </div>
                </div>
                <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-emerald-200 dark:border-emerald-900/60 text-slate-800 dark:text-slate-200">
                  <div className="text-[11px] text-slate-500">Общая выручка</div>
                  <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400">
                    {(syncSuccessResult.summary?.totalRevenue || 0).toLocaleString('ru-RU')} ₽
                  </div>
                </div>
              </div>

              {syncSuccessResult.isDemo && (
                <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-800/40">
                  {syncSuccessResult.warning || 'Сформированы демонстрационные данные по структуре Yclients для указанного периода.'}
                </p>
              )}
            </div>
          )}

          {/* Sync Error */}
          {syncError && (
            <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold">Не удалось загрузить данные:</p>
                <p className="mt-0.5">{syncError}</p>
              </div>
            </div>
          )}

          {/* SECTION 1: YCLIENTS API CREDENTIALS (ALWAYS VISIBLE & PROMINENT) */}
          <div className="border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/20 dark:bg-amber-950/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    1. Параметры доступа к API Yclients
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Введите Company ID и токены из личного кабинета Yclients
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowApiGuide(!showApiGuide)}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Где взять ключи?</span>
              </button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
              {/* Company ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company ID (ID филиала) <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Например: 123456"
                    value={config.companyId}
                    onChange={(e) => setConfig({ ...config, companyId: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-mono shadow-xs"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Из ссылки yclients.com/timetable/<strong className="text-slate-600 dark:text-slate-300">123456</strong>
                </span>
              </div>

              {/* Partner Token (Bearer) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Partner Token (Bearer токен)
                </label>
                <div className="relative">
                  <input
                    type={showPartnerToken ? 'text' : 'password'}
                    placeholder="Токен партнера / разработчика"
                    value={config.partnerToken}
                    onChange={(e) => setConfig({ ...config, partnerToken: e.target.value })}
                    className="w-full px-3 py-2 pr-9 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-mono shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPartnerToken(!showPartnerToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    title={showPartnerToken ? 'Скрыть токен' : 'Показать токен'}
                  >
                    {showPartnerToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Bearer токен интегратора
                </span>
              </div>

              {/* User Token */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  User Token (Токен пользователя)
                </label>
                <div className="relative">
                  <input
                    type={showUserToken ? 'text' : 'password'}
                    placeholder="Токен учетной записи пользователя"
                    value={config.userToken}
                    onChange={(e) => setConfig({ ...config, userToken: e.target.value })}
                    className="w-full px-3 py-2 pr-9 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-mono shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserToken(!showUserToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    title={showUserToken ? 'Скрыть токен' : 'Показать токен'}
                  >
                    {showUserToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Токен сотрудника с доступом к финансам
                </span>
              </div>
            </div>

            {/* Test Connection Button & Storage Checkbox */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-amber-200/50 dark:border-amber-800/40">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={config.saveInBrowser ?? true}
                  onChange={(e) => setConfig({ ...config, saveInBrowser: e.target.checked })}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Запомнить ключи в браузере (не потребуется вводить повторно)</span>
              </label>

              <button
                type="button"
                disabled={connectionStatus.loading}
                onClick={handleTestConnection}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-250 dark:border-slate-700 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {connectionStatus.loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span>Проверка связи...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Проверить подключение</span>
                  </>
                )}
              </button>
            </div>

            {/* API Guide Accordion */}
            {showApiGuide && (
              <div className="p-4 bg-white dark:bg-slate-800/90 rounded-xl border border-amber-300 dark:border-amber-700/60 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-500" />
                  Где найти Company ID, Partner Token и User Token в Yclients:
                </p>
                <ul className="space-y-1.5 pl-1 list-none text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-amber-600">1.</span>
                    <div>
                      <strong>Company ID (ID филиала)</strong>: находится прямо в адресной строке вашего браузера при открытии журнала записи (например, <code className="font-mono bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-amber-700 dark:text-amber-300">https://yclients.com/timetable/123456</code>, где <strong>123456</strong> — это ваш Company ID).
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-amber-600">2.</span>
                    <div>
                      <strong>User Token (Токен пользователя)</strong>: выдается в разделе <em>Настройки &gt; Пользователи &gt; [Выбрать сотрудника с правами бухгалтера или владельца]</em> в блоке доступа к API, либо генерируется при авторизации по логину/паролю.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-amber-600">3.</span>
                    <div>
                      <strong>Partner Token (Токен партнера / Bearer)</strong>: токен приложения интегратора из личного кабинета разработчика Yclients API. Если вы используете интеграцию напрямую через токен пользователя, можно оставить пустым или указать оба токена.
                    </div>
                  </li>
                  <li className="flex items-start gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                    <span className="font-bold text-amber-600">💡</span>
                    <div>
                      <em>Быстрый тест без ключей</em>: нажмите внизу кнопку <strong>«Демо Yclients за выбранный период»</strong>, и система сформирует полный срез данных за любые выбранные даты.
                    </div>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* SECTION 2: ARBITRARY PERIOD SELECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                2. Произвольный период выборки
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {daysCount} {daysCount === 1 ? 'день' : (daysCount >= 2 && daysCount <= 4 ? 'дня' : 'дней')} ({formatRuDateStr(startDate)} — {formatRuDateStr(endDate)})
              </span>
            </div>

            {/* Quick Presets Bar */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
              {PERIOD_PRESETS.map((preset) => {
                const isActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {preset.shortLabel}
                  </button>
                );
              })}
            </div>

            {/* Custom Range Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Дата начала периода:
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleCustomStartDateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs shadow-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Дата окончания периода:
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleCustomEndDateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs shadow-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: WHAT TO SYNC */}
          <div className="space-y-3 pt-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              3. Выбор загружаемых отчетов
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Transactions */}
              <label className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                syncTransactions 
                  ? 'border-indigo-400 dark:border-indigo-500/60 bg-indigo-50/40 dark:bg-indigo-950/20' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={syncTransactions}
                  onChange={(e) => setSyncTransactions(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Финансовые операции
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Движения денег, выручка с услуг и витрины, закупки материалов, зарплаты и постоянные расходы (P&L и ЗП ведомость).
                  </p>
                </div>
              </label>

              {/* Option B: Services */}
              <label className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                syncServices 
                  ? 'border-indigo-400 dark:border-indigo-500/60 bg-indigo-50/40 dark:bg-indigo-950/20' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={syncServices}
                  onChange={(e) => setSyncServices(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Отчет по услугам
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Оказанные услуги по мастерам и 5 залам салона, скидки, баллы, сертификаты, абонементы и аналитика площадей (м²).
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => handleExecuteSync(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Загрузить тестовый срез данных за выбранный период"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Демо Yclients за выбранный период</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isSyncing}
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Отмена
            </button>

            <button
              type="button"
              disabled={isSyncing}
              onClick={() => handleExecuteSync(false)}
              className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{syncProgressStep || 'Синхронизация...'}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Синхронизировать данные</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
