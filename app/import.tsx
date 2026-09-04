import React from 'react';
import { View, Text, Alert } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/src/store/appStore';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ModalScreen, Card, Button, formatMoney } from '@/src/components/ui';
import { previewCsv, importCsv, generateTemplateCsv, CsvPreview } from '@/src/services/csvImportService';
import { pickCsvText, shareText } from '@/src/services/fileService';

export default function ImportScreen() {
  const { refresh } = useApp();
  const { colors, prefs } = useTheme();
  const [csv, setCsv] = React.useState('');
  const [preview, setPreview] = React.useState<CsvPreview | null>(null);
  const [busy, setBusy] = React.useState(false);

  const doPreview = (text: string) => {
    setCsv(text);
    try {
      setPreview(text.trim() ? previewCsv(text) : null);
    } catch {
      setPreview(null);
    }
  };

  const pick = async () => {
    try {
      setBusy(true);
      const text = await pickCsvText();
      if (text) doPreview(text);
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const csv = generateTemplateCsv();
      const shared = await shareText('plantilla-cajita.csv', csv);
      if (!shared) Alert.alert('Plantilla copiada', 'El CSV de plantilla se copió al portapapeles.');
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  const runImport = () => {
    if (!csv.trim()) { Alert.alert('Elige un archivo CSV'); return; }
    Alert.alert(
      '¿Cómo cargar los datos?',
      `Se van a importar ${preview?.total ?? 0} movimientos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Agregar a lo actual', onPress: () => doImport('merge') },
        { text: 'Reemplazar todo', style: 'destructive', onPress: () => doImport('replace') },
      ],
    );
  };

  const doImport = (mode: 'replace' | 'merge') => {
    if (mode === 'replace') {
      Alert.alert(
        'Confirmar reemplazo',
        'Se borrarán TODOS los datos actuales (cuentas, movimientos, préstamos, presupuestos) y se cargará el CSV.\nEsta acción no se puede deshacer.\n¿Continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sí, reemplazar',
            style: 'destructive',
            onPress: () => {
              try {
                const res = importCsv(csv, 'replace');
                finish(res);
              } catch (e) {
                Alert.alert('Error', String(e));
              }
            },
          },
        ],
      );
    } else {
      try {
        const res = importCsv(csv, 'merge');
        finish(res);
      } catch (e) {
        Alert.alert('Error', String(e));
      }
    }
  };

  const finish = (res: { imported: number; skipped: number; accountsCreated: string[] }) => {
    refresh();
    Alert.alert(
      'Importación completada',
      `${res.imported} movimientos importados${res.skipped ? `, ${res.skipped} omitidos` : ''}.` +
        (res.accountsCreated.length ? `\nCuentas creadas: ${res.accountsCreated.join(', ')}` : ''),
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  return (
    <ModalScreen
      title="Importar CSV"
      footer={
        <Button
          title={preview ? `Importar ${preview.total} movimientos` : 'Importar'}
          icon="download"
          onPress={runImport}
          disabled={!preview || preview.total === 0}
        />
      }
    >
      <Button title="Elegir archivo CSV" icon="folder-open" variant="secondary" loading={busy} onPress={pick} />
      <Button title="Descargar plantilla" icon="document-text" variant="ghost" onPress={downloadTemplate} style={{ marginTop: 8 }} />

      <Card style={{ marginTop: 12, gap: 6 }}>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>Resumen</Text>
        {preview ? (
          <>
            <Row label="Movimientos" value={String(preview.total)} colors={colors} />
            <Row label="Ingresos" value={formatMoney(preview.income, prefs.currency)} color={colors.positive} colors={colors} />
            <Row label="Gastos" value={formatMoney(preview.expense, prefs.currency)} color={colors.negative} colors={colors} />
            {preview.newAccounts.length ? (
              <Row label="Cuentas nuevas" value={preview.newAccounts.join(', ')} colors={colors} />
            ) : null}
            {preview.newCategories.length ? (
              <Row label="Categorías nuevas" value={preview.newCategories.join(', ')} colors={colors} />
            ) : null}
          </>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            Elige un archivo CSV para ver el resumen. Al importar podrás elegir entre agregarlo a los datos actuales o reemplazarlos.
          </Text>
        )}
      </Card>
    </ModalScreen>
  );
}

function Row({ label, value, color, colors }: { label: string; value: string; color?: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: color ?? colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}