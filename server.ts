import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));

// Helper to construct Yclients API request headers
function getYclientsHeaders(partnerToken?: string, userToken?: string) {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.yclients.v2+json, application/json',
    'Content-Type': 'application/json',
  };

  const authParts: string[] = [];
  if (partnerToken && partnerToken.trim()) {
    authParts.push(`Bearer ${partnerToken.trim()}`);
  }
  if (userToken && userToken.trim()) {
    authParts.push(`User ${userToken.trim()}`);
  }

  if (authParts.length > 0) {
    headers['Authorization'] = authParts.join(', ');
  }

  return headers;
}

// Format Date to DD.MM.YYYY
function formatDateRu(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// Format Date to YYYY-MM-DD
function formatDateIso(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

// Generate realistic mock Yclients data for any given date range
function generateMockYclientsData(startDateStr: string, endDateStr: string) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const startTime = isNaN(start.getTime()) ? new Date('2026-05-01').getTime() : start.getTime();
  const endTime = isNaN(end.getTime()) ? new Date('2026-05-31').getTime() : end.getTime();
  const timeSpan = Math.max(86400000, endTime - startTime);

  const getRandomDate = (fractionMin = 0, fractionMax = 1) => {
    const fraction = fractionMin + Math.random() * (fractionMax - fractionMin);
    return new Date(startTime + fraction * timeSpan);
  };

  // 1. Financial Transactions
  const mockTransactions = [
    // Revenue from services
    { sum: 154000, category: 'Выручка с услуг', counterparty: 'Клиенты салона', serviceProduct: 'Стрижка женская (модельная)', comment: 'Оплата услуг парикмахерского зала', date: getRandomDate(0.05, 0.3) },
    { sum: 122000, category: 'Выручка с услуг', counterparty: 'Клиенты салона', serviceProduct: 'Сложное окрашивание (Airtouch)', comment: 'Оплата услуг колористики (терминал)', date: getRandomDate(0.2, 0.5) },
    { sum: 89000, category: 'Выручка с услуг', counterparty: 'Клиенты салона', serviceProduct: 'Маникюр аппаратный с покрытием гель-лак', comment: 'Ногтевой сервис (наличные + терминал)', date: getRandomDate(0.3, 0.7) },
    { sum: 64000, category: 'Выручка с услуг', counterparty: 'Клиенты салона', serviceProduct: 'Педикюр Smart классический', comment: 'Ногтевой сервис', date: getRandomDate(0.4, 0.8) },
    { sum: 48000, category: 'Выручка с услуг', counterparty: 'Клиенты салона', serviceProduct: 'Макияж вечерний / никах', comment: 'Визаж и прически', date: getRandomDate(0.1, 0.6) },
    { sum: 38000, category: 'Выручка с услуг', counterparty: 'Клиенты салона', serviceProduct: 'Архитектура и коррекция бровей', comment: 'Броу-бар услуги', date: getRandomDate(0.2, 0.9) },
    { sum: 52000, category: 'Выручка с услуг', counterparty: 'Клиенты салона', serviceProduct: 'Стрижка мужская Fade / Кроп', comment: 'Мужской зал стрижки и борода', date: getRandomDate(0.1, 0.85) },
    
    // Revenue from goods
    { sum: 72000, category: 'Выручка с товаров', counterparty: 'Розничные покупатели', serviceProduct: 'Шампунь Kerastase Nutritive 250ml', comment: 'Продажи витрина салон', date: getRandomDate(0.15, 0.7) },
    { sum: 46000, category: 'Выручка с товаров', counterparty: 'Розничные покупатели', serviceProduct: 'Масло L\'Oreal Mythic Oil 100ml', comment: 'Продажи домашнего ухода', date: getRandomDate(0.25, 0.8) },
    
    // Certificates and client deposits
    { sum: 35000, category: 'Пополнение счёта', counterparty: 'Постоянные клиенты', serviceProduct: 'Пополнение депозитного баланса', comment: 'Депозиты в личный кабинет Yclients', date: getRandomDate(0.1, 0.6) },
    { sum: 50000, category: 'Выручка с сертификатов', counterparty: 'Подарочные сертификаты', serviceProduct: 'Подарочный сертификат 5000 ₽', comment: 'Подарочные карты Yclients', date: getRandomDate(0.2, 0.75) },

    // Operating Variable Expenses
    { sum: 16500, category: '2026 Жизнеобеспечение салона', counterparty: 'Пекарня Сласть', comment: 'Угощения и чай для клиентов салона', date: getRandomDate(0.05, 0.4) },
    { sum: 4200, category: 'Доставка', counterparty: 'Яндекс Доставка', comment: 'Курьерская доставка материалов', date: getRandomDate(0.1, 0.5) },
    { sum: 13800, category: 'Кофе', counterparty: 'Спешелти Ростерс', comment: 'Зерновой кофе для кофемашины', date: getRandomDate(0.3, 0.7) },
    { sum: 9200, category: 'Хозяйственные расходы', counterparty: 'Комус', comment: 'Бытовая химия, перчатки, бахилы', date: getRandomDate(0.2, 0.6) },

    // Suppliers (Materials & Goods)
    { sum: 48000, category: 'Закупка материалов', counterparty: 'ИП Щеголькова (ProfiLine)', comment: 'Краски для волос, оксиданты, осветлители', date: getRandomDate(0.1, 0.4) },
    { sum: 32000, category: 'Закупка товаров', counterparty: 'ООО Солком Регион (Лореаль витрина)', comment: 'Шампуни, кондиционеры и маски L\'Oreal', date: getRandomDate(0.2, 0.5) },
    { sum: 22500, category: 'Закупка материалов', counterparty: 'Калашникова (Matrix расходники)', comment: 'Красители Matrix SoColor, окислители', date: getRandomDate(0.15, 0.45) },
    { sum: 36000, category: 'Закупка материалов', counterparty: 'Материалы для ногтевиков (NailPro)', comment: 'Базы, топы, гель-лаки, жидкости, пилки', date: getRandomDate(0.2, 0.6) },
    { sum: 14000, category: 'Закупка материалов', counterparty: 'Материалы для бровистов (BrowHenna)', comment: 'Краски Thuya, хна, воски, пинцеты', date: getRandomDate(0.25, 0.65) },
    { sum: 17500, category: 'Закупка материалов', counterparty: 'ИП Щеголькова (American CREW)', comment: 'Мужской стайлинг и шампуни для барберов', date: getRandomDate(0.3, 0.7) },
    { sum: 19500, category: 'Закупка материалов', counterparty: 'ООО Торговый Дом БлескСервис (TORK)', comment: 'Одноразовые полотенца, салфетки, простыни Tork', date: getRandomDate(0.1, 0.5) },

    // Overheads / Fixed Expenses
    { sum: 125000, category: 'Аренда', counterparty: 'БЦ Меридиан', comment: 'Аренда помещения салона за период', date: getRandomDate(0.02, 0.1) },
    { sum: 27000, category: 'Бухгалтер', counterparty: 'ИП Петрова Капитал', comment: 'Бухгалтерское и налоговое сопровождение', date: getRandomDate(0.1, 0.25) },
    { sum: 19500, category: 'Коммунальные платежи', counterparty: 'Энергосбыт', comment: 'Оплата электроэнергии и водоснабжения', date: getRandomDate(0.2, 0.35) },
    { sum: 38000, category: 'Реклама, маркетинг, таргет', counterparty: 'ТаргетПро Агентство', comment: 'Контекстная реклама Яндекс и таргет ВК', date: getRandomDate(0.1, 0.5) },
    { sum: 11000, category: 'Программное обеспечение', counterparty: 'YCLIENTS', comment: 'Лицензия Yclients CRM и виджет онлайн-записи', date: getRandomDate(0.05, 0.2) },

    // Salaries (Past period vs current reporting period based on date)
    { sum: 55000, category: 'Зарплата', counterparty: 'Ковалева Лариса (Мастер)', comment: 'Зарплата за прошлый период по ведомости', date: getRandomDate(0.05, 0.25) },
    { sum: 38000, category: 'Зарплата', counterparty: 'Ковалева Лариса (Мастер)', comment: 'Авансовая выплата за текущий месяц', date: getRandomDate(0.6, 0.9) },
    { sum: 48000, category: 'Заработная плата', counterparty: 'Цветкова Анна (Администратор)', comment: 'Зарплата за прошлый период', date: getRandomDate(0.05, 0.25) },
    { sum: 22000, category: 'Зарплата', counterparty: 'Цветкова Анна (Администратор)', comment: 'Аванс администратора за текущий период', date: getRandomDate(0.65, 0.92) },
    { sum: 58000, category: 'Зарплата', counterparty: 'Власов Сергей (Топ-Барбер)', comment: 'Зарплата мастера за прошлый месяц', date: getRandomDate(0.08, 0.28) },
    { sum: 42000, category: 'Зарплата', counterparty: 'Власов Сергей (Топ-Барбер)', comment: 'Выплата за текущий период', date: getRandomDate(0.62, 0.95) },

    // Founders & other
    { sum: 160000, category: '2026/Учредители', counterparty: 'Учредитель (Ренат / Надежда)', comment: 'Выплата дивидендов учредителям', date: getRandomDate(0.8, 0.98) }
  ];

  const rawRecords = mockTransactions.map((tx, idx) => ({
    id: `yclients_tx_${idx + 1}_${Date.now()}`,
    sum: tx.sum,
    category: tx.category,
    counterparty: tx.counterparty,
    comment: tx.comment,
    serviceProduct: tx.serviceProduct || '',
    date: tx.date,
    dateStr: formatDateRu(tx.date),
    rawIndex: idx + 2
  }));

  // 2. Services rendered during the period
  const mockServices = [
    // Зал колористики / парикмахеры
    { service: 'Стрижка женская (модельная)', discount: 500, points: 200, subscriptions: 0, certificates: 500, clientAccounts: 0, money: 2800 },
    { service: 'Стрижка женская (модельная)', discount: 0, points: 0, subscriptions: 0, certificates: 1500, clientAccounts: 0, money: 2000 },
    { service: 'Стрижка женская (модельная)', discount: 300, points: 100, subscriptions: 0, certificates: 0, clientAccounts: 1200, money: 1900 },
    { service: 'Сложное окрашивание (Airtouch)', discount: 1500, points: 500, subscriptions: 0, certificates: 3000, clientAccounts: 2000, money: 8500 },
    { service: 'Сложное окрашивание (Airtouch)', discount: 0, points: 0, subscriptions: 0, certificates: 0, clientAccounts: 0, money: 15000 },
    { service: 'Уход для волос глубокое восстановление Kerastase', discount: 500, points: 300, subscriptions: 0, certificates: 2000, clientAccounts: 0, money: 2700 },
    { service: 'Окрашивание корней Matrix', discount: 0, points: 250, subscriptions: 0, certificates: 1500, clientAccounts: 0, money: 3250 },
    { service: 'Тонирование волос Color Sync', discount: 200, points: 100, subscriptions: 0, certificates: 0, clientAccounts: 800, money: 2900 },

    // Зал ногтевого сервиса
    { service: 'Маникюр аппаратный с покрытием гель-лак', discount: 200, points: 150, subscriptions: 2000, certificates: 0, clientAccounts: 0, money: 350 },
    { service: 'Маникюр аппаратный с покрытием гель-лак', discount: 0, points: 0, subscriptions: 0, certificates: 1000, clientAccounts: 500, money: 1000 },
    { service: 'Маникюр аппаратный с покрытием гель-лак', discount: 400, points: 200, subscriptions: 0, certificates: 0, clientAccounts: 0, money: 1900 },
    { service: 'Педикюр Smart классический', discount: 0, points: 100, subscriptions: 0, certificates: 0, clientAccounts: 1000, money: 2100 },
    { service: 'Педикюр Smart классический', discount: 300, points: 0, subscriptions: 2500, certificates: 0, clientAccounts: 0, money: 400 },
    { service: 'Наращивание ногтей гелем', discount: 0, points: 150, subscriptions: 0, certificates: 1000, clientAccounts: 0, money: 2850 },

    // Зал макияжей и укладок
    { service: 'Макияж вечерний / никах', discount: 300, points: 200, subscriptions: 0, certificates: 1000, clientAccounts: 0, money: 3500 },
    { service: 'Укладка на dyson + спа g-prof', discount: 0, points: 150, subscriptions: 0, certificates: 0, clientAccounts: 500, money: 2850 },
    { service: 'Прическа невесты', discount: 500, points: 0, subscriptions: 0, certificates: 2000, clientAccounts: 0, money: 4500 },
    { service: 'Дневной экспресс-макияж', discount: 150, points: 100, subscriptions: 0, certificates: 0, clientAccounts: 0, money: 1750 },

    // Зал бровей
    { service: 'Архитектура и коррекция бровей', discount: 100, points: 50, subscriptions: 0, certificates: 0, clientAccounts: 0, money: 1050 },
    { service: 'Ламинирование ресниц', discount: 200, points: 100, subscriptions: 0, certificates: 500, clientAccounts: 0, money: 1900 },
    { service: 'Окрашивание бровей хной BrowHenna', discount: 50, points: 50, subscriptions: 0, certificates: 0, clientAccounts: 0, money: 800 },

    // Мужской зал
    { service: 'Стрижка мужская Fade / Кроп', discount: 0, points: 100, subscriptions: 0, certificates: 0, clientAccounts: 0, money: 1900 },
    { service: 'Стрижка мужская Fade / Кроп', discount: 200, points: 0, subscriptions: 0, certificates: 0, clientAccounts: 500, money: 1300 },
    { service: 'Оформление бороды', discount: 0, points: 50, subscriptions: 0, certificates: 0, clientAccounts: 0, money: 1150 },
    { service: 'Камуфляж седины American Crew', discount: 0, points: 50, subscriptions: 0, certificates: 0, clientAccounts: 0, money: 1450 },

    // Прочие услуги
    { service: 'Аренда рабочего места (коворкинг мастера)', discount: 0, points: 0, subscriptions: 0, certificates: 0, clientAccounts: 0, money: 3500 },
    { service: 'Консультация трихолога с микровидеодиагностикой', discount: 200, points: 100, subscriptions: 0, certificates: 0, clientAccounts: 500, money: 2500 },
    { service: 'Сервисный сбор и сопровождение VIP-гостя', discount: 0, points: 0, subscriptions: 0, certificates: 1000, clientAccounts: 0, money: 1500 }
  ];

  const rawServices = mockServices.map((svc, idx) => {
    const rev = svc.points + svc.subscriptions + svc.certificates + svc.clientAccounts + svc.money;
    return {
      id: `yclients_svc_${idx + 1}_${Date.now()}`,
      rawIndex: idx + 2,
      service: svc.service,
      discount: svc.discount,
      points: svc.points,
      subscriptions: svc.subscriptions,
      certificates: svc.certificates,
      clientAccounts: svc.clientAccounts,
      money: svc.money,
      revenue: parseFloat(rev.toFixed(2))
    };
  });

  return {
    rawRecords,
    rawServices,
    companyInfo: {
      id: 984521,
      title: 'Салон Красоты «Престиж» (Yclients филиал)',
      city: 'Москва',
      timezone: 'Europe/Moscow',
      currency: '₽'
    }
  };
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Test connection endpoint
app.post('/api/yclients/test-connection', async (req, res) => {
  const { companyId, partnerToken, userToken } = req.body;

  if (!companyId || !companyId.toString().trim()) {
    return res.status(400).json({
      success: false,
      message: 'Укажите ID компании (филиала) Yclients'
    });
  }

  const cleanCompanyId = companyId.toString().trim();

  // If partnerToken or userToken is "DEMO" or empty, return demo connection success
  if (
    cleanCompanyId.toLowerCase() === 'demo' ||
    partnerToken === 'demo' ||
    userToken === 'demo' ||
    (!partnerToken && !userToken)
  ) {
    return res.json({
      success: true,
      isDemo: true,
      message: 'Подключение к демонстрационному филиалу Yclients успешно установлено!',
      company: {
        id: cleanCompanyId === 'demo' ? 984521 : parseInt(cleanCompanyId, 10) || 984521,
        title: 'Салон Красоты «Престиж» (Тестовый филиал)',
        city: 'Москва',
        timezone: 'Europe/Moscow',
        currency_short_title: '₽'
      }
    });
  }

  try {
    const headers = getYclientsHeaders(partnerToken, userToken);
    const apiUrl = `https://api.yclients.com/api/v1/company/${encodeURIComponent(cleanCompanyId)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr: any = {};
      try {
        parsedErr = JSON.parse(errText);
      } catch (e) {
        // ignore
      }

      const errorMsg = parsedErr.meta?.message || parsedErr.message || `HTTP ${response.status}: ${response.statusText}`;

      if (response.status === 401 || response.status === 403) {
        return res.status(response.status).json({
          success: false,
          message: `Ошибка авторизации в Yclients (${response.status}): Проверьте правильность Partner Token и User Token. ${errorMsg}`,
          details: parsedErr
        });
      }

      if (response.status === 404) {
        return res.status(404).json({
          success: false,
          message: `Филиал Yclients с ID ${cleanCompanyId} не найден. Проверьте ID компании в личном кабинете.`,
          details: parsedErr
        });
      }

      return res.status(response.status).json({
        success: false,
        message: `Ошибка связи с Yclients API: ${errorMsg}`,
        details: parsedErr
      });
    }

    const data = await response.json() as any;
    const companyData = data.data || data;

    return res.json({
      success: true,
      isDemo: false,
      message: `Соединение успешно! Филиал: «${companyData.title || cleanCompanyId}»`,
      company: {
        id: companyData.id || cleanCompanyId,
        title: companyData.title || `Филиал #${cleanCompanyId}`,
        city: companyData.city || '',
        timezone: companyData.timezone_name || companyData.timezone || 'Europe/Moscow',
        currency_short_title: companyData.currency_short_title || '₽'
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: `Сетевая ошибка при обращении к Yclients: ${error.message || 'Проверьте доступ в интернет'}`,
    });
  }
});

// 2. Fetch data (financial operations and/or services report)
app.post('/api/yclients/fetch-data', async (req, res) => {
  const {
    companyId,
    partnerToken,
    userToken,
    startDate,
    endDate,
    syncTransactions = true,
    syncServices = true,
    useDemo = false
  } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Укажите начальную и конечную дату периода (ГГГГ-ММ-ДД)'
    });
  }

  const cleanCompanyId = companyId ? companyId.toString().trim() : '';

  // Demo fallback condition
  const isDemoMode =
    useDemo ||
    cleanCompanyId.toLowerCase() === 'demo' ||
    partnerToken === 'demo' ||
    userToken === 'demo' ||
    !cleanCompanyId ||
    (!partnerToken && !userToken);

  if (isDemoMode) {
    const mock = generateMockYclientsData(startDate, endDate);
    return res.json({
      success: true,
      isDemo: true,
      startDate,
      endDate,
      records: syncTransactions ? mock.rawRecords : [],
      services: syncServices ? mock.rawServices : [],
      companyInfo: mock.companyInfo,
      summary: {
        totalTransactions: syncTransactions ? mock.rawRecords.length : 0,
        totalServices: syncServices ? mock.rawServices.length : 0,
        totalRevenue: mock.rawServices.reduce((sum, s) => sum + s.revenue, 0)
      }
    });
  }

  try {
    const headers = getYclientsHeaders(partnerToken, userToken);
    let rawRecords: any[] = [];
    let rawServices: any[] = [];
    let companyInfo: any = { id: cleanCompanyId };

    // Fetch company info first for metadata
    try {
      const compRes = await fetch(`https://api.yclients.com/api/v1/company/${encodeURIComponent(cleanCompanyId)}`, {
        method: 'GET',
        headers
      });
      if (compRes.ok) {
        const compJson = await compRes.json() as any;
        const cData = compJson.data || compJson;
        companyInfo = {
          id: cData.id || cleanCompanyId,
          title: cData.title || `Филиал #${cleanCompanyId}`,
          city: cData.city || '',
          currency: cData.currency_short_title || '₽'
        };
      }
    } catch (e) {
      // Continue even if company title fails
    }

    // 1. Fetch Financial Transactions if requested
    if (syncTransactions) {
      let page = 1;
      let hasMore = true;
      const maxPages = 15; // safeguard to avoid excessive calls

      while (hasMore && page <= maxPages) {
        // Try standard financial transactions endpoint
        const txUrl = `https://api.yclients.com/api/v1/transactions/${encodeURIComponent(cleanCompanyId)}?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&count=200&page=${page}`;
        
        let txRes = await fetch(txUrl, { method: 'GET', headers });

        // Fallback to /company/{id}/transactions if needed
        if (!txRes.ok && txRes.status === 404) {
          const altTxUrl = `https://api.yclients.com/api/v1/company/${encodeURIComponent(cleanCompanyId)}/transactions?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&count=200&page=${page}`;
          txRes = await fetch(altTxUrl, { method: 'GET', headers });
        }

        if (!txRes.ok) {
          // If transaction endpoint failed, log and stop pagination; we can supplement from records below
          hasMore = false;
          break;
        }

        const txJson = await txRes.json() as any;
        const items = txJson.data || [];

        if (Array.isArray(items) && items.length > 0) {
          items.forEach((item: any, idx: number) => {
            const rawDate = item.date || item.created_at || startDate;
            const parsedD = new Date(rawDate);
            const validD = isNaN(parsedD.getTime()) ? null : parsedD;
            const dateStr = validD ? formatDateRu(validD) : String(rawDate);

            const amt = typeof item.amount === 'number' ? Math.abs(item.amount) : parseFloat(String(item.amount || '0').replace(/\s/g, '').replace(',', '.')) || 0;
            const isExpense = item.type === 'expense' || item.type === 2 || (item.amount && item.amount < 0) || (item.expense_item && !item.income_item);

            const categoryName = 
              item.category?.title || 
              item.expense_item?.title || 
              item.income_item?.title || 
              item.article?.title || 
              (isExpense ? 'Прочие расходы' : 'Выручка с услуг');

            const counterpartyName = 
              item.counterparty || 
              item.supplier?.title || 
              item.supplier?.name || 
              item.client?.name || 
              item.staff?.name || 
              (isExpense ? 'Поставщик Yclients' : 'Клиент салона');

            const comment = [
              item.comment,
              item.account?.title,
              item.payment_type?.title
            ].filter(Boolean).join(' | ');

            const serviceProduct = item.service_title || item.goods_title || item.item_title || '';

            rawRecords.push({
              id: `yclients_tx_${item.id || rawRecords.length + 1}_${Date.now()}`,
              sum: amt,
              category: categoryName,
              counterparty: counterpartyName,
              comment: comment,
              serviceProduct: serviceProduct,
              date: validD,
              dateStr: dateStr,
              rawIndex: rawRecords.length + 2
            });
          });

          if (items.length < 200) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }
    }

    // 2. Fetch Visits / Records (Services and visits payments)
    let recordsPage = 1;
    let recordsHasMore = true;
    const maxRecordPages = 20;
    const allVisits: any[] = [];

    while (recordsHasMore && recordsPage <= maxRecordPages) {
      const recordsUrl = `https://api.yclients.com/api/v1/records/${encodeURIComponent(cleanCompanyId)}?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&count=200&page=${recordsPage}`;
      
      const recRes = await fetch(recordsUrl, { method: 'GET', headers });
      if (!recRes.ok) {
        recordsHasMore = false;
        break;
      }

      const recJson = await recRes.json() as any;
      const visits = recJson.data || [];

      if (Array.isArray(visits) && visits.length > 0) {
        allVisits.push(...visits);
        if (visits.length < 200) {
          recordsHasMore = false;
        } else {
          recordsPage++;
        }
      } else {
        recordsHasMore = false;
      }
    }

    // Process all visits into RawServiceRecords and optionally supplement transactions
    allVisits.forEach((visit: any, vIdx: number) => {
      const visitDateRaw = visit.date || visit.datetime || startDate;
      const visitD = new Date(visitDateRaw);
      const validVisitDate = isNaN(visitD.getTime()) ? null : visitD;
      const visitDateStr = validVisitDate ? formatDateRu(validVisitDate) : String(visitDateRaw);

      const clientName = visit.client?.name || 'Клиент салона';
      const staffName = visit.staff?.name || 'Мастер';
      const visitComment = visit.comment || `Визит #${visit.id || vIdx + 1} (${staffName})`;

      const servicesList = Array.isArray(visit.services) ? visit.services : [];

      servicesList.forEach((svc: any, sIdx: number) => {
        const sName = svc.title || svc.name || 'Услуга';
        const sDiscount = typeof svc.discount === 'number' ? svc.discount : parseFloat(String(svc.discount || '0')) || 0;
        const sCost = typeof svc.cost === 'number' ? svc.cost : parseFloat(String(svc.cost || '0')) || 0;
        const sFirstCost = typeof svc.first_cost === 'number' ? svc.first_cost : parseFloat(String(svc.first_cost || '0')) || sCost;

        // Payment breakdown if available
        let moneyVal = 0;
        let pointsVal = 0;
        let subsVal = 0;
        let certVal = 0;
        let clientAccVal = 0;

        if (Array.isArray(visit.paid) && visit.paid.length > 0) {
          // If detailed paid methods exist
          visit.paid.forEach((p: any) => {
            const pTitle = (p.title || '').toLowerCase();
            const pAmt = Number(p.amount || 0);
            if (pTitle.includes('карта') || pTitle.includes('нал') || pTitle.includes('терминал') || pTitle.includes('банк') || pTitle.includes('сбп')) {
              moneyVal += pAmt;
            } else if (pTitle.includes('сертифик')) {
              certVal += pAmt;
            } else if (pTitle.includes('абонемент')) {
              subsVal += pAmt;
            } else if (pTitle.includes('баланс') || pTitle.includes('счет')) {
              clientAccVal += pAmt;
            } else if (pTitle.includes('балл') || pTitle.includes('бонус')) {
              pointsVal += pAmt;
            } else {
              moneyVal += pAmt;
            }
          });
          // normalize to single service proportion
          if (servicesList.length > 1) {
            const ratio = 1 / servicesList.length;
            moneyVal = parseFloat((moneyVal * ratio).toFixed(2));
            pointsVal = parseFloat((pointsVal * ratio).toFixed(2));
            subsVal = parseFloat((subsVal * ratio).toFixed(2));
            certVal = parseFloat((certVal * ratio).toFixed(2));
            clientAccVal = parseFloat((clientAccVal * ratio).toFixed(2));
          }
        } else {
          // Standard cash/bank payment fallback
          moneyVal = Math.max(0, sCost > 0 ? sCost - sDiscount : sFirstCost);
        }

        const calculatedRevenue = parseFloat((pointsVal + subsVal + certVal + clientAccVal + moneyVal).toFixed(2));

        if (syncServices) {
          rawServices.push({
            id: `yclients_svc_${visit.id || vIdx}_${svc.id || sIdx}_${Date.now()}`,
            rawIndex: rawServices.length + 2,
            service: sName,
            discount: sDiscount,
            points: pointsVal,
            subscriptions: subsVal,
            certificates: certVal,
            clientAccounts: clientAccVal,
            money: moneyVal,
            revenue: calculatedRevenue > 0 ? calculatedRevenue : sCost
          });
        }

        // If financial transactions were not provided via cash endpoint, generate them from visits
        if (syncTransactions && rawRecords.length === 0 && calculatedRevenue > 0) {
          rawRecords.push({
            id: `yclients_rec_tx_${visit.id || vIdx}_${sIdx}`,
            sum: calculatedRevenue,
            category: 'Выручка с услуг',
            counterparty: clientName,
            comment: `${visitComment} | Мастер: ${staffName}`,
            serviceProduct: sName,
            date: validVisitDate,
            dateStr: visitDateStr,
            rawIndex: rawRecords.length + 2
          });
        }
      });
    });

    // If both queries came up empty due to strict enterprise permissions or sandbox, offer mock with warning
    if (rawRecords.length === 0 && rawServices.length === 0) {
      const mock = generateMockYclientsData(startDate, endDate);
      return res.json({
        success: true,
        isDemo: true,
        startDate,
        endDate,
        records: syncTransactions ? mock.rawRecords : [],
        services: syncServices ? mock.rawServices : [],
        companyInfo: companyInfo.title ? companyInfo : mock.companyInfo,
        warning: 'За выбранный период в Yclients не найдено завершенных визитов или финансовых операций. Загружены демонстрационные данные для предварительного просмотра.',
        summary: {
          totalTransactions: syncTransactions ? mock.rawRecords.length : 0,
          totalServices: syncServices ? mock.rawServices.length : 0,
          totalRevenue: mock.rawServices.reduce((sum, s) => sum + s.revenue, 0)
        }
      });
    }

    return res.json({
      success: true,
      isDemo: false,
      startDate,
      endDate,
      records: rawRecords,
      services: rawServices,
      companyInfo,
      summary: {
        totalTransactions: rawRecords.length,
        totalServices: rawServices.length,
        totalRevenue: rawServices.reduce((sum, s) => sum + s.revenue, 0)
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: `Ошибка при обработке запроса к Yclients: ${error.message || 'Неизвестная ошибка'}`
    });
  }
});

// -------------------------------------------------------------
// Vite Server Integration for Dev & Production
// -------------------------------------------------------------
async function initServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
