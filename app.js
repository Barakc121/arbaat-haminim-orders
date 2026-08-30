const STORAGE_KEY = 'arbaat-haminim-orders-v1';

const defaultProducts = ['מהודר א', 'מהודר ב', 'כשר לברכה', 'סט רגיל', 'אחר'];

const state = {
  orders: loadOrders(),
};

const form = document.getElementById('orderForm');
const customerNameInput = document.getElementById('customerName');
const customerPhoneInput = document.getElementById('customerPhone');
const productTypeInput = document.getElementById('productType');
const quantityInput = document.getElementById('quantity');
const ordersTableBody = document.getElementById('ordersTableBody');
const customersTableBody = document.getElementById('customersTableBody');
const summaryCards = document.getElementById('summaryCards');
const csvInput = document.getElementById('csvFileInput');
const resetBtn = document.getElementById('resetDataBtn');
const exportBtn = document.getElementById('downloadCsvBtn');

function loadOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Failed to load orders:', error);
    return [];
  }
}

function saveOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.orders));
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeHeader(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]/g, '')
    .replace(/\s+/g, '');
}

function parseNumber(value) {
  const cleaned = String(value ?? '').replace(/[^0-9]/g, '');
  const numericValue = Number.parseInt(cleaned || '0', 10);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1;
}

function getCanonicalProduct(value) {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized.includes('מהודר') && normalized.includes('א')) return 'מהודר א';
  if (normalized.includes('מהודר') && normalized.includes('ב')) return 'מהודר ב';
  if (normalized.includes('כשר') && normalized.includes('ברכה')) return 'כשר לברכה';
  if (normalized.includes('סט') && normalized.includes('רגיל')) return 'סט רגיל';

  return defaultProducts.find((product) => normalizeText(product).toLowerCase() === normalized) || normalizeText(value) || 'אחר';
}

function parseCSVLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function detectSeparator(lines) {
  const sample = lines.find((line) => line.includes(',') || line.includes(';')) || '';
  const commas = (sample.match(/,/g) || []).length;
  const semicolons = (sample.match(/;/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

function parseCSVText(text) {
  const cleaned = text.replace(/\r/g, '');
  const lines = cleaned.split('\n').filter((line) => line.trim());
  if (lines.length === 0) return [];

  const separator = detectSeparator(lines);
  const rows = lines.map((line) => parseCSVLine(line).map((cell) => cell.trim()));
  const [headerRow, ...dataRows] = rows;

  const headerMap = {};
  headerRow.forEach((header, index) => {
    const key = normalizeHeader(header);
    headerMap[key] = index;
  });

  const matchedIndexes = {
    name: findHeaderIndex(headerMap, ['שםלקוח', 'שם', 'customername', 'customer', 'לקוח', 'name']),
    phone: findHeaderIndex(headerMap, ['טלפון', 'phone', 'פלאפון', 'מספר', 'mobile']),
    product: findHeaderIndex(headerMap, ['סט', 'type', 'product', 'מוצר', 'שםסט', 'סוג', 'סטהזמנה']),
    quantity: findHeaderIndex(headerMap, ['כמות', 'quantity', 'qty', 'מספריחידות', 'כמותהזמנה'])
  };

  return dataRows
    .map((row) => {
      const name = row[matchedIndexes.name] ?? row[0] ?? '';
      const phone = row[matchedIndexes.phone] ?? row[1] ?? '';
      const product = row[matchedIndexes.product] ?? row[2] ?? '';
      const quantity = row[matchedIndexes.quantity] ?? row[3] ?? '1';

      if (!normalizeText(name) || !normalizeText(product)) {
        return null;
      }

      return {
        id: Date.now() + Math.random(),
        name: normalizeText(name),
        phone: normalizeText(phone),
        product: getCanonicalProduct(product),
        quantity: parseNumber(quantity),
        note: ''
      };
    })
    .filter(Boolean);
}

function findHeaderIndex(headerMap, candidates) {
  const found = candidates.find((candidate) => headerMap[candidate] !== undefined);
  return found ? headerMap[found] : -1;
}

function renderSummary() {
  const totalsByProduct = {};
  let totalItems = 0;

  for (const order of state.orders) {
    const product = order.product || 'אחר';
    totalsByProduct[product] = (totalsByProduct[product] || 0) + Number(order.quantity || 0);
    totalItems += Number(order.quantity || 0);
  }

  const cards = [
    { label: 'מספר הזמנות', value: state.orders.length },
    { label: 'כמות כוללת', value: totalItems },
    ...defaultProducts.map((product) => ({
      label: product,
      value: totalsByProduct[product] || 0
    }))
  ];

  summaryCards.innerHTML = cards
    .map(
      (card) => `
        <div class="stat-card">
          <h3>${card.label}</h3>
          <strong>${card.value}</strong>
        </div>
      `
    )
    .join('');
}

function renderOrders() {
  if (!state.orders.length) {
    ordersTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">עדיין אין הזמנות</td></tr>';
    return;
  }

  ordersTableBody.innerHTML = state.orders
    .map(
      (order) => `
        <tr>
          <td>${escapeHtml(order.name)}</td>
          <td>${escapeHtml(order.phone || '—')}</td>
          <td>${escapeHtml(order.product)}</td>
          <td>${order.quantity}</td>
          <td>${escapeHtml(order.note || '—')}</td>
          <td><button class="delete-btn" data-id="${order.id}">מחק</button></td>
        </tr>
      `
    )
    .join('');

  ordersTableBody.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', (event) => {
      const id = Number(event.currentTarget.dataset.id);
      state.orders = state.orders.filter((order) => Number(order.id) !== id);
      saveOrders();
      render();
    });
  });
}

function renderCustomers() {
  const customerMap = new Map();

  for (const order of state.orders) {
    if (!customerMap.has(order.name)) {
      customerMap.set(order.name, { name: order.name, phone: order.phone || '—', products: [], total: 0 });
    }

    const customer = customerMap.get(order.name);
    customer.products.push(`${order.product} × ${order.quantity}`);
    customer.total += Number(order.quantity || 0);
  }

  const rows = Array.from(customerMap.values());

  if (!rows.length) {
    customersTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">אין לקוחות להצגה</td></tr>';
    return;
  }

  customersTableBody.innerHTML = rows
    .map(
      (customer) => `
        <tr>
          <td>${escapeHtml(customer.name)}</td>
          <td>${escapeHtml(customer.phone)}</td>
          <td>${escapeHtml(customer.products.join(', '))}</td>
          <td>${customer.total}</td>
        </tr>
      `
    )
    .join('');
}

function render() {
  renderSummary();
  renderOrders();
  renderCustomers();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const order = {
    id: Date.now() + Math.random(),
    name: normalizeText(customerNameInput.value),
    phone: normalizeText(customerPhoneInput.value),
    product: getCanonicalProduct(productTypeInput.value),
    quantity: parseNumber(quantityInput.value),
    note: ''
  };

  if (!order.name || !order.phone || !order.product) {
    alert('אנא מלא כל השדות');
    return;
  }

  state.orders.push(order);
  saveOrders();
  render();
  form.reset();
  quantityInput.value = '1';
  customerNameInput.focus();
});

csvInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (loadedEvent) => {
    const csvText = String(loadedEvent.target?.result || '');
    const rows = parseCSVText(csvText);
    if (!rows.length) {
      alert('לא נמצאו נתונים תקינים ב-CSV. ודא שהעמודות הן: שם, טלפון, סט, כמות');
      return;
    }

    state.orders = [...state.orders, ...rows];
    saveOrders();
    render();
    csvInput.value = '';
  };

  reader.readAsText(file);
});

resetBtn.addEventListener('click', () => {
  const confirmed = window.confirm('האם למחוק את כל ההזמנות?');
  if (!confirmed) return;

  state.orders = [];
  saveOrders();
  render();
});

exportBtn.addEventListener('click', () => {
  if (!state.orders.length) {
    alert('אין הזמנות לייצוא');
    return;
  }

  const rows = [
    ['שם', 'טלפון', 'סט', 'כמות'],
    ...state.orders.map((order) => [order.name, order.phone, order.product, order.quantity])
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'arbaat-haminim-orders.csv';
  link.click();
  URL.revokeObjectURL(url);
});

render();
