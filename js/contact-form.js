// Bifröst Network — contact-form.js
// Maneja el envío del formulario de contacto/PQR. Actualmente es una demo (no envía a ningún backend).
  // ---------- Formulario PQR (demo — conectar a endpoint) ----------
  const form = document.getElementById('pqrForm');
  const success = document.getElementById('formSuccess');
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    console.log('Datos del formulario (listo para enviar a tu API):', data);

    // Cuando tengas el endpoint, reemplaza el bloque anterior por algo como:
    // fetch('https://tu-api.bifrost.com.co/pqr', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // }).then(...)

    form.style.display = 'none';
    success.classList.add('show');
  });
