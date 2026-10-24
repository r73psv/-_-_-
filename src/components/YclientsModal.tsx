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
  Database
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
  const [showConfigSettings, setShowConfigSettings] = useState(false);
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
      if (!saved.companyId && !saved.partnerToken) {
        setShowConfigSettings(true);
      }
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
        className="relative w-full max-w-3xl my-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-lg">
              Y
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                Интеграция с Yclients
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                  v1 / v2 API
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Автоматическая загрузка финансовых операций и отчета по услугам за произвольный период
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
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

          {/* SECTION 1: ARBITRARY PERIOD SELECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                1. Произвольный период выгрузки
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
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs"
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
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: WHAT TO SYNC */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              2. Выбор загружаемых отчетов
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Transactions */}
              <label className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                syncTransactions 
                  ? 'border-amber-400 dark:border-amber-500/60 bg-amber-50/40 dark:bg-amber-950/20' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={syncTransactions}
                  onChange={(e) => setSyncTransactions(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
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
                  ? 'border-amber-400 dark:border-amber-500/60 bg-amber-50/40 dark:bg-amber-950/20' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}>
                <input
                  type="checkbox"
                  checked={syncServices}
                  onChange={(e) => setSyncServices(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Отчет по услугам
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Оказанные услуги по мастерам и 5 залам салона, скидки, баллы, сертификаты, абонементы и аналитика площадей (м²).
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* SECTION 3: YCLIENTS API CREDENTIALS */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowConfigSettings(!showConfigSettings)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 text-left hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  3. Параметры доступа к API Yclients
                </span>
                {config.companyId && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    (ID: {config.companyId})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{showConfigSettings ? 'Свернуть' : 'Настроить ключи'}</span>
                {showConfigSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showConfigSettings && (
              <div className="p-4 space-y-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      ID филиала (Company ID) <span className="text-amber-500">*</span>:
                    </label>
                    <input
                      type="text"
                      placeholder="Например: 123456"
                      value={config.companyId}
                      onChange={(e) => setConfig({ ...config, companyId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Токен партнера (Bearer):
                    </label>
                    <input
                      type="password"
                      placeholder="Partner Token"
                      value={config.partnerToken}
                      onChange={(e) => setConfig({ ...config, partnerToken: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Токен пользователя (User Token):
                    </label>
                    <input
                      type="password"
                      placeholder="User Token"
                      value={config.userToken}
                      onChange={(e) => setConfig({ ...config, userToken: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={config.saveInBrowser ?? true}
                      onChange={(e) => setConfig({ ...config, saveInBrowser: e.target.checked })}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span>Сохранять ключи в памяти браузера для последующих выгрузок</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowApiGuide(!showApiGuide)}
                      className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Где взять токены?
                    </button>

                    <button
                      type="button"
                      disabled={connectionStatus.loading}
                      onClick={handleTestConnection}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {connectionStatus.loading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                          <span>Проверка...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Проверить подключение</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* API Help Guide Accordion */}
                {showApiGuide && (
                  <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                    <p className="font-semibold text-slate-900 dark:text-white">Инструкция по получению токенов в Yclients:</p>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                      <li>
                        <strong>Company ID (ID филиала)</strong>: находится в адресной строке вашего браузера при входе в филиал (например, <code className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded">yclients.com/timetable/123456</code>, где <code className="font-mono text-amber-600">123456</code> — это ваш ID).
                      </li>
                      <li>
                        <strong>User Token (Токен пользователя)</strong>: выдается в разделе <em>Настройки &gt; Пользователи &gt; [Выбрать сотрудника] &gt; Доступ к API</em> (или в запросе авторизации пользователя).
                      </li>
                      <li>
                        <strong>Partner Token (Токен партнера)</strong>: получается в кабинете разработчика Yclients API при регистрации интеграции приложения.
                      </li>
                      <li>
                        <em>Совет</em>: если у вас нет доступа разработчика, вы можете нажать кнопку ниже <strong>«Тестовый запуск с демо-данными Yclients»</strong> для мгновенной проверки отчетов.
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => handleExecuteSync(true)}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all flex items-center gap-1.5"
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
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
            >
              Отмена
            </button>

            <button
              type="button"
              disabled={isSyncing}
              onClick={() => handleExecuteSync(false)}
              className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
