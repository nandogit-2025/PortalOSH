// Configuración pública de OSHI. No contiene credenciales.
// Backend estable en AWS EC2; acceso anónimo mediante HTTPS.
window.OSHI_CONFIG = Object.freeze({
  chatUrl: 'https://77.112.134.241/chat',
  requiresAccessCode: false,
  useLocalBackendOnHttp: false,
  faqOnly: true,
});
