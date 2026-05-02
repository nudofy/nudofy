// Componente para editar atributos + variantes de un producto
import React, { useEffect, useState } from 'react';
import {
  View, TextInput, Pressable, StyleSheet, ScrollView,
} from 'react-native';
import { colors, space, radius } from '@/theme';
import { Text, Icon } from '@/components/ui';

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
      return existing ?? { attributes: combo, reference: '', barcode: '', stock: '' };
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

  const hasAttributes = attributes.length > 0;
  const hasVariants = variants.length > 0;

  return (
    <View style={styles.container}>

      {/* ── Fase 1: Definir atributos ── */}
      <Text variant="caption" color="ink3" style={styles.phaseLabel}>1. DEFINIR ATRIBUTOS Y OPCIONES</Text>

      {attributes.map((attr, idx) => (
        <View key={idx} style={styles.attrBlock}>
          <View style={styles.attrHeader}>
            <TextInput
              style={styles.attrNameInput}
              value={attr.name}
              onChangeText={t => updateName(idx, t)}
              onBlur={() => commitName(idx)}
              placeholder="Nombre (ej: Talla, Color...)"
              placeholderTextColor={colors.ink4}
              autoCapitalize="sentences"
            />
            <Pressable onPress={() => removeAttribute(idx)} hitSlop={8}>
              <Icon name="Trash2" size={16} color={colors.error ?? '#E73121'} />
            </Pressable>
          </View>

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
              placeholder="Nueva opción y pulsar +"
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
            return (
              <View key={variantKey(variant.attributes)} style={styles.variantRow}>
                <View style={styles.variantLabel}>
                  <Text variant="smallMedium" color="ink">{label}</Text>
                </View>
                <View style={styles.variantFields}>
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
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1] },
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
  variantLabel: {
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    paddingHorizontal: space[2],
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  variantFields: { gap: space[2] },
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
