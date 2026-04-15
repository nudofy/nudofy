// Importar productos desde CSV/Excel
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import { colors } from '@/theme/colors';
import { supabase } from '@/lib/supabase';

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
  const { catalogId } = useLocalSearchParams<{ catalogId: string }>();

  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [done, setDone] = useState(false);

  async function shareTemplate() {
    try {
      await Share.share({
        message: CSV_TEMPLATE,
        title: 'plantilla_productos.csv',
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo compartir la plantilla');
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
        Alert.alert('Error al leer el fichero', 'Asegúrate de que es un CSV válido.');
        return;
      }

      const cols = parsed.meta.fields ?? [];
      setHeaders(cols);
      setPreview(parsed.data.slice(0, 5));

      if (!cols.includes('nombre')) {
        Alert.alert(
          'Columna requerida',
          'El fichero debe tener una columna "nombre". Columnas detectadas: ' + cols.join(', ')
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo leer el fichero');
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
      Alert.alert('Error inesperado', e?.message ?? 'Inténtalo de nuevo');
    } finally {
      setImporting(false);
    }
  }

  const okCount = results.filter(r => r.ok).length;
  const errCount = results.filter(r => !r.ok).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Importar productos</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Plantilla CSV */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Plantilla CSV</Text>
            <TouchableOpacity style={styles.shareBtn} onPress={shareTemplate}>
              <Text style={styles.shareBtnText}>⬇ Descargar plantilla</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardDesc}>
            Descarga la plantilla y rellena tus productos. Solo{' '}
            <Text style={styles.bold}>nombre</Text> es obligatorio.
          </Text>

          {/* Tabla de columnas con descripción */}
          <View style={styles.colTable}>
            {ALL_COLS.map(col => (
              <View key={col} style={styles.colRow}>
                <View style={styles.colNameWrap}>
                  <Text style={[styles.colName, REQUIRED_COLS.includes(col) && styles.colNameRequired]}>
                    {col}
                  </Text>
                  {REQUIRED_COLS.includes(col) && (
                    <View style={styles.reqBadge}>
                      <Text style={styles.reqBadgeText}>obligatorio</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.colDesc}>{COL_DESCRIPTIONS[col]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Selector de fichero */}
        <TouchableOpacity style={styles.pickBtn} onPress={pickFile} disabled={importing}>
          <Text style={styles.pickBtnIcon}>📂</Text>
          <Text style={styles.pickBtnText}>{fileName || 'Seleccionar fichero CSV'}</Text>
        </TouchableOpacity>

        {/* Preview */}
        {preview.length > 0 && !done && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Vista previa ({preview.length} de las primeras filas)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.tableRow}>
                  {headers.map(h => (
                    <Text key={h} style={[styles.th, ALL_COLS.includes(h) ? styles.thValid : styles.thUnknown]}>
                      {h}
                    </Text>
                  ))}
                </View>
                {preview.map((row, i) => (
                  <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                    {headers.map(h => (
                      <Text key={h} style={styles.td} numberOfLines={1}>{row[h] ?? ''}</Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.importBtn, !headers.includes('nombre') && styles.importBtnDisabled]}
              onPress={handleImportFromPreview}
              disabled={!headers.includes('nombre') || importing}
            >
              {importing
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.importBtnText}>Importar todos los productos</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Resultados */}
        {done && (
          <View style={styles.card}>
            <View style={styles.resultsHeader}>
              <View style={styles.resultStat}>
                <Text style={styles.resultStatNum}>{okCount}</Text>
                <Text style={styles.resultStatLabel}>Importados</Text>
              </View>
              {errCount > 0 && (
                <View style={[styles.resultStat, styles.resultStatErr]}>
                  <Text style={[styles.resultStatNum, { color: '#C0392B' }]}>{errCount}</Text>
                  <Text style={styles.resultStatLabel}>Con error</Text>
                </View>
              )}
            </View>

            {errCount > 0 && (
              <>
                <Text style={styles.errTitle}>Filas con error:</Text>
                {results.filter(r => !r.ok).map((r, i) => (
                  <View key={i} style={styles.errRow}>
                    <Text style={styles.errName}>{r.name}</Text>
                    <Text style={styles.errMsg}>{r.error}</Text>
                  </View>
                ))}
              </>
            )}

            <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
              <Text style={styles.doneBtnText}>Ver catálogo</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    backgroundColor: colors.white, paddingHorizontal: 18, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 0.5, borderBottomColor: '#efefef' },
  back: { fontSize: 14, color: colors.purple, width: 60 },
  title: { fontSize: 16, fontWeight: '500', color: colors.text },
  content: { padding: 16, gap: 14 },
  card: {
    backgroundColor: colors.white, borderRadius: 14,
    padding: 16, gap: 12 },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  cardDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  bold: { fontWeight: '600', color: colors.text },
  shareBtn: {
    backgroundColor: colors.purpleLight ?? '#EEEDFE',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  shareBtnText: { fontSize: 12, color: colors.purple, fontWeight: '600' },
  colTable: { gap: 0, borderRadius: 10, overflow: 'hidden', borderWidth: 0.5, borderColor: '#efefef' },
  colRow: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
    gap: 2 },
  colNameWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colName: { fontSize: 12, fontWeight: '600', color: colors.textMuted, fontFamily: 'monospace' },
  colNameRequired: { color: colors.purple },
  reqBadge: {
    backgroundColor: colors.purpleLight ?? '#EEEDFE',
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  reqBadgeText: { fontSize: 9, color: colors.purple, fontWeight: '600', textTransform: 'uppercase' },
  colDesc: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  pickBtn: {
    backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.purple, borderStyle: 'dashed',
    paddingVertical: 18, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  pickBtnIcon: { fontSize: 20 },
  pickBtnText: { fontSize: 14, color: colors.purple, fontWeight: '500' },
  tableRow: { flexDirection: 'row' },
  tableRowAlt: { backgroundColor: '#fafafa' },
  th: {
    fontSize: 10, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 6,
    minWidth: 90, borderBottomWidth: 1, borderBottomColor: '#efefef' },
  thValid: { color: colors.purple },
  thUnknown: { color: '#bbb' },
  td: {
    fontSize: 12, color: colors.text,
    paddingHorizontal: 10, paddingVertical: 6,
    minWidth: 90, maxWidth: 150,
    borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5' },
  importBtn: {
    backgroundColor: colors.purple, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginTop: 6 },
  importBtnDisabled: { opacity: 0.4 },
  importBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  resultsHeader: { flexDirection: 'row', gap: 12 },
  resultStat: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: '#EAF3DE', borderRadius: 10 },
  resultStatErr: { backgroundColor: '#FDECEA' },
  resultStatNum: { fontSize: 28, fontWeight: '500', color: '#3B6D11' },
  resultStatLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  errTitle: { fontSize: 12, fontWeight: '600', color: '#C0392B', marginTop: 4 },
  errRow: {
    paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5' },
  errName: { fontSize: 12, fontWeight: '500', color: colors.text },
  errMsg: { fontSize: 11, color: '#C0392B' },
  doneBtn: {
    backgroundColor: colors.purple, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  doneBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' } });
