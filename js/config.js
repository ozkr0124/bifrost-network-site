// Bifröst Network — config.js
// Único archivo que tienes que editar para activar las integraciones del sitio.
// Se carga antes que cualquier otro script en todas las páginas.
// Todo lo que quede vacío ('') simplemente se desactiva sin romper nada.

window.BIFROST_CONFIG = {
  // WhatsApp principal (solo dígitos, con indicativo de país).
  whatsapp: '573018265125',

  // Google Analytics 4 — ID de medición (formato G-XXXXXXXXXX).
  // Lo encuentras en analytics.google.com › Administrar › Flujos de datos › Web.
  // Vacío = no se carga Analytics.
  gaMeasurementId: '',

  // Endpoint que recibe el formulario de contacto/PQR (POST con JSON).
  // Sirve cualquier servicio que acepte JSON: Formspree (https://formspree.io/f/xxxx),
  // Getform, un webhook de n8n/Make/Zapier o tu propio backend.
  // Vacío = el formulario abre WhatsApp con la solicitud ya redactada (no se pierde nada).
  formEndpoint: '',

  // Reseñas de Google Business Profile, servidas por tu backend propio (carpeta reviews-backend/).
  // URL pública del endpoint /reviews, por ejemplo: 'https://reviews.bifrostinternet.com/reviews'.
  // Vacío, sin reseñas o con el backend caído = la sección "Clientes" queda oculta.
  reviewsApiUrl: '',
};
