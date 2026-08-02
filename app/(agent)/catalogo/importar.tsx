// Importar productos desde CSV/Excel
import React, { useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { useTranslation } from 'react-i18next';
import { pickFile } from '@/lib/filePicker';
import { readFileText, normalizeHeader } from '@/lib/csvImport';
import Papa from 'papaparse';
import { colors, space, radius } from '@/theme';
import { Screen, TopBar, Text, Icon, Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { FeatureLock } from '@/components/ui';

// Claves de columna del CSV: se mantienen en español siempre — son el
// formato de intercambio de datos, no texto de interfaz.
const REQUIRED_COLS = ['nombre'];
const OPTIONAL_COLS = ['referencia', 'referencia_2', 'ean', 'familia', 'subfamilia', 'precio', 'pvpr', 'descripcion', 'medidas', 'stock', 'caja_estandar', 'unidades_minimas'];
const ALL_COLS = [...REQUIRED_COLS, ...OPTIONAL_COLS];

const COL_DESC_KEYS: Record<string, string> = {
  nombre:           'col_nombre_desc',
  referencia:       'col_referencia_desc',
  referencia_2:     'col_referencia2_desc',
  ean:              'col_ean_desc',
  familia:          'col_familia_desc',
  subfamilia:       'col_subfamilia_desc',
  precio:           'col_precio_desc',
  pvpr:             'col_pvpr_desc',
  descripcion:      'col_descripcion_desc',
  medidas:          'col_medidas_desc',
  stock:            'col_stock_desc',
  caja_estandar:    'col_caja_desc',
  unidades_minimas: 'col_unidades_min_desc',
};

const CSV_TEMPLATE =
  ALL_COLS.join(',') + '\n' +
  'Producto Ejemplo,REF-001,,1234567890123,Juguetes,Puzzles,9.99,14.99,Descripción breve,15x10x5 cm,100,12,1\n' +
  'Otro Producto,REF-002,ALT-002,,Alimentación,Snacks,4.50,,,,,,6';

type PreviewRow = Record<string, string>;
type ImportResult = { name: string; ok: boolean; error?: string };

export default function ImportarProductosScreen() {
  const router = useRouter();
  const goBack = useGoBack('/home');
  const { t } = useTranslation('agent');
  const toast = useToast();
  const { catalogId } = useLocalSearchParams<{ catalogId: string }>();
  const { allowed, loading: gateLoading, requiredPlan } = useFeatureGate('csv_import');

  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [done, setDone] = useState(false);

  async function shareTemplate() {
    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'plantilla_productos.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const FileSystem = await import('expo-file-system/legacy');
        const Sharing = await import('expo-sharing');
        const fileUri = FileSystem.cacheDirectory + 'plantilla_productos.csv';
        await FileSystem.writeAsStringAsync(fileUri, CSV_TEMPLATE, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: t('product_import.share_dialog_title'),
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          toast.error(t('product_import.share_error'));
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? t('product_import.download_error'));
    }
  }

  async function handlePickFile() {
    const picked = await pickFile({ type: 'text/csv' });
    if (!picked) return;

    setFileName(picked.name);
    setPreview([]);
    setHeaders([]);
    setResults([]);
    setDone(false);

    try {
      const text = await readFileText(picked.uri);
      const parsed = Papa.parse<PreviewRow>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader,
      });

      if (parsed.errors.length > 0 && parsed.data.length === 0) {
        toast.error(t('product_import.invalid_csv'));
        return;
      }

      const cols = parsed.meta.fields ?? [];
      setHeaders(cols);
      setPreview(parsed.data.slice(0, 5));

      // 'nombre' hace falta para crear productos nuevos, pero no para
      // actualizar existentes por referencia (ej. un CSV diario de solo
      // referencia+precio). Por eso el minimo real es nombre O referencia,
      // no nombre siempre.
      if (!cols.includes('nombre') && !cols.includes('referencia')) {
        toast.error(t('product_import.missing_column', { cols: cols.join(', ') }));
      }
    } catch (e: any) {
      toast.error(e?.message ?? t('product_import.read_error'));
    }
  }

  async function handleImportFromPreview() {
    if (!catalogId || preview.length === 0) return;

    const picked2 = await pickFile({ type: 'text/csv' });
    if (!picked2) return;

    setImporting(true);
    setResults([]);

    try {
      const text = await readFileText(picked2.uri);
      const parsed = Papa.parse<PreviewRow>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: normalizeHeader,
      });

      const rows = parsed.data;
      const cols = parsed.meta.fields ?? [];
      const res: ImportResult[] = [];

      // Productos existentes de este catalogo con referencia, para poder
      // actualizar en vez de borrar+recrear. Antes se borraba cualquier
      // producto cuya referencia apareciera en el CSV y se insertaba uno
      // nuevo desde cero - eso significaba una fila (id) completamente
      // nueva, así que perdía la imagen (image_url), las imagenes extra
      // (product_images), los precios por tarifa (product_prices) y
      // cualquier otro dato del producto no incluido en el CSV. Bug real
      // reportado el 2 ago 2026. Ahora se actualiza la fila existente por
      // referencia (conserva su id y todo lo que no toca el CSV), y solo
      // se inserta una fila nueva si no habia ninguna con esa referencia.
      const { data: existing } = await supabase
        .from('products')
        .select('id, reference')
        .eq('catalog_id', catalogId)
        .not('reference', 'is', null);
      const existingByRef = new Map((existing ?? []).map((p: any) => [p.reference, p.id]));

      for (const row of rows) {
        const reference = row['referencia']?.trim() || null;
        const existingId = reference ? existingByRef.get(reference) : undefined;
        const name = row['nombre']?.trim();

        // Un producto nuevo necesita nombre si o si. Uno que ya existe no -
        // si el CSV es solo referencia+precio (actualizacion rapida diaria),
        // no hace falta repetir el nombre.
        if (!existingId && !name) {
          res.push({ name: reference || t('product_import.no_name_placeholder'), ok: false, error: t('product_import.empty_name') });
          continue;
        }

        const priceRaw = row['precio']?.replace(',', '.').trim();
        const price = priceRaw ? parseFloat(priceRaw) : 0;
        const pvprRaw = row['pvpr']?.replace(',', '.').trim();
        const pvpr = pvprRaw ? parseFloat(pvprRaw) : undefined;

        if (existingId) {
          // Actualizacion PARCIAL: solo se tocan las columnas que trae el
          // CSV. Si el archivo solo tiene referencia+precio, el resto de
          // datos del producto (stock, familia, descripcion...) no se toca -
          // antes se sobreescribia todo con vacio aunque no vinera en el CSV.
          const partial: Record<string, any> = {};
          if (cols.includes('nombre') && name) partial.name = name;
          if (cols.includes('referencia_2')) partial.reference_2 = row['referencia_2']?.trim() || null;
          if (cols.includes('ean')) partial.barcode = row['ean']?.trim() || null;
          if (cols.includes('familia')) partial.familia = row['familia']?.trim() || null;
          if (cols.includes('subfamilia')) partial.subfamilia = row['subfamilia']?.trim() || null;
          if (cols.includes('precio')) partial.price = isNaN(price) ? 0 : price;
          if (cols.includes('pvpr')) partial.pvpr = pvpr && !isNaN(pvpr) ? pvpr : null;
          if (cols.includes('descripcion')) partial.description = row['descripcion']?.trim() || null;
          if (cols.includes('medidas')) partial.measures = row['medidas']?.trim() || null;
          if (cols.includes('stock')) partial.stock = row['stock'] ? parseInt(row['stock']) : null;
          if (cols.includes('caja_estandar')) partial.standard_box = row['caja_estandar'] ? parseInt(row['caja_estandar']) : null;
          if (cols.includes('unidades_minimas')) partial.min_units = row['unidades_minimas'] ? parseInt(row['unidades_minimas']) : null;

          const { error } = await supabase.from('products').update(partial).eq('id', existingId);
          res.push({ name: name || reference || '—', ok: !error, error: error?.message });
        } else {
          const payload = {
            catalog_id: catalogId,
            active: true,
            name: name!,
            reference,
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
            min_units: row['unidades_minimas'] ? parseInt(row['unidades_minimas']) : null,
          };
          const { error } = await supabase.from('products').insert(payload);
          res.push({ name: name!, ok: !error, error: error?.message });
        }
      }

      setResults(res);
      setDone(true);
    } catch (e: any) {
      toast.error(e?.message ?? t('product_import.retry'));
    } finally {
      setImporting(false);
    }
  }

  const okCount = results.filter(r => r.ok).length;
  const errCount = results.filter(r => !r.ok).length;

  if (gateLoading) return <Screen><TopBar title={t('product_import.title')} onBack={() => goBack()} /></Screen>;

  if (!allowed) {
    return (
      <Screen>
        <TopBar title={t('product_import.title')} onBack={() => goBack()} />
        <FeatureLock
          requiredPlan={requiredPlan}
          title={t('product_import.gate_title', { plan: requiredPlan })}
          description={t('product_import.gate_description')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title={t('product_import.title')} onBack={() => goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plantilla CSV */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text variant="bodyMedium">{t('product_import.csv_template')}</Text>
            <Pressable style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]} onPress={shareTemplate}>
              <Icon name="Download" size={14} color={colors.ink2} />
              <Text variant="caption" color="ink2">{t('product_import.download')}</Text>
            </Pressable>
          </View>
          <Text variant="small" color="ink3">
            {t('product_import.template_hint_prefix')}{' '}
            <Text variant="smallMedium">nombre</Text> {t('product_import.template_hint_suffix')}
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
                      <Text variant="caption" color="ink2" style={styles.reqBadgeText}>{t('product_import.required_badge')}</Text>
                    </View>
                  )}
                </View>
                <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>{t(`product_import.${COL_DESC_KEYS[col]}`)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Selector de fichero */}
        <Pressable style={({ pressed }) => [styles.pickBtn, pressed && { opacity: 0.7 }]} onPress={handlePickFile} disabled={importing}>
          <Icon name="FileUp" size={20} color={colors.ink2} />
          <Text variant="bodyMedium" color="ink2">{fileName || t('product_import.select_file')}</Text>
        </Pressable>

        {/* Preview */}
        {preview.length > 0 && !done && (
          <View style={styles.card}>
            <Text variant="bodyMedium">{t('product_import.preview_title', { count: preview.length })}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.tableRow}>
                  {headers.map(h => (
                    <Text key={h} variant="caption" color={ALL_COLS.includes(h) ? 'ink' : 'ink4'} style={styles.th}>{h}</Text>
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
              label={t('product_import.import_all')}
              onPress={handleImportFromPreview}
              loading={importing}
              disabled={!headers.includes('nombre') && !headers.includes('referencia')}
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
                <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>{t('product_import.imported')}</Text>
              </View>
              {errCount > 0 && (
                <View style={[styles.resultStat, { backgroundColor: colors.dangerSoft }]}>
                  <Text variant="heading" color="danger">{errCount}</Text>
                  <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>{t('product_import.with_error')}</Text>
                </View>
              )}
            </View>

            {errCount > 0 && (
              <>
                <Text variant="smallMedium" color="danger" style={{ marginTop: space[2] }}>{t('product_import.error_rows')}</Text>
                {results.filter(r => !r.ok).map((r, i) => (
                  <View key={i} style={styles.errRow}>
                    <Text variant="smallMedium">{r.name}</Text>
                    <Text variant="caption" color="danger">{r.error}</Text>
                  </View>
                ))}
              </>
            )}

            <Button label={t('product_import.view_catalog')} onPress={() => goBack()} fullWidth style={{ marginTop: space[3] }} />
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: space[2], paddingVertical: 6,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line,
  },
  colTable: {
    borderRadius: radius.md, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.line, marginTop: space[1],
  },
  colRow: {
    paddingHorizontal: space[3], paddingVertical: space[2],
    borderBottomWidth: 1, borderBottomColor: colors.line2,
  },
  colNameWrap: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  reqBadge: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.sm,
  },
  reqBadgeText: { textTransform: 'uppercase', letterSpacing: 0.3 },
  pickBtn: {
    backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.ink2, borderStyle: 'dashed',
    paddingVertical: space[4], paddingHorizontal: space[4],
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
  },
  tableRow: { flexDirection: 'row' },
  tableRowAlt: { backgroundColor: colors.surface },
  th: {
    paddingHorizontal: space[2], paddingVertical: 6,
    minWidth: 90, borderBottomWidth: 1, borderBottomColor: colors.line, fontWeight: '600',
  },
  td: {
    paddingHorizontal: space[2], paddingVertical: 6,
    minWidth: 90, maxWidth: 150, borderBottomWidth: 1, borderBottomColor: colors.line2,
  },
  resultsHeader: { flexDirection: 'row', gap: space[2] },
  resultStat: {
    flex: 1, alignItems: 'center', paddingVertical: space[3],
    backgroundColor: colors.successSoft, borderRadius: radius.md,
  },
  errRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line2 },
});
