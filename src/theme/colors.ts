export const colors = {
  // Principales
  navy: '#1C3A5C',
  blue: '#5B9BD5',
  blueMid: '#3B7CC4',
  purple: '#534AB7',       // color principal de la app
  purpleLight: '#EEEDFE',
  purpleDark: '#3C3489',

  // Estados
  green: '#3B6D11',
  greenLight: '#EAF3DE',
  amber: '#BA7517',
  amberLight: '#FAEEDA',
  red: '#A32D2D',
  redLight: '#FCEBEB',

  // Fondos y neutros
  bg: '#f7f7f5',
  bgCard: '#ffffff',
  border: '#e5e5e5',
  borderLight: '#f0f0f0',

  // Texto
  text: '#1a1a1a',
  textSecondary: '#555555',
  textLight: '#888888',
  textMuted: '#aaaaaa',

  white: '#ffffff',
  black: '#000000',
} as const;

export type ColorKey = keyof typeof colors;
