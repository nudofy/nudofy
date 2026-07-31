import { Alert, Platform } from 'react-native';

/**
 * Confirmación destructiva compatible con web y móvil.
 * En web usa window.confirm(); en móvil usa Alert.alert().
 */
export function confirmDestructive(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = 'Eliminar',
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: confirmText, style: 'destructive', onPress: onConfirm },
    ]);
  }
}

/**
 * Confirmación no destructiva (activar, marcar como pagado, etc.) compatible
 * con web y móvil. Mismo patrón que confirmDestructive pero sin el estilo
 * "destructive" del botón de confirmar.
 */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = 'Confirmar',
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: confirmText, onPress: onConfirm },
    ]);
  }
}

/**
 * Alerta informativa (sin opción de cancelar) compatible con web y móvil.
 * Alert.alert de React Native no funciona en la build web (ver bug del panel
 * admin, 30 jul 2026) — en web usa window.alert().
 */
export function alertInfo(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}
