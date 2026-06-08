module.exports = {
  dependencies: {
    // Deshabilitar autolinking nativo de Sentry en Android para evitar
    // conflicto Gradle entre sentry-react-native y sentry_react-native
    '@sentry/react-native': {
      platforms: {
        android: null,
      },
    },
  },
};
