const fs = require("fs");
const path = require("path");
const {
  withAndroidManifest,
  withStringsXml,
  withDangerousMod,
} = require("@expo/config-plugins");

/**
 * Plugin de Expo para habilitar los App Shortcuts nativos de Android.
 *
 * Al mantener presionado el icono de Cajita en cualquier celular Android,
 * el sistema despliega el menú contextual con:
 *  - Menú de acciones (¿Qué deseas hacer?)
 *  - Registrar gasto
 *  - Registrar ingreso
 *  - Transferencia
 *  - Mi efectivo
 */

const SHORTCUTS_XML_CONTENT = `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
    <shortcut
        android:shortcutId="quick_action"
        android:enabled="true"
        android:icon="@mipmap/ic_launcher"
        android:shortcutShortLabel="@string/shortcut_menu_short"
        android:shortcutLongLabel="@string/shortcut_menu_long">
        <intent
            android:action="android.intent.action.VIEW"
            android:targetPackage="com.cajita.app"
            android:targetClass="com.cajita.app.MainActivity"
            android:data="cajita://quick-action" />
    </shortcut>
    <shortcut
        android:shortcutId="new_expense"
        android:enabled="true"
        android:icon="@mipmap/ic_launcher"
        android:shortcutShortLabel="@string/shortcut_expense_short"
        android:shortcutLongLabel="@string/shortcut_expense_long">
        <intent
            android:action="android.intent.action.VIEW"
            android:targetPackage="com.cajita.app"
            android:targetClass="com.cajita.app.MainActivity"
            android:data="cajita://transaction/new?mode=expense" />
    </shortcut>
    <shortcut
        android:shortcutId="new_income"
        android:enabled="true"
        android:icon="@mipmap/ic_launcher"
        android:shortcutShortLabel="@string/shortcut_income_short"
        android:shortcutLongLabel="@string/shortcut_income_long">
        <intent
            android:action="android.intent.action.VIEW"
            android:targetPackage="com.cajita.app"
            android:targetClass="com.cajita.app.MainActivity"
            android:data="cajita://transaction/new?mode=income" />
    </shortcut>
    <shortcut
        android:shortcutId="new_transfer"
        android:enabled="true"
        android:icon="@mipmap/ic_launcher"
        android:shortcutShortLabel="@string/shortcut_transfer_short"
        android:shortcutLongLabel="@string/shortcut_transfer_long">
        <intent
            android:action="android.intent.action.VIEW"
            android:targetPackage="com.cajita.app"
            android:targetClass="com.cajita.app.MainActivity"
            android:data="cajita://transfer/new" />
    </shortcut>
    <shortcut
        android:shortcutId="cash"
        android:enabled="true"
        android:icon="@mipmap/ic_launcher"
        android:shortcutShortLabel="@string/shortcut_cash_short"
        android:shortcutLongLabel="@string/shortcut_cash_long">
        <intent
            android:action="android.intent.action.VIEW"
            android:targetPackage="com.cajita.app"
            android:targetClass="com.cajita.app.MainActivity"
            android:data="cajita://cash" />
    </shortcut>
</shortcuts>
`;

const STRINGS_TO_ADD = [
  { name: "shortcut_menu_short", value: "Menú de acciones" },
  { name: "shortcut_menu_long", value: "¿Qué deseas hacer?" },
  { name: "shortcut_expense_short", value: "Registrar gasto" },
  { name: "shortcut_expense_long", value: "Anotar un gasto rápido" },
  { name: "shortcut_income_short", value: "Registrar ingreso" },
  { name: "shortcut_income_long", value: "Anotar un ingreso" },
  { name: "shortcut_transfer_short", value: "Transferencia" },
  { name: "shortcut_transfer_long", value: "Mover dinero entre cuentas" },
  { name: "shortcut_cash_short", value: "Mi efectivo" },
  { name: "shortcut_cash_long", value: "Billetes y monedas" },
];

function withAndroidShortcuts(config) {
  // 1. Modifica AndroidManifest.xml para declarar meta-data de shortcuts en MainActivity
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (!mainApplication) return config;

    const mainActivity = mainApplication.activity?.find(
      (a) => a.$["android:name"] === ".MainActivity",
    );
    if (!mainActivity) return config;

    if (!mainActivity["meta-data"]) {
      mainActivity["meta-data"] = [];
    }

    const hasShortcutsMeta = mainActivity["meta-data"].some(
      (m) => m.$["android:name"] === "android.app.shortcuts",
    );

    if (!hasShortcutsMeta) {
      mainActivity["meta-data"].push({
        $: {
          "android:name": "android.app.shortcuts",
          "android:resource": "@xml/shortcuts",
        },
      });
    }

    return config;
  });

  // 2. Agrega las cadenas de texto a res/values/strings.xml
  config = withStringsXml(config, (config) => {
    const stringList = config.modResults.resources.string || [];
    for (const item of STRINGS_TO_ADD) {
      const existing = stringList.find((s) => s.$.name === item.name);
      if (existing) {
        existing._ = item.value;
      } else {
        stringList.push({
          $: { name: item.name },
          _: item.value,
        });
      }
    }
    config.modResults.resources.string = stringList;
    return config;
  });

  // 3. Escribe el archivo res/xml/shortcuts.xml durante el prebuild
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const resDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
      );
      const xmlDir = path.join(resDir, "xml");
      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }
      const shortcutsFile = path.join(xmlDir, "shortcuts.xml");
      fs.writeFileSync(shortcutsFile, SHORTCUTS_XML_CONTENT, "utf8");
      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidShortcuts;
