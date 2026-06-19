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
