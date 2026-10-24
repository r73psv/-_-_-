import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ReferenceLine
} from 'recharts';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Layers,
  Percent,
  DollarSign,
  ArrowUpDown,
  Building2,
  Sparkles,
  ChevronRight,
  Info,
  Maximize2
} from 'lucide-react';
import { HallReportGroup, ServicesReportSummary } from '../types';
import { HALL_METADATA, HallName } from '../hallsClassifier';

interface HallPerformanceDashboardProps {
  halls: HallReportGroup[];
  summary: ServicesReportSummary;
  selectedHallFilter: string;
  onSelectHall: (hallName: string) => void;
  onOpenHallParams?: () => void;
}

type ChartViewType = 'comparative' | 'cost_breakdown' | 'profitability';
type SortOrderType = 'profit_desc' | 'revenue_desc' | 'profitability_desc' | 'cost_desc';

export default function HallPerformanceDashboard({
  halls,
  summary,
  selectedHallFilter,
  onSelectHall,
  onOpenHallParams
}: HallPerformanceDashboardProps) {
  const [chartView, setChartView] = useState<ChartViewType>('comparative');
  const [sortOrder, setSortOrder] = useState<SortOrderType>('profit_desc');
  const [hideInactiveHalls, setHideInactiveHalls] = useState<boolean>(true);
  const [chartOrientation, setChartOrientation] = useState<'horizontal' | 'vertical'>('vertical');

  // Filter and prepare hall performance metrics
  const processedHalls = useMemo(() => {
    let list = halls.map((h) => {
      const meta = HALL_METADATA[h.hallName as HallName] || HALL_METADATA['Прочие услуги'];
      const rev = h.summary.totalRevenue;
      const cost = h.summary.totalCost;
      const profit = h.summary.totalProfit;
      const margin = rev > 0 ? (profit / rev) * 100 : 0;
      const supplierCost = h.summary.totalSupplierCost;
      const masterSalary = h.summary.masterSalary;
      const adminSalary = h.summary.adminSalary;
      const overheadCost = h.summary.totalVariableCost + h.summary.totalFixedCost;
      const area = h.summary.area || 0;
      const revPerSqM = area > 0 && rev > 0 ? rev / area : 0;
      const profitPerSqM = area > 0 ? profit / area : 0;

      let statusBadge: { text: string; bg: string; color: string; border: string };
      if (rev === 0) {
        statusBadge = { text: 'Без выручки', bg: 'bg-gray-100', color: 'text-gray-600', border: 'border-gray-200' };
      } else if (margin >= 35) {
        statusBadge = { text: 'Высокая маржа', bg: 'bg-emerald-50', color: 'text-emerald-700', border: 'border-emerald-200' };
      } else if (margin >= 15) {
        statusBadge = { text: 'Стабильный', bg: 'bg-blue-50', color: 'text-blue-700', border: 'border-blue-200' };
      } else if (profit > 0) {
        statusBadge = { text: 'Низкая маржа', bg: 'bg-amber-50', color: 'text-amber-800', border: 'border-amber-200' };
      } else {
        statusBadge = { text: 'Убыточный', bg: 'bg-rose-50', color: 'text-rose-700', border: 'border-rose-200' };
      }

      return {
        hallName: h.hallName,
        shortName: meta.shortLabel,
        itemsCount: h.items.length,
        revenue: rev,
        cost,
        profit,
        margin: parseFloat(margin.toFixed(1)),
        revenueShare: h.summary.totalRevenueShare,
        supplierCost,
        masterSalary,
        adminSalary,
        totalSalaryCost: h.summary.totalSalaryCost,
        overheadCost,
        area,
        revPerSqM: Math.round(revPerSqM),
        profitPerSqM: Math.round(profitPerSqM),
        meta,
        statusBadge,
        hasActivity: rev > 0 || h.items.length > 0 || cost > 0
      };
    });

    if (hideInactiveHalls) {
      list = list.filter((h) => h.hasActivity);
    }

    // Sort halls
    list.sort((a, b) => {
      switch (sortOrder) {
        case 'profit_desc':
          return b.profit - a.profit;
        case 'revenue_desc':
          return b.revenue - a.revenue;
        case 'profitability_desc':
          return b.margin - a.margin;
        case 'cost_desc':
          return b.cost - a.cost;
        default:
          return b.profit - a.profit;
      }
    });

    return list;
  }, [halls, hideInactiveHalls, sortOrder]);

  // Identify Business Unit Leaders & Outliers among active revenue halls
  const activeHalls = useMemo(() => {
    return halls
      .filter((h) => h.summary.totalRevenue > 0)
      .map((h) => {
        const rev = h.summary.totalRevenue;
        const profit = h.summary.totalProfit;
        const margin = rev > 0 ? (profit / rev) * 100 : 0;
        return {
          hallName: h.hallName,
          revenue: rev,
          cost: h.summary.totalCost,
          profit,
          margin,
          area: h.summary.area || 0,
          profitPerSqM: (h.summary.area || 0) > 0 ? profit / h.summary.area : 0,
          meta: HALL_METADATA[h.hallName as HallName] || HALL_METADATA['Прочие услуги']
        };
      });
  }, [halls]);

  // Most profitable hall
  const mostProfitableHall = useMemo(() => {
    if (activeHalls.length === 0) return null;
    return [...activeHalls].sort((a, b) => b.profit - a.profit)[0];
  }, [activeHalls]);

  // Least profitable hall (or lowest profit / loss)
  const leastProfitableHall = useMemo(() => {
    if (activeHalls.length === 0) return null;
    const sorted = [...activeHalls].sort((a, b) => a.profit - b.profit);
    return sorted[0];
  }, [activeHalls]);

  // Top revenue driver
  const topRevenueHall = useMemo(() => {
    if (activeHalls.length === 0) return null;
    return [...activeHalls].sort((a, b) => b.revenue - a.revenue)[0];
  }, [activeHalls]);

  // Top profit margin hall
  const topMarginHall = useMemo(() => {
    if (activeHalls.length === 0) return null;
    return [...activeHalls].sort((a, b) => b.margin - a.margin)[0];
  }, [activeHalls]);

  // Format currency
  const formatCurrency = (val: number) => {
    return `${Math.round(val).toLocaleString('ru-RU')} ₽`;
  };

  // Custom Tooltip for Comparative Chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-white/95 backdrop-blur-sm p-3.5 rounded-2xl border border-gray-200 shadow-xl text-xs space-y-2 min-w-[220px]">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <span className="font-bold text-gray-900 text-sm line-clamp-1">{data.hallName}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${data.statusBadge?.bg} ${data.statusBadge?.color} border ${data.statusBadge?.border}`}>
            {data.statusBadge?.text}
          </span>
        </div>

        <div className="space-y-1 font-mono text-[11px]">
          <div className="flex justify-between items-center text-emerald-800">
            <span className="font-sans text-gray-500">Выручка:</span>
            <span className="font-bold">{formatCurrency(data.revenue)} ({data.revenueShare}%)</span>
          </div>
          <div className="flex justify-between items-center text-rose-700">
            <span className="font-sans text-gray-500">Всего затрат:</span>
            <span className="font-bold">{formatCurrency(data.cost)}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-gray-100">
            <span className="font-sans font-semibold text-gray-700">Чистая прибыль:</span>
            <span className={`font-bold ${data.profit >= 0 ? 'text-indigo-900' : 'text-rose-700'}`}>
              {formatCurrency(data.profit)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-sans text-gray-500">Рентабельность:</span>
            <span className={`font-bold ${data.margin >= 25 ? 'text-emerald-700' : data.margin >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
              {data.margin}%
            </span>
          </div>
        </div>

        {chartView === 'cost_breakdown' && (
          <div className="pt-2 border-t border-dashed border-gray-200 text-[10px] text-gray-600 space-y-0.5">
            <div className="font-bold font-sans text-gray-800 mb-0.5">Структура расходов зала:</div>
            <div className="flex justify-between">
              <span>• Материалы:</span>
              <span className="font-mono">{formatCurrency(data.supplierCost)}</span>
            </div>
            <div className="flex justify-between">
              <span>• ЗП мастеров:</span>
              <span className="font-mono">{formatCurrency(data.masterSalary)}</span>
            </div>
            <div className="flex justify-between">
              <span>• Доля ЗП админов:</span>
              <span className="font-mono">{formatCurrency(data.adminSalary)}</span>
            </div>
            <div className="flex justify-between">
              <span>• Накладные (пер.+пост.):</span>
              <span className="font-mono">{formatCurrency(data.overheadCost)}</span>
            </div>
          </div>
        )}

        {data.area > 0 && (
          <div className="pt-1.5 border-t border-gray-150 text-[10px] text-gray-500 flex justify-between">
            <span>Площадь: {data.area} м²</span>
            <span className="font-mono font-semibold text-gray-700">{formatCurrency(data.profitPerSqM)}/м²</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm space-y-6">
      {/* Header and Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-extrabold text-base text-gray-900">
                  Дашборд эффективности залов (Hall Performance Dashboard)
                </h3>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Recharts Analytics
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Сравнительный анализ выручки, затрат и маржинальности бизнес-единиц салона
              </p>
            </div>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart View selector */}
          <div className="inline-flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setChartView('comparative')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                chartView === 'comparative'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Сравнение выручки, затрат и чистой прибыли"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Выручка vs Затраты</span>
            </button>
            <button
              onClick={() => setChartView('cost_breakdown')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                chartView === 'cost_breakdown'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Детализация расходов: материалы, ЗП мастеров, ЗП админов, накладные"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Структура затрат</span>
            </button>
            <button
              onClick={() => setChartView('profitability')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                chartView === 'profitability'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Сравнение маржинальности и рентабельности (%)"
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Рентабельность (%)</span>
            </button>
          </div>

          {/* Orientation switch */}
          <button
            onClick={() => setChartOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
            className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
            title="Переключить ориентацию диаграммы (горизонтальная / вертикальная)"
          >
            <Maximize2 className="w-3 h-3 text-gray-500" />
            <span>{chartOrientation === 'vertical' ? 'Гориз. шкала' : 'Верт. шкала'}</span>
          </button>
        </div>
      </div>

      {/* Business Unit Highlights: Most & Least Profitable Units */}
      {activeHalls.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {/* Most Profitable Unit */}
          {mostProfitableHall && (
            <div 
              onClick={() => onSelectHall(mostProfitableHall.hallName)}
              className="bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-white rounded-2xl border-2 border-emerald-300 p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute top-2.5 right-2.5 p-1.5 bg-emerald-100 text-emerald-800 rounded-lg group-hover:scale-110 transition-transform">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                  ★ Самый прибыльный зал
                </span>
              </div>
              <h4 className="font-display font-extrabold text-sm text-gray-900 line-clamp-1 mt-1" title={mostProfitableHall.hallName}>
                {mostProfitableHall.hallName}
              </h4>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono font-extrabold text-xl text-emerald-700">
                  +{formatCurrency(mostProfitableHall.profit)}
                </span>
                <span className="text-xs font-bold text-emerald-800 font-mono bg-emerald-100/70 px-1.5 py-0.5 rounded">
                  {mostProfitableHall.margin.toFixed(1)}% маржа
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-100 text-[11px] text-gray-600 flex justify-between font-mono">
                <span>Выручка: {formatCurrency(mostProfitableHall.revenue)}</span>
                <span>Затраты: {formatCurrency(mostProfitableHall.cost)}</span>
              </div>
            </div>
          )}

          {/* Top Revenue Driver */}
          {topRevenueHall && (
            <div 
              onClick={() => onSelectHall(topRevenueHall.hallName)}
              className="bg-gradient-to-br from-indigo-50/90 via-indigo-50/40 to-white rounded-2xl border border-indigo-200 p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute top-2.5 right-2.5 p-1.5 bg-indigo-100 text-indigo-800 rounded-lg group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-md">
                  Лидер по выручке
                </span>
              </div>
              <h4 className="font-display font-extrabold text-sm text-gray-900 line-clamp-1 mt-1" title={topRevenueHall.hallName}>
                {topRevenueHall.hallName}
              </h4>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono font-extrabold text-xl text-indigo-900">
                  {formatCurrency(topRevenueHall.revenue)}
                </span>
                <span className="text-[11px] text-indigo-700 font-mono">
                  {((topRevenueHall.revenue / (summary.totalRevenue || 1)) * 100).toFixed(1)}% оборота
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-indigo-100 text-[11px] text-gray-600 flex justify-between font-mono">
                <span>Прибыль: {formatCurrency(topRevenueHall.profit)}</span>
                <span>Затраты: {formatCurrency(topRevenueHall.cost)}</span>
              </div>
            </div>
          )}

          {/* Highest Profit Margin */}
          {topMarginHall && (
            <div 
              onClick={() => onSelectHall(topMarginHall.hallName)}
              className="bg-gradient-to-br from-sky-50/90 via-sky-50/40 to-white rounded-2xl border border-sky-200 p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute top-2.5 right-2.5 p-1.5 bg-sky-100 text-sky-800 rounded-lg group-hover:scale-110 transition-transform">
                <Percent className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-900 bg-sky-100 px-2 py-0.5 rounded-md">
                  Максимальная рентабельность
                </span>
              </div>
              <h4 className="font-display font-extrabold text-sm text-gray-900 line-clamp-1 mt-1" title={topMarginHall.hallName}>
                {topMarginHall.hallName}
              </h4>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono font-extrabold text-xl text-sky-950">
                  {topMarginHall.margin.toFixed(1)}%
                </span>
                <span className="text-[11px] text-sky-800 font-mono">
                  рентабельность
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-sky-100 text-[11px] text-gray-600 flex justify-between font-mono">
                <span>Прибыль: {formatCurrency(topMarginHall.profit)}</span>
                <span>Выручка: {formatCurrency(topMarginHall.revenue)}</span>
              </div>
            </div>
          )}

          {/* Least Profitable Unit */}
          {leastProfitableHall && (
            <div 
              onClick={() => onSelectHall(leastProfitableHall.hallName)}
              className={`bg-gradient-to-br ${
                leastProfitableHall.profit < 0 
                  ? 'from-rose-50/90 via-rose-50/40 to-white border-2 border-rose-300' 
                  : 'from-amber-50/90 via-amber-50/40 to-white border border-amber-200'
              } rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden group`}
            >
              <div className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg ${leastProfitableHall.profit < 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'} group-hover:scale-110 transition-transform`}>
                {leastProfitableHall.profit < 0 ? <AlertTriangle className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  leastProfitableHall.profit < 0 
                    ? 'text-rose-900 bg-rose-100' 
                    : 'text-amber-900 bg-amber-100'
                }`}>
                  {leastProfitableHall.profit < 0 ? '⚠️ Убыточный зал' : 'Наименьшая прибыль'}
                </span>
              </div>
              <h4 className="font-display font-extrabold text-sm text-gray-900 line-clamp-1 mt-1" title={leastProfitableHall.hallName}>
                {leastProfitableHall.hallName}
              </h4>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`font-mono font-extrabold text-xl ${leastProfitableHall.profit < 0 ? 'text-rose-600' : 'text-amber-800'}`}>
                  {formatCurrency(leastProfitableHall.profit)}
                </span>
                <span className="text-xs font-bold text-gray-500 font-mono">
                  {leastProfitableHall.margin.toFixed(1)}% маржа
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-150 text-[11px] text-gray-600 flex justify-between font-mono">
                <span>Выручка: {formatCurrency(leastProfitableHall.revenue)}</span>
                <span>Затраты: {formatCurrency(leastProfitableHall.cost)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart Filter & Sorting Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/80 p-3 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
            Сортировка:
          </span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrderType)}
            className="text-xs font-semibold bg-white border border-gray-250 rounded-xl px-2.5 py-1 text-gray-800 outline-none cursor-pointer"
          >
            <option value="profit_desc">По прибыли (Лидеры → Аутсайдеры)</option>
            <option value="revenue_desc">По выручке (Высокая → Низкая)</option>
            <option value="profitability_desc">По рентабельности %</option>
            <option value="cost_desc">По сумме затрат</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={hideInactiveHalls}
              onChange={(e) => setHideInactiveHalls(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>Только активные залы ({processedHalls.length})</span>
          </label>
        </div>

        {selectedHallFilter !== 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-indigo-700 font-medium">
              Фильтр: <strong>{selectedHallFilter}</strong>
            </span>
            <button
              onClick={() => onSelectHall('all')}
              className="text-xs text-gray-500 hover:text-gray-800 underline cursor-pointer"
            >
              Сбросить
            </button>
          </div>
        )}
      </div>

      {/* Main Recharts Bar Chart Container */}
      <div className="w-full bg-slate-50/50 rounded-2xl border border-gray-200/80 p-4 pt-6">
        {processedHalls.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <Building2 className="w-8 h-8 mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">Нет данных для построения диаграммы</p>
            <p className="text-xs text-gray-400">Загрузите файл с услугами или включите отображение всех залов</p>
          </div>
        ) : (
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartOrientation === 'vertical' ? (
                // Horizontal layout: Bar values go vertically, X axis shows hall names
                <BarChart
                  data={processedHalls}
                  margin={{ top: 20, right: 30, left: 20, bottom: 65 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      const clickedHall = state.activePayload[0].payload.hallName;
                      onSelectHall(clickedHall === selectedHallFilter ? 'all' : clickedHall);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="shortName"
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    height={60}
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    stroke="#cbd5e1"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    wrapperStyle={{ paddingBottom: 15 }}
                    formatter={(val) => <span className="text-xs font-semibold text-gray-700">{val}</span>}
                  />

                  {chartView === 'comparative' && (
                    <>
                      <Bar 
                        dataKey="revenue" 
                        name="Выручка (₽)" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={45} 
                      />
                      <Bar 
                        dataKey="cost" 
                        name="Всего затрат (₽)" 
                        fill="#f43f5e" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={45} 
                      />
                      <Bar 
                        dataKey="profit" 
                        name="Чистая прибыль (₽)" 
                        fill="#6366f1" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={45} 
                      />
                    </>
                  )}

                  {chartView === 'cost_breakdown' && (
                    <>
                      <Bar dataKey="supplierCost" name="Материалы" stackId="cost" fill="#3b82f6" />
                      <Bar dataKey="masterSalary" name="ЗП мастеров" stackId="cost" fill="#0ea5e9" />
                      <Bar dataKey="adminSalary" name="Доля админов" stackId="cost" fill="#14b8a6" />
                      <Bar dataKey="overheadCost" name="Накладные расходы" stackId="cost" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </>
                  )}

                  {chartView === 'profitability' && (
                    <>
                      <ReferenceLine y={0} stroke="#94a3b8" />
                      <Bar dataKey="margin" name="Рентабельность (%)" radius={[4, 4, 0, 0]} maxBarSize={55}>
                        {processedHalls.map((entry, index) => {
                          let color = '#10b981'; // high
                          if (entry.margin < 0) color = '#f43f5e'; // loss
                          else if (entry.margin < 15) color = '#f59e0b'; // low
                          else if (entry.margin < 30) color = '#3b82f6'; // medium
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </>
                  )}
                </BarChart>
              ) : (
                // Horizontal Bars: Y axis shows hall names (easy reading on any screen width)
                <BarChart
                  data={processedHalls}
                  layout="vertical"
                  margin={{ top: 15, right: 30, left: 110, bottom: 20 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      const clickedHall = state.activePayload[0].payload.hallName;
                      onSelectHall(clickedHall === selectedHallFilter ? 'all' : clickedHall);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tickFormatter={(val) => chartView === 'profitability' ? `${val}%` : `${(val / 1000).toFixed(0)}k`}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    stroke="#cbd5e1"
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                    width={100}
                    stroke="#cbd5e1"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    wrapperStyle={{ paddingBottom: 12 }}
                    formatter={(val) => <span className="text-xs font-semibold text-gray-700">{val}</span>}
                  />

                  {chartView === 'comparative' && (
                    <>
                      <Bar dataKey="revenue" name="Выручка (₽)" fill="#10b981" radius={[0, 4, 4, 0]} barSize={14} />
                      <Bar dataKey="cost" name="Всего затрат (₽)" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={14} />
                      <Bar dataKey="profit" name="Чистая прибыль (₽)" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={14} />
                    </>
                  )}

                  {chartView === 'cost_breakdown' && (
                    <>
                      <Bar dataKey="supplierCost" name="Материалы" stackId="cost" fill="#3b82f6" barSize={22} />
                      <Bar dataKey="masterSalary" name="ЗП мастеров" stackId="cost" fill="#0ea5e9" barSize={22} />
                      <Bar dataKey="adminSalary" name="Доля админов" stackId="cost" fill="#14b8a6" barSize={22} />
                      <Bar dataKey="overheadCost" name="Накладные" stackId="cost" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={22} />
                    </>
                  )}

                  {chartView === 'profitability' && (
                    <>
                      <ReferenceLine x={0} stroke="#94a3b8" />
                      <Bar dataKey="margin" name="Рентабельность (%)" radius={[0, 4, 4, 0]} barSize={18}>
                        {processedHalls.map((entry, index) => {
                          let color = '#10b981';
                          if (entry.margin < 0) color = '#f43f5e';
                          else if (entry.margin < 15) color = '#f59e0b';
                          else if (entry.margin < 30) color = '#3b82f6';
                          return <Cell key={`h-cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </>
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Comparative Leaderboard & Detailed Unit Performance Table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-gray-700">
              Сводная таблица эффективности залов (Рейтинг подразделений)
            </h4>
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
              {processedHalls.length} залов
            </span>
          </div>
          <span className="text-[11px] text-gray-400">
            Нажмите на строку зала для быстрой фильтрации каталога услуг
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/90 text-gray-600 border-b border-gray-200 font-bold text-[11px]">
                <th className="py-2.5 px-3 w-10 text-center">Ранг</th>
                <th className="py-2.5 px-3">Зал салона</th>
                <th className="py-2.5 px-3 text-right">Выручка</th>
                <th className="py-2.5 px-3 text-right">Доля в обороте</th>
                <th className="py-2.5 px-3 text-right">Всего затрат</th>
                <th className="py-2.5 px-3 text-right">Чистая прибыль</th>
                <th className="py-2.5 px-3 text-center">Рентабельность</th>
                <th className="py-2.5 px-3 text-center">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processedHalls.map((h, idx) => {
                const isSelected = selectedHallFilter === h.hallName;
                const isLeader = idx === 0 && h.profit > 0;
                const isLoss = h.profit < 0;

                return (
                  <tr
                    key={`tbl_rank_${h.hallName}`}
                    onClick={() => onSelectHall(isSelected ? 'all' : h.hallName)}
                    className={`transition-colors cursor-pointer font-sans ${
                      isSelected
                        ? 'bg-indigo-50 font-semibold'
                        : isLoss
                          ? 'bg-rose-50/30 hover:bg-rose-50/60'
                          : idx % 2 === 0
                            ? 'bg-white hover:bg-gray-50/80'
                            : 'bg-gray-50/40 hover:bg-gray-100/60'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-400">
                      {isLeader ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                          🥇
                        </span>
                      ) : idx === 1 && h.profit > 0 ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                          🥈
                        </span>
                      ) : idx === 2 && h.profit > 0 ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[10px]">
                          🥉
                        </span>
                      ) : (
                        `#${idx + 1}`
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${h.meta.badgeBg} ${h.meta.badgeText} border ${h.meta.badgeBorder}`}>
                          {h.meta.shortLabel}
                        </span>
                        <span className="font-bold text-gray-900">{h.hallName}</span>
                        {h.area > 0 && (
                          <span className="text-[10px] text-gray-400 font-mono">({h.area} м²)</span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                      {formatCurrency(h.revenue)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                      {h.revenueShare}%
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-medium">
                      {formatCurrency(h.cost)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={h.profit >= 0 ? 'text-indigo-900' : 'text-rose-700'}>
                        {h.profit >= 0 ? `+${formatCurrency(h.profit)}` : formatCurrency(h.profit)}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 font-mono font-bold text-[11px]">
                        <span className={`px-2 py-0.5 rounded-md ${
                          h.margin >= 35 
                            ? 'bg-emerald-100 text-emerald-900' 
                            : h.margin >= 15 
                              ? 'bg-blue-100 text-blue-900' 
                              : h.margin >= 0 
                                ? 'bg-amber-100 text-amber-900' 
                                : 'bg-rose-100 text-rose-900'
                        }`}>
                          {h.margin}%
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${h.statusBadge.bg} ${h.statusBadge.color} border ${h.statusBadge.border}`}>
                        {h.statusBadge.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
