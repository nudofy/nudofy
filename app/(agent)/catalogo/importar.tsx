// Importar productos desde CSV/Excel
import React, { useState } from 'react';
import {
  View, Pressable, ScrollView, StyleSheet,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';

const REQUIRED_COLS = ['nombre'];
const OPTIONAL_COLS = ['referencia', 'referencia_2', 'ean', 'familia', 'subfamilia', 'precio', 'pvpr', 'descripcion', 'medidas', 'stock', 'caja_estandar', 'unidades_minimas'];
const ALL_COLS = [...REQUIRED_COLS, ...OPTIONAL_COLS];

const COL_DESCRIPTIONS: Record<string, string> = {
  nombre:            'Nombre del producto (obligatorio)',
  referencia:        'Referencia interna del proveedor',
  referencia_2:      'Segunda referencia o código alternativo',
  ean:               'Código de barras EAN-13',
  familia:           'Categoría principal del producto',
  subfamilia:        'Subcategoría del producto',
  precio:            'Precio de coste (ej: 9.99)',
  pvpr:              'Precio de venta recomendado (ej: 14.99)',
  descripcion:       'Descripción del producto',
  medidas:           'Dimensiones (ej: 15x10x5 cm)',
  stock:             'Unidades disponibles (número entero)',
  caja_estandar:     'Unidades por caja estándar (número entero)',
  unidades_minimas:  'Unidades mínimas de pedido (número entero)',
};

const CSV_TEMPLATE =
  ALL_COLS.join(',') + '\n' +
  'Producto Ejemplo,REF-001,,1234567890123,Juguetes,Puzzles,9.99,14.99,Descripción breve,15x10x5 cm,100,12,1\n' +
  'Otro Producto,REF-002,ALT-002,,Alimentación,Snacks,4.50,,,,,,6';

type PreviewRow = Record<string, string>;
type ImportResult = { name: string; ok: boolean; error?: string };

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9_]/g, '_');
}

export default function ImportarProductosScreen() {
  const router = useRouter();
  const toast = useToast();
  const { catalogId } = useLocalSearchParams<{ catalogId: string }>();

  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [done, setDone] = useState(false);

  async function shareTemplate() {
    try {
      const fileUri = FileSystem.cacheDirectory + 'plantilla_productos.csv';
      await FileSystem.writeAsStringAsync(fileUri, CSV_TEMPLATE, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Guardar plantilla CSV',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        toast.error('La función de compartir no está disponible en este dispositivo.');
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo descargar la plantilla');
    }
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/csv',
             'application/vnd.ms-excel',
             'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
             '*/*'],
      copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setFileName(asset.name);
    setPreview([]);
    setHeaders([]);
    setResults([]);
    setDone(false);

    try {
      const response = await fetch(asset.uri);
      const text = await response.text();
      const parsed = Papa.parse<PreviewRow>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader });

      if (parsed.errors.length > 0 && parsed.data.length === 0) {
        toast.error('Asegúrate de que es un CSV válido.');
        return;
      }

      const cols = parsed.meta.fields ?? [];
      setHeaders(cols);
      setPreview(parsed.data.slice(0, 5));

      if (!cols.includes('nombre')) {
        toast.error('Columna requerida "nombre". Columnas detectadas: ' + cols.join(', '));
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo leer el fichero');
    }
  }

  async function handleImportFromPreview() {
    if (!catalogId || preview.length === 0) return;

    const picked = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
      copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]) return;

    setImporting(true);
    setResults([]);

    try {
      const response = await fetch(picked.assets[0].uri);
      const text = await response.text();
      const parsed = Papa.parse<PreviewRow>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader });

      const rows = parsed.data;
      const res: ImportResult[] = [];

      for (const row of rows) {
        const name = row['nombre']?.trim();
        if (!name) { res.push({ name: '(sin nombre)', ok: false, error: 'Nombre vacío' }); continue; }

        const priceRaw = row['precio']?.replace(',', '.').trim();
        const price = priceRaw ? parseFloat(priceRaw) : 0;
        const pvprRaw = row['pvpr']?.replace(',', '.').trim();
        const pvpr = pvprRaw ? parseFloat(pvprRaw) : undefined;

        const { error } = await supabase.from('products').insert({
          catalog_id: catalogId,
          active: true,
          name,
          reference: row['referencia']?.trim() || null,
          reference_2: row['referencia_2']?.trim() || null,
          barcode: row['ean']?.trim() || null,
          familia: row['familia']?.trim() || null,
          subfamilia: row['subfamilia']?.trim() || null,
          price: isNaN(price) ? 0 : price,
          pvpr: pvpr && !isNaN(pvpr) ? pvpr : null,
          description: row['descripcion']?.trim() || null,
          measures: row['medidas']?.trim() || null,
          stock: row['stock'] ? parseInt(row['stock']) : null,
          standard_box: row['caja_estandar'] ? parseInt(row['caja_estandar']) : null,
          min_units: row['unidades_minimas'] ? parseInt(row['unidades_minimas']) : null });

        res.push({ name, ok: !error, error: error?.message });
      }

      setResults(res);
      setDone(true);
    } catch (e: any) {
      toast.error(e?.message ?? 'Inténtalo de nuevo');
    } finally {
      setImporting(false);
    }
  }

  const okCount = results.filter(r => r.ok).length;
  const errCount = results.filter(r => !r.ok).length;

  return (
    <Screen>
      <TopBar title="Importar productos" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plantilla CSV */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text variant="bodyMedium">Plantilla CSV</Text>
            <Pressable style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]} onPress={shareTemplate}>
              <Icon name="Download" size={14} color={colors.ink2} />
              <Text variant="caption" color="ink2">Descargar</Text>
            </Pressable>
          </View>
          <Text variant="small" color="ink3">
            Descarga la plantilla y rellena tus productos. Solo{' '}
            <Text variant="smallMedium">nombre</Text> es obligatorio.
          </Text>

          <View style={styles.colTable}>
            {ALL_COLS.map((col, i) => (
              <View key={col} style={[styles.colRow, i === ALL_COLS.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.colNameWrap}>
                  <Text variant="smallMedium" color={REQUIRED_COLS.includes(col) ? 'ink' : 'ink2'}>
                    {col}
                  </Text>
                  {REQUIRED_COLS.includes(col) && (
                    <View style={styles.reqBadge}>
                      <Text variant="caption" color="ink2" style={styles.reqBadgeText}>obligatorio</Text>
                    </View>
                  )}
                </View>
                <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>{COL_DESCRIPTIONS[col]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Selector de fichero */}
        <Pressable style={({ pressed }) => [styles.pickBtn, pressed && { opacity: 0.7 }]} onPress={pickFile} disabled={importing}>
          <Icon name="FileUp" size={20} color={colors.ink2} />
          <Text variant="bodyMedium" color="ink2">{fileName || 'Seleccionar fichero CSV'}</Text>
        </Pressable>

        {/* Preview */}
        {preview.length > 0 && !done && (
          <View style={styles.card}>
            <Text variant="bodyMedium">Vista previa ({preview.length} filas)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.tableRow}>
                  {headers.map(h => (
                    <Text
                      key={h}
                      variant="caption"
                      color={ALL_COLS.includes(h) ? 'ink' : 'ink4'}
                      style={styles.th}
                    >
                      {h}
                    </Text>
                  ))}
                </View>
                {preview.map((row, i) => (
                  <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                    {headers.map(h => (
                      <Text key={h} variant="small" style={styles.td} numberOfLines={1}>{row[h] ?? ''}</Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>

            <Button
              label="Importar todos los productos"
              onPress={handleImportFromPreview}
              loading={importing}
              disabled={!headers.includes('nombre')}
              fullWidth
              style={{ marginTop: space[2] }}
            />
          </View>
        )}

        {/* Resultados */}
        {done && (
          <View style={styles.card}>
            <View style={styles.resultsHeader}>
              <View style={styles.resultStat}>
                <Text variant="heading" color="success">{okCount}</Text>
                <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>Importados</Text>
              </View>
              {errCount > 0 && (
                <View style={[styles.resultStat, { backgroundColor: colors.dangerSoft }]}>
                  <Text variant="heading" color="danger">{errCount}</Text>
                  <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>Con error</Text>
                </View>
              )}
            </View>

            {errCount > 0 && (
              <>
                <Text variant="smallMedium" color="danger" style={{ marginTop: space[2] }}>Filas con error:</Text>
                {results.filter(r => !r.ok).map((r, i) => (
                  <View key={i} style={styles.errRow}>
                    <Text variant="smallMedium">{r.name}</Text>
                    <Text variant="caption" color="danger">{r.error}</Text>
                  </View>
                ))}
              </>
            )}

            <Button
              label="Ver catálogo"
              onPress={() => router.back()}
              fullWidth
              style={{ marginTop: space[3] }}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4], gap: space[3] },
  card: {
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: space[4], gap: space[2],
    borderWidth: 1, borderColor: colors.line,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: space[2], paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.line,
  },
  colTable: {
    borderRadius: radius.md, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line,
    marginTop: space[1],
  },
  colRow: {
    paddingHorizontal: space[3], paddingVertical: space[2],
    borderBottomWidth: 1, borderBottomColor: colors.line2,
  },
  colNameWrap: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  reqBadge: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: radius.sm,
  },
  reqBadgeText: { textTransform: 'uppercase', letterSpacing: 0.3 },
  pickBtn: {
    backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.ink2, borderStyle: 'dashed',
    paddingVertical: space[4], paddingHorizontal: space[4],
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space[2],
  },
  tableRow: { flexDirection: 'row' },
  tableRowAlt: { backgroundColor: colors.surface },
  th: {
    paddingHorizontal: space[2], paddingVertical: 6,
    minWidth: 90,
    borderBottomWidth: 1, borderBottomColor: colors.line,
    fontWeight: '600',
  },
  td: {
    paddingHorizontal: space[2], paddingVertical: 6,
    minWidth: 90, maxWidth: 150,
    borderBottomWidth: 1, borderBottomColor: colors.line2,
  },
  resultsHeader: { flexDirection: 'row', gap: space[2] },
  resultStat: {
    flex: 1, alignItems: 'center', paddingVertical: space[3],
    backgroundColor: colors.successSoft, borderRadius: radius.md,
  },
  errRow: {
    paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.line2,
  },
});
