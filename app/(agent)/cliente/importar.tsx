// Importar clientes desde CSV/Excel
import React, { useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
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
import { useAgent } from '@/hooks/useAgent';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { ClientSchema, validate } from '@/lib/validation';

// Claves de columna del CSV: se mantienen en español siempre — son el
// formato de intercambio de datos, no texto de interfaz (ver COL_DESCRIPTIONS
// para las descripciones traducidas que sí ve el usuario).
const REQUIRED_COLS = ['nombre'];
const OPTIONAL_COLS = ['tipo_establecimiento', 'direccion', 'nombre_fiscal', 'nif', 'persona_contacto', 'telefono', 'email', 'forma_pago'];
const ALL_COLS = [...REQUIRED_COLS, ...OPTIONAL_COLS];

const CSV_TEMPLATE =
  ALL_COLS.join(',') + '\n' +
  'Bar Ejemplo,Bar,Calle Mayor 1,Bar Ejemplo S.L.,B12345678,Juan Pérez,+34 600 111 222,bar@ejemplo.com,30 días factura\n' +
  'Otro Establecimiento,Restaurante,Avda. Principal 5,,,,,,Contado';

const COL_DESC_KEYS: Record<string, string> = {
  nombre:               'col_nombre_desc',
  tipo_establecimiento: 'col_tipo_desc',
  direccion:            'col_direccion_desc',
  nombre_fiscal:        'col_fiscal_desc',
  nif:                  'col_nif_desc',
  persona_contacto:     'col_contacto_desc',
  telefono:             'col_telefono_desc',
  email:                'col_email_desc',
  forma_pago:           'col_pago_desc',
};

type PreviewRow = Record<string, string>;
type ImportResult = { name: string; ok: boolean; error?: string };

export default function ImportarClientesScreen() {
  const router = useRouter();
  const { t } = useTranslation('agent');
  const { t: tv } = useTranslation('validation');
  const toast = useToast();
  const { agent } = useAgent();
  const { allowed, loading: gateLoading, requiredPlan } = useFeatureGate('csv_import');
  const { clientCount, clientLimit } = usePlanLimits();

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
        link.download = 'plantilla_clientes.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const FileSystem = await import('expo-file-system/legacy');
        const Sharing = await import('expo-sharing');
        const fileUri = FileSystem.cacheDirectory + 'plantilla_clientes.csv';
        await FileSystem.writeAsStringAsync(fileUri, CSV_TEMPLATE, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: t('client_import.share_dialog_title'),
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          toast.error(t('client_import.share_error'));
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? t('client_import.download_error'));
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
        toast.error(t('client_import.invalid_csv'));
        return;
      }

      const cols = parsed.meta.fields ?? [];
      setHeaders(cols);
      setPreview(parsed.data.slice(0, 5));

      if (!cols.includes('nombre')) {
        toast.error(t('client_import.missing_column', { cols: cols.join(', ') }));
      }
    } catch (e: any) {
      toast.error(e?.message ?? t('client_import.read_error'));
    }
  }

  async function handleImportFromPreview() {
    if (!agent || preview.length === 0) return;

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
      const res: ImportResult[] = [];
      const remainingSlots = clientLimit === null ? Infinity : Math.max(0, clientLimit - clientCount);
      let inserted = 0;

      for (const row of rows) {
        const rawName = row['nombre']?.trim() || '(sin nombre)';

        if (inserted >= remainingSlots) {
          res.push({ name: rawName, ok: false, error: t('client_import.limit_reached_row', { limit: clientLimit }) });
          continue;
        }

        const v = validate(ClientSchema(tv), {
          name: row['nombre'],
          fiscal_name: row['nombre_fiscal'],
          nif: row['nif'],
          email: row['email'],
          phone: row['telefono'],
          address: row['direccion'],
          contact_name: row['persona_contacto'],
          client_type: row['tipo_establecimiento'],
          payment_method: row['forma_pago'],
        });

        if (!v.ok) {
          res.push({ name: rawName, ok: false, error: v.firstError });
          continue;
        }

        const { error } = await supabase.from('clients').insert({ ...v.data, agent_id: agent.id });
        res.push({ name: v.data.name, ok: !error, error: error?.message });
        if (!error) inserted++;
      }

      setResults(res);
      setDone(true);
    } catch (e: any) {
      toast.error(e?.message ?? t('client_import.retry'));
    } finally {
      setImporting(false);
    }
  }

  const okCount = results.filter(r => r.ok).length;
  const errCount = results.filter(r => !r.ok).length;

  if (gateLoading) return <Screen><TopBar title={t('client_import.title')} onBack={() => router.back()} /></Screen>;

  if (!allowed) {
    return (
      <Screen>
        <TopBar title={t('client_import.title')} onBack={() => router.back()} />
        <FeatureLock
          requiredPlan={requiredPlan}
          title={t('client_import.gate_title', { plan: requiredPlan })}
          description={t('client_import.gate_description')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar title={t('client_import.title')} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plantilla CSV */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text variant="bodyMedium">{t('client_import.csv_template')}</Text>
            <Pressable style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]} onPress={shareTemplate}>
              <Icon name="Download" size={14} color={colors.ink2} />
              <Text variant="caption" color="ink2">{t('client_import.download')}</Text>
            </Pressable>
          </View>
          <Text variant="small" color="ink3">
            {t('client_import.template_hint_prefix')}{' '}
            <Text variant="smallMedium">nombre</Text> {t('client_import.template_hint_suffix')}
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
                      <Text variant="caption" color="ink2" style={styles.reqBadgeText}>{t('client_import.required_badge')}</Text>
                    </View>
                  )}
                </View>
                <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>{t(`client_import.${COL_DESC_KEYS[col]}`)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Selector de fichero */}
        <Pressable style={({ pressed }) => [styles.pickBtn, pressed && { opacity: 0.7 }]} onPress={handlePickFile} disabled={importing}>
          <Icon name="FileUp" size={20} color={colors.ink2} />
          <Text variant="bodyMedium" color="ink2">{fileName || t('client_import.select_file')}</Text>
        </Pressable>

        {/* Preview */}
        {preview.length > 0 && !done && (
          <View style={styles.card}>
            <Text variant="bodyMedium">{t('client_import.preview_title', { count: preview.length })}</Text>
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
              label={t('client_import.import_all')}
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
                <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>{t('client_import.imported')}</Text>
              </View>
              {errCount > 0 && (
                <View style={[styles.resultStat, { backgroundColor: colors.dangerSoft }]}>
                  <Text variant="heading" color="danger">{errCount}</Text>
                  <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>{t('client_import.with_error')}</Text>
                </View>
              )}
            </View>

            {errCount > 0 && (
              <>
                <Text variant="smallMedium" color="danger" style={{ marginTop: space[2] }}>{t('client_import.error_rows')}</Text>
                {results.filter(r => !r.ok).map((r, i) => (
                  <View key={i} style={styles.errRow}>
                    <Text variant="smallMedium">{r.name}</Text>
                    <Text variant="caption" color="danger">{r.error}</Text>
                  </View>
                ))}
              </>
            )}

            <Button label={t('client_import.view_clients')} onPress={() => router.back()} fullWidth style={{ marginTop: space[3] }} />
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
