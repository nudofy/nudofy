// Componente para editar atributos + variantes de un producto
import React, { useEffect, useState } from 'react';
import {
  View, TextInput, Pressable, StyleSheet, ScrollView, Switch, Image, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, space, radius } from '@/theme';
import { Text, Icon } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export interface AttributeDraft {
  id?: string;
  name: string;
  options: string[];
  optionInput: string;
}

export interface VariantDraft {
  attributes: Record<string, string>;  // { Talla: 'M', Color: 'Rojo' }
  reference: string;
  barcode: string;
  stock: string;
  available: boolean;  // false = "no disponemos"
  image_url?: string | null;  // URL de la foto de esta variante
}

interface Props {
  attributes: AttributeDraft[];
  variants: VariantDraft[];
  onAttributesChange: (attrs: AttributeDraft[]) => void;
  onVariantsChange: (variants: VariantDraft[]) => void;
}

// Genera todas las combinaciones posibles de opciones
function generateCombinations(attrs: AttributeDraft[]): Record<string, string>[] {
  const valid = attrs.filter(a => a.name.trim() && a.options.length > 0);
  if (valid.length === 0) return [];
  let result: Record<string, string>[] = [{}];
  for (const attr of valid) {
    const next: Record<string, string>[] = [];
    for (const combo of result) {
      for (const opt of attr.options) {
        next.push({ ...combo, [attr.name]: opt });
      }
    }
    result = next;
  }
  return result;
}

function variantKey(attrs: Record<string, string>) {
  return Object.entries(attrs).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join('|');
}

export default function AttributesEditor({ attributes, variants, onAttributesChange, onVariantsChange }: Props) {

  // Cuando cambian los atributos, regenera la matriz de variantes preservando los datos ya rellenados
  function regenerateVariants(newAttrs: AttributeDraft[]) {
    const combos = generateCombinations(newAttrs);
    const existingMap = new Map(variants.map(v => [variantKey(v.attributes), v]));
    const newVariants: VariantDraft[] = combos.map(combo => {
      const key = variantKey(combo);
      const existing = existingMap.get(key);
      return existing ?? { attributes: combo, reference: '', barcode: '', stock: '', available: true };
    });
    onVariantsChange(newVariants);
  }

  function addAttribute() {
    const newAttrs = [...attributes, { name: '', options: [], optionInput: '' }];
    onAttributesChange(newAttrs);
  }

  function removeAttribute(idx: number) {
    const newAttrs = attributes.filter((_, i) => i !== idx);
    onAttributesChange(newAttrs);
    regenerateVariants(newAttrs);
  }

  function updateName(idx: number, name: string) {
    const newAttrs = attributes.map((a, i) => i === idx ? { ...a, name } : a);
    onAttributesChange(newAttrs);
  }

  function commitName(idx: number) {
    regenerateVariants(attributes);
  }

  function updateOptionInput(idx: number, text: string) {
    onAttributesChange(attributes.map((a, i) => i === idx ? { ...a, optionInput: text } : a));
  }

  function commitOption(idx: number) {
    const attr = attributes[idx];
    const val = attr.optionInput.trim();
    if (!val || attr.options.includes(val)) return;
    const newAttrs = attributes.map((a, i) =>
      i === idx ? { ...a, options: [...a.options, val], optionInput: '' } : a
    );
    onAttributesChange(newAttrs);
    regenerateVariants(newAttrs);
  }

  function removeOption(attrIdx: number, optIdx: number) {
    const newAttrs = attributes.map((a, i) =>
      i === attrIdx ? { ...a, options: a.options.filter((_, j) => j !== optIdx) } : a
    );
    onAttributesChange(newAttrs);
    regenerateVariants(newAttrs);
  }

  function updateVariant(idx: number, field: 'reference' | 'barcode' | 'stock', value: string) {
    onVariantsChange(variants.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  }

  function toggleVariantAvailable(idx: number) {
    onVariantsChange(variants.map((v, i) => i === idx ? { ...v, available: !v.available } : v));
  }

  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  async function pickVariantImage(idx: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    setUploadingIdx(idx);
    try {
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const filename = `variant_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const { error } = await supabase.storage
        .from('product-images')
        .upload(filename, arrayBuffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
      if (!error) {
        const { data } = supabase.storage.from('product-images').getPublicUrl(filename);
        onVariantsChange(variants.map((v, i) => i === idx ? { ...v, image_url: data.publicUrl } : v));
      }
    } finally {
      setUploadingIdx(null);
    }
  }

  function removeVariantImage(idx: number) {
    onVariantsChange(variants.map((v, i) => i === idx ? { ...v, image_url: null } : v));
  }

  const hasAttributes = attributes.length > 0;
  const hasVariants = variants.length > 0;

  return (
    <View style={styles.container}>

      {/* ── Fase 1: Definir atributos ── */}
      <Text variant="caption" color="ink3" style={styles.phaseLabel}>1. DEFINIR ATRIBUTOS Y OPCIONES</Text>

      {attributes.map((attr, idx) => (
        <View key={idx} style={styles.attrBlock}>
          {/* Nombre del atributo */}
          <View style={styles.attrHeader}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="ink3" style={{ marginBottom: 4 }}>Nombre del atributo</Text>
              <TextInput
                style={styles.attrNameInput}
                value={attr.name}
                onChangeText={t => updateName(idx, t)}
                onBlur={() => commitName(idx)}
                placeholder="Ej: Talla, Color, Tamaño..."
                placeholderTextColor={colors.ink4}
                autoCapitalize="sentences"
              />
            </View>
            <Pressable onPress={() => removeAttribute(idx)} hitSlop={8} style={{ marginTop: 18 }}>
              <Icon name="Trash2" size={16} color={colors.error ?? '#E73121'} />
            </Pressable>
          </View>

          {/* Opciones */}
          <View style={styles.optionsSeparator} />
          <Text variant="caption" color="ink3" style={{ marginBottom: 6 }}>Opciones</Text>

          {attr.options.length > 0 && (
            <View style={styles.optionsRow}>
              {attr.options.map((opt, oi) => (
                <View key={oi} style={styles.optionChip}>
                  <Text variant="smallMedium" color="ink2" style={{ marginRight: 4 }}>{opt}</Text>
                  <Pressable onPress={() => removeOption(idx, oi)} hitSlop={6}>
                    <Icon name="X" size={11} color={colors.ink3} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={styles.optionInputRow}>
            <TextInput
              style={styles.optionInput}
              value={attr.optionInput}
              onChangeText={t => updateOptionInput(idx, t)}
              placeholder="Ej: S, M, L, XL… pulsa + para añadir"
              placeholderTextColor={colors.ink4}
              onSubmitEditing={() => commitOption(idx)}
              returnKeyType="done"
              blurOnSubmit={false}
            />
            <Pressable
              style={[styles.addOptionBtn, !attr.optionInput.trim() && { opacity: 0.4 }]}
              onPress={() => commitOption(idx)}
              disabled={!attr.optionInput.trim()}
            >
              <Icon name="Plus" size={16} color={colors.white} />
            </Pressable>
          </View>
        </View>
      ))}

      <Pressable
        style={({ pressed }) => [styles.addAttrBtn, pressed && { opacity: 0.7 }]}
        onPress={addAttribute}
      >
        <Icon name="Plus" size={16} color={colors.brand} />
        <Text variant="bodyMedium" color="brand">Añadir atributo</Text>
      </Pressable>

      {/* ── Fase 2: Matriz de variantes ── */}
      {hasVariants && (
        <View style={{ marginTop: space[4] }}>
          <Text variant="caption" color="ink3" style={styles.phaseLabel}>
            2. REFERENCIA Y CÓDIGO DE BARRAS POR VARIANTE ({variants.length})
          </Text>

          {variants.map((variant, idx) => {
            const label = Object.entries(variant.attributes)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ');
            const isAvailable = variant.available !== false;
            return (
              <View key={variantKey(variant.attributes)} style={[styles.variantRow, !isAvailable && styles.variantRowUnavailable]}>
                {/* Cabecera: label + toggle disponible */}
                <View style={styles.variantHeader}>
                  <View style={styles.variantLabel}>
                    <Text variant="smallMedium" color={isAvailable ? 'ink' : 'ink4'}>{label}</Text>
                  </View>
                  <View style={styles.variantAvailRow}>
                    <Text variant="caption" color={isAvailable ? 'ink3' : 'danger'}>
                      {isAvailable ? 'Disponible' : 'No disponemos'}
                    </Text>
                    <Switch
                      value={isAvailable}
                      onValueChange={() => toggleVariantAvailable(idx)}
                      trackColor={{ false: (colors as any).error ?? '#E73121', true: colors.brand }}
                      thumbColor={colors.white}
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                  </View>
                </View>
                {/* Campos de referencia/EAN/stock/foto — solo si disponible */}
                {isAvailable && (
                  <View style={styles.variantFields}>
                    {/* Foto de la variante */}
                    <View style={styles.variantImgRow}>
                      {variant.image_url ? (
                        <View style={styles.variantImgWrap}>
                          <Image source={{ uri: variant.image_url }} style={styles.variantImg} resizeMode="cover" />
                          <Pressable style={styles.variantImgRemove} onPress={() => removeVariantImage(idx)}>
                            <Icon name="X" size={10} color={colors.white} />
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          style={styles.variantImgAdd}
                          onPress={() => pickVariantImage(idx)}
                          disabled={uploadingIdx === idx}
                        >
                          {uploadingIdx === idx
                            ? <ActivityIndicator size="small" color={colors.ink3} />
                            : <>
                                <Icon name="Camera" size={16} color={colors.ink3} />
                                <Text variant="caption" color="ink3">Foto</Text>
                              </>
                          }
                        </Pressable>
                      )}
                      <View style={{ flex: 1, gap: space[2] }}>
                        <TextInput
                          style={styles.variantInput}
                          value={variant.reference}
                          onChangeText={v => updateVariant(idx, 'reference', v)}
                          placeholder="Referencia"
                          placeholderTextColor={colors.ink4}
                        />
                        <TextInput
                          style={styles.variantInput}
                          value={variant.barcode}
                          onChangeText={v => updateVariant(idx, 'barcode', v)}
                          placeholder="Código de barras"
                          placeholderTextColor={colors.ink4}
                          keyboardType="numeric"
                        />
                        <TextInput
                          style={[styles.variantInput, styles.variantInputSmall]}
                          value={variant.stock}
                          onChangeText={v => updateVariant(idx, 'stock', v)}
                          placeholder="Stock"
                          placeholderTextColor={colors.ink4}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {hasAttributes && !hasVariants && (
        <View style={styles.emptyVariants}>
          <Text variant="small" color="ink3" align="center">
            Añade opciones a los atributos para generar las variantes
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space[2] },
  phaseLabel: { textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: space[1] },

  attrBlock: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space[3],
    gap: space[2],
  },
  attrHeader: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  attrNameInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 4,
  },
  optionsSeparator: {
    height: 1, backgroundColor: colors.line2, marginVertical: space[2],
  },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1], marginBottom: space[1] },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    paddingHorizontal: space[2],
    paddingVertical: 5,
  },
  optionInputRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  optionInput: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  addOptionBtn: {
    width: 36, height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  addAttrBtn: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    paddingVertical: space[3], paddingHorizontal: space[3],
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.brand, borderStyle: 'dashed',
    justifyContent: 'center',
  },

  variantRow: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space[3],
    gap: space[2],
    marginBottom: space[2],
  },
  variantRowUnavailable: {
    backgroundColor: colors.surface,
    borderColor: colors.line2,
    opacity: 0.75,
  },
  variantHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: space[2],
  },
  variantLabel: {
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    paddingHorizontal: space[2],
    paddingVertical: 4,
    flexShrink: 1,
  },
  variantAvailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  variantFields: { gap: space[2] },
  variantImgRow: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start' },
  variantImgWrap: { position: 'relative', width: 64, height: 64 },
  variantImg: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surface2 },
  variantImgRemove: {
    position: 'absolute', top: -5, right: -5,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  variantImgAdd: {
    width: 64, height: 64, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed',
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  variantInput: {
    fontSize: 14,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  variantInputSmall: { width: 100 },

  emptyVariants: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: space[4],
    marginTop: space[2],
  },
});
