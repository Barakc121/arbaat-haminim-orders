## חיבור הזמנות משותף

האתר מאפשר ללקוח להזמין בלי הרשמה. כדי שההזמנה תופיע אצל המנהל מכל מחשב:

1. פתח את Google Sheet שבו רוצים לשמור את ההזמנות.
2. בחר `Extensions` ואז `Apps Script`.
3. הדבק את התוכן של `google-apps-script.gs` ושמור.
4. בחר `Deploy` ואז `New deployment`.
5. בחר `Web app`, הגדר `Execute as: Me` ואת הגישה ל־`Anyone`, ופרסם.
6. העתק את כתובת ה־Web app והדבק אותה במקום `PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` בקובץ `app.js`.
7. העלה מחדש את הקבצים לאתר.

הלקוח אינו צריך חשבון Google. דף המנהל מוגן בסיסמה `325276319`.
