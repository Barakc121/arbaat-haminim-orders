const SHEET_NAME = "Orders";

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "id",
      "createdAt",
      "name",
      "phone",
      "product",
      "quantity",
      "deliveryRequired",
      "deliveryAddress",
    ]);
  }
}

function doGet() {
  const sheet = getSheet_();
  ensureHeader_(sheet);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift() || [];
  const orders = values
    .filter((row) => row.some((value) => String(value).trim() !== ""))
    .map((row) => {
      const order = {};
      headers.forEach((header, index) => {
        order[header] = row[index];
      });
      order.quantity = Number(order.quantity) || 1;
      order.deliveryRequired = String(order.deliveryRequired).toLowerCase() === "true";
      return order;
    });

  return ContentService
    .createTextOutput(JSON.stringify({ orders }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  const data = JSON.parse(event.postData.contents);
  const sheet = getSheet_();
  ensureHeader_(sheet);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const orderId = String(data.id || Utilities.getUuid());
    const rowCount = sheet.getLastRow() - 1;
    const existingIds = rowCount > 0
      ? sheet.getRange(2, 1, rowCount, 1).getValues().flat().map((value) => String(value))
      : [];

    if (existingIds.includes(orderId)) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, duplicate: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    sheet.appendRow([
      orderId,
      new Date(),
      data.name || "",
      data.phone || "",
      data.product || "",
      Number(data.quantity) || 1,
      Boolean(data.deliveryRequired),
      data.deliveryAddress || "",
    ]);
  } finally {
    lock.releaseLock();
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
