const STORAGE_KEY = "arbaat-haminim-orders-v2";
const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSKXTurywqKCwdpag0pR4sg3WLISAptW8M6CB0HIhXhjIXyWycbzC7onXOBXwfmUvWOKwIBquSkY9L7/pub?output=csv&gid=0";
const ORDERS_API_URL = "https://script.google.com/macros/s/AKfycbyvyYsBneX50VaKTu7a09srH7uYPa6OVn1FjhFe4n1TiZ0F2JrjrSFRST_10bT9srNDgQ/exec";
const ADMIN_PASSWORD = "325276319";
const state = {
  orders: [],
};

const defaultProducts = [
  "מהודר א",
  "מהודר א מרוקאי",
  "מהודר א תימני",
  "מהודר א א",
  "מהודר א א מרוקאי",
  "מהודר א א תימני",
  "כשר לברכה",
  "כשר לברכה מרוקאי",
  "כשר לברכה תימני",
];

const form = document.getElementById("orderForm");
const customerNameInput = document.getElementById("customerName");
const customerPhoneInput = document.getElementById("customerPhone");
const productTypeInput = document.getElementById("productType");
const quantityInput = document.getElementById("quantity");
const needsDeliveryInput = document.getElementById("needsDelivery");
const deliveryAddressField = document.getElementById("deliveryAddressField");
const deliveryAddressInput = document.getElementById("deliveryAddress");
const orderStatus = document.getElementById("orderStatus");
const ordersTableBody = document.getElementById("ordersTableBody");
const customersTableBody = document.getElementById("customersTableBody");
const summaryCards = document.getElementById("summaryCards");
const csvInput = document.getElementById("csvFileInput");
const resetBtn = document.getElementById("resetDataBtn");
const exportBtn = document.getElementById("downloadCsvBtn");
const googleSheetBtn = document.getElementById("loadGoogleSheetBtn");
const pageMode = document.body.dataset.mode;
const submitBtn = form?.querySelector('button[type="submit"]');
let isSubmitting = false;

function toggleDeliveryFields() {
  if (!needsDeliveryInput) return;
  const shouldShow = needsDeliveryInput.checked;
  if (deliveryAddressField) {
    deliveryAddressField.classList.toggle("hidden", !shouldShow);
  }
  if (deliveryAddressInput && !shouldShow) {
    deliveryAddressInput.value = "";
  }
}

function showOrderStatus(message) {
  if (orderStatus) orderStatus.textContent = message;
}

if (needsDeliveryInput) {
  needsDeliveryInput.addEventListener("change", toggleDeliveryFields);
  toggleDeliveryFields();
}

state.orders = loadOrders();

if (pageMode === "admin") {
  const password = window.prompt("הכנס סיסמה למנהל");
  if (password !== ADMIN_PASSWORD) {
    window.location.href = "index.html";
    throw new Error("Unauthorized");
  }
}

if (pageMode === "public") {
  const adminControls = document.querySelectorAll(
    "#resetDataBtn, #loadGoogleSheetBtn, #downloadCsvBtn, #csvFileInput, .delete-btn",
  );
  adminControls.forEach((control) => control.remove());
}

function loadOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to load orders:", error);
    return [];
  }
}

function saveOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.orders));
}

function hasOrdersApi() {
  return ORDERS_API_URL.startsWith("https://") && !ORDERS_API_URL.includes("PASTE_");
}

async function sendOrderToServer(order) {
  if (!hasOrdersApi()) return false;

  const response = await fetch(ORDERS_API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(order),
  });

  return response.type === "opaque" || response.ok;
}

async function loadOrdersFromServer() {
  if (!hasOrdersApi()) return;

  try {
    const response = await fetch(`${ORDERS_API_URL}?action=list`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Orders request failed: ${response.status}`);

    const payload = await response.json();
    const orders = Array.isArray(payload) ? payload : payload.orders;
    if (!Array.isArray(orders)) throw new Error("Invalid orders response");

    state.orders = orders;
    saveOrders();
    render();
  } catch (error) {
    console.error("Failed to load orders from server:", error);
    showOrderStatus("לא ניתן לטעון הזמנות מהשרת");
  }
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeHeader(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]/g, "")
    .replace(/\s+/g, "");
}

function parseNumber(value) {
  const cleaned = String(value ?? "").replace(/[^0-9]/g, "");
  const numericValue = Number.parseInt(cleaned || "0", 10);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1;
}

function getCanonicalProduct(value) {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized.includes("מהודר") && normalized.includes("א") && normalized.includes("א") && normalized.includes("מרוקאי")) return "מהודר א א מרוקאי";
  if (normalized.includes("מהודר") && normalized.includes("א") && normalized.includes("א") && normalized.includes("תימני")) return "מהודר א א תימני";
  if (normalized.includes("מהודר") && normalized.includes("א") && normalized.includes("א")) return "מהודר א א";

  if (normalized.includes("מהודר") && normalized.includes("א") && normalized.includes("מרוקאי")) return "מהודר א מרוקאי";
  if (normalized.includes("מהודר") && normalized.includes("א") && normalized.includes("תימני")) return "מהודר א תימני";
  if (normalized.includes("מהודר") && normalized.includes("א")) return "מהודר א";

  if (normalized.includes("מהודר") && normalized.includes("ב")) return "מהודר ב";

  if (normalized.includes("כשר") && normalized.includes("ברכה") && normalized.includes("מרוקאי")) return "כשר לברכה מרוקאי";
  if (normalized.includes("כשר") && normalized.includes("ברכה") && normalized.includes("תימני")) return "כשר לברכה תימני";
  if (normalized.includes("כשר") && normalized.includes("ברכה")) return "כשר לברכה";

  if (normalized.includes("מהודר") && normalized.includes("מרוקאי")) return "מהודר א מרוקאי";
  if (normalized.includes("מהודר") && normalized.includes("תימני")) return "מהודר א תימני";
  if (normalized.includes("סט") && normalized.includes("רגיל")) return "סט רגיל";

  return defaultProducts.find((product) => normalizeText(product).toLowerCase() === normalized) || normalizeText(value) || "אחר";
}

function parseCSVLine(line) {
  const cells = [];
  let current = "";
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
    } else if ((char === "," || char === ";") && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function detectSeparator(lines) {
  const sample =
    lines.find((line) => line.includes(",") || line.includes(";")) || "";
  const commas = (sample.match(/,/g) || []).length;
  const semicolons = (sample.match(/;/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCSVText(text) {
  const cleaned = text.replace(/\r/g, "");
  const lines = cleaned.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return [];

  const separator = detectSeparator(lines);
  const rows = lines.map((line) =>
    parseCSVLine(line).map((cell) => cell.trim()),
  );
  const [headerRow, ...dataRows] = rows;

  const headerMap = {};
  headerRow.forEach((header, index) => {
    const key = normalizeHeader(header);
    headerMap[key] = index;
  });

  const matchedIndexes = {
    name: findHeaderIndex(headerMap, [
      "שםלקוח",
      "שם",
      "customername",
      "customer",
      "לקוח",
      "name",
    ]),
    phone: findHeaderIndex(headerMap, [
      "טלפון",
      "phone",
      "פלאפון",
      "מספר",
      "mobile",
    ]),
    product: findHeaderIndex(headerMap, [
      "סט",
      "type",
      "product",
      "מוצר",
      "שםסט",
      "סוג",
      "סטהזמנה",
    ]),
    quantity: findHeaderIndex(headerMap, [
      "כמות",
      "quantity",
      "qty",
      "מספריחידות",
      "כמותהזמנה",
    ]),
    deliveryRequired: findHeaderIndex(headerMap, [
      "צריךמשלוח",
      "needsdelivery",
      "delivery",
      "משלוח",
      "שולח",
    ]),
    deliveryAddress: findHeaderIndex(headerMap, [
      "כתובתמשלוח",
      "כתובת",
      "address",
      "deliveryaddress",
      "לשוםמשלוח",
    ]),
  };

  return dataRows
    .map((row) => {
      const name = row[matchedIndexes.name] ?? row[0] ?? "";
      const phone = row[matchedIndexes.phone] ?? row[1] ?? "";
      const product = row[matchedIndexes.product] ?? row[2] ?? "";
      const quantity = row[matchedIndexes.quantity] ?? row[3] ?? "1";
      const deliveryRequiredValue = row[matchedIndexes.deliveryRequired] ?? "";
      const deliveryAddressValue = row[matchedIndexes.deliveryAddress] ?? "";

      if (!normalizeText(name)) {
        return null;
      }

      const shippingNeeded = ["כן", "yes", "true", "1"].includes(
        normalizeText(deliveryRequiredValue).toLowerCase(),
      );

      return {
        id: Date.now() + Math.random(),
        name: normalizeText(name),
        phone: normalizeText(phone) || "—",
        product: normalizeText(product)
          ? getCanonicalProduct(product)
          : "לא נקבע",
        quantity: normalizeText(quantity) ? parseNumber(quantity) : 1,
        note: "",
        deliveryRequired: shippingNeeded,
        deliveryAddress: shippingNeeded
          ? normalizeText(deliveryAddressValue) || "לא צוינה כתובת"
          : "",
      };
    })
    .filter(Boolean);
}

function findHeaderIndex(headerMap, candidates) {
  const found = candidates.find(
    (candidate) => headerMap[candidate] !== undefined,
  );
  return found ? headerMap[found] : -1;
}

function renderSummary() {
  if (!summaryCards) return;

  const totalsByProduct = {};
  let totalItems = 0;

  for (const order of state.orders) {
    const product = order.product || "אחר";
    totalsByProduct[product] =
      (totalsByProduct[product] || 0) + Number(order.quantity || 0);
    totalItems += Number(order.quantity || 0);
  }

  const cards = [
    { label: "מספר הזמנות", value: state.orders.length },
    { label: "כמות כוללת", value: totalItems },
    ...defaultProducts.map((product) => ({
      label: product,
      value: totalsByProduct[product] || 0,
    })),
  ];

  summaryCards.innerHTML = cards
    .map(
      (card) => `
        <div class="stat-card">
          <h3>${card.label}</h3>
          <strong>${card.value}</strong>
        </div>
      `,
    )
    .join("");
}

function renderOrders() {
  if (!ordersTableBody) return;

  if (!state.orders.length) {
    ordersTableBody.innerHTML =
      '<tr><td colspan="8" class="empty-state">עדיין אין הזמנות</td></tr>';
    return;
  }

  ordersTableBody.innerHTML = state.orders
    .map(
      (order) => `
        <tr>
          <td>${escapeHtml(order.name)}</td>
          <td>${escapeHtml(order.phone || "—")}</td>
          <td>${escapeHtml(order.product)}</td>
          <td>${order.quantity}</td>
          <td>${order.deliveryRequired ? "כן" : "לא"}</td>
          <td>${escapeHtml(order.deliveryRequired ? (order.deliveryAddress || "לא צוינה כתובת") : "—")}</td>
          <td>${escapeHtml(order.note || "—")}</td>
          <td><button class="delete-btn" data-id="${order.id}">מחק</button></td>
        </tr>
      `,
    )
    .join("");

  ordersTableBody.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = Number(event.currentTarget.dataset.id);
      state.orders = state.orders.filter((order) => Number(order.id) !== id);
      saveOrders();
      render();
    });
  });
}

function renderCustomers() {
  if (!customersTableBody) return;

  const customerMap = new Map();

  for (const order of state.orders) {
    if (!customerMap.has(order.name)) {
      customerMap.set(order.name, {
        name: order.name,
        phone: order.phone || "—",
        products: [],
        total: 0,
      });
    }

    const customer = customerMap.get(order.name);
    customer.products.push(`${order.product} × ${order.quantity}`);
    customer.total += Number(order.quantity || 0);
  }

  const rows = Array.from(customerMap.values());

  if (!rows.length) {
    customersTableBody.innerHTML =
      '<tr><td colspan="4" class="empty-state">אין לקוחות להצגה</td></tr>';
    return;
  }

  customersTableBody.innerHTML = rows
    .map(
      (customer) => `
        <tr>
          <td>${escapeHtml(customer.name)}</td>
          <td>${escapeHtml(customer.phone)}</td>
          <td>${escapeHtml(customer.products.join(", "))}</td>
          <td>${customer.total}</td>
        </tr>
      `,
    )
    .join("");
}

function render() {
  renderSummary();
  renderOrders();
  renderCustomers();
}

function loadGoogleSheetData() {
  fetch(GOOGLE_SHEET_CSV_URL, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Google Sheets request failed: ${response.status}`);
      }
      return response.text();
    })
    .then((csvText) => {
      const rows = parseCSVText(csvText);
      if (!rows.length) {
        console.warn("Google Sheets CSV parsed with no valid rows");
        return;
      }

      state.orders = rows;
      saveOrders();
      render();
    })
    .catch((error) => {
      console.error("Failed to load Google Sheet:", error);
    });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting) return;

  if (needsDeliveryInput && needsDeliveryInput.checked && !normalizeText(deliveryAddressInput?.value)) {
    showOrderStatus("יש למלא כתובת למשלוח");
    alert("אנא כתוב כתובת משלוח מלאה");
    return;
  }

  const order = {
    id: Date.now() + Math.random(),
    name: normalizeText(customerNameInput.value),
    phone: normalizeText(customerPhoneInput.value),
    product: getCanonicalProduct(productTypeInput.value),
    quantity: parseNumber(quantityInput.value),
    note: "",
    deliveryRequired: Boolean(needsDeliveryInput && needsDeliveryInput.checked),
    deliveryAddress:
      needsDeliveryInput && needsDeliveryInput.checked
        ? normalizeText(deliveryAddressInput.value)
        : "",
  };

  if (!order.name || !order.phone || !order.product) {
    showOrderStatus("יש למלא את כל השדות");
    alert("אנא מלא כל השדות");
    return;
  }

  isSubmitting = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "שולח...";
  }
  showOrderStatus("קיבלנו את הפרטים, שולח את ההזמנה...");

  try {
    const sentToServer = await sendOrderToServer(order);
    state.orders.push(order);
    saveOrders();
    render();

    if (sentToServer) {
      showOrderStatus("ההזמנה התקבלה! ניצור איתך קשר בהקדם.");
    } else {
      showOrderStatus("ההזמנה נשמרה במכשיר זה בלבד. יש להגדיר חיבור לשרת.");
    }
  } catch (error) {
    console.error("Failed to send order:", error);
    showOrderStatus("ההזמנה לא נשלחה. נסה שוב בעוד רגע.");
    alert("לא הצלחנו לשלוח את ההזמנה. נסה שוב.");
    return;
  } finally {
    isSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = pageMode === "admin" ? "הוסף להזמנות" : "שלח הזמנה";
    }
  }

  form.reset();
  quantityInput.value = "1";
  if (needsDeliveryInput) {
    needsDeliveryInput.checked = false;
    toggleDeliveryFields();
  }
  customerNameInput.focus();

  if (pageMode === "public") {
    return;
  }

  if (pageMode === "admin") {
    showOrderStatus("ההזמנה נוספה בהצלחה.");
    alert("ההזמנה נוספה בהצלחה! המשך בניהול ההזמנות.");
  }
});

if (csvInput) csvInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (loadedEvent) => {
    const csvText = String(loadedEvent.target?.result || "");
    const rows = parseCSVText(csvText);
    if (!rows.length) {
      alert(
        "לא נמצאו נתונים תקינים ב-CSV. ודא שהעמודות הן: שם, טלפון, סט, כמות",
      );
      return;
    }

    state.orders = [...state.orders, ...rows];
    saveOrders();
    render();
    csvInput.value = "";
  };

  reader.readAsText(file);
});

if (resetBtn) resetBtn.addEventListener("click", () => {
  const confirmed = window.confirm("האם למחוק את כל ההזמנות?");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  state.orders = [];
  saveOrders();
  render();
});

if (exportBtn) exportBtn.addEventListener("click", () => {
  if (!state.orders.length) {
    alert("אין הזמנות לייצוא");
    return;
  }

  const rows = [
    ["שם", "טלפון", "סט", "כמות"],
    ...state.orders.map((order) => [
      order.name,
      order.phone,
      order.product,
      order.quantity,
    ]),
  ];

  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "arbaat-haminim-orders.csv";
  link.click();
  URL.revokeObjectURL(url);
});

if (googleSheetBtn) {
  googleSheetBtn.addEventListener("click", () => {
    if (hasOrdersApi()) {
      loadOrdersFromServer();
    } else {
      loadGoogleSheetData();
    }
  });
}

if (pageMode === "admin") loadOrdersFromServer();

render();
