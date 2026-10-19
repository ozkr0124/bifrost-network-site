// Bifröst Network — contact-form.js
// Envía el formulario de contacto/PQR.
// - Con formEndpoint en js/config.js: POST JSON al endpoint (Formspree, webhook, backend propio).
// - Sin endpoint (o si el envío falla): abre WhatsApp con la solicitud ya redactada.
(function () {
  'use strict';

  const form = document.getElementById('contactForm');
  if (!form) return;

  const CFG = window.BIFROST_CONFIG || {};
  const ENDPOINT = (CFG.formEndpoint || '').trim();
  const success = document.getElementById('formSuccess');
  const successText = document.getElementById('formSuccessText');
  const errorBox = document.getElementById('formError');
  const submit = form.querySelector('.form-submit');
  const tipo = document.getElementById('tipo');
  const docField = document.getElementById('documentoField');
  const docInput = document.getElementById('documento');
  const emailInput = document.getElementById('email');
  const emailOpt = document.getElementById('emailOptional');
  const track = (n, p) => { if (window.bifrostTrack) window.bifrostTrack(n, p); };

  // Cédula/NIT y correo solo se piden cuando hacen falta (soporte y PQR).
  function syncFields() {
    const v = tipo.value;
    const needsDoc = v === 'pqr' || v === 'soporte';
    docField.hidden = !needsDoc;
    docInput.required = v === 'pqr';
    emailInput.required = v === 'pqr';
    if (emailOpt) emailOpt.hidden = v === 'pqr';
  }
  tipo.addEventListener('change', syncFields);
  syncFields();

  // ---------- Validación accesible: el error aparece junto a cada campo y el lector de pantalla lo lee ----------
  const MESSAGES = {
    nombre: () => 'Escribe tu nombre completo.',
    telefono: (el) => (el.value.trim() ? 'Revisa el número: debe tener al menos 7 dígitos.' : 'Escribe tu número de celular o WhatsApp.'),
    barrio: () => 'Escribe tu barrio y dirección.',
    email: (el) => (el.value.trim() ? 'Revisa el correo; debe tener el formato nombre@dominio.com.' : 'Escribe tu correo: ahí te enviaremos el código (CUN) de tu PQR.'),
    documento: () => 'Escribe la cédula o el NIT del titular del servicio.',
    autorizacion: () => 'Para enviar la solicitud debes autorizar el tratamiento de tus datos.',
  };

  function errorFor(el) {
    const id = el.id + '-error';
    let msg = document.getElementById(id);
    if (!msg) {
      msg = document.createElement('p');
      msg.className = 'field-error';
      msg.id = id;
      const anchor = el.type === 'checkbox' ? el.closest('.consent') : el.closest('.field');
      anchor.insertAdjacentElement(el.type === 'checkbox' ? 'afterend' : 'beforeend', msg);
    }
    return msg;
  }

  function setError(el, text) {
    const msg = errorFor(el);
    msg.textContent = text || '';
    msg.hidden = !text;
    const ids = (el.getAttribute('aria-describedby') || '').split(' ').filter((x) => x && x !== msg.id);
    if (text) { ids.push(msg.id); el.setAttribute('aria-invalid', 'true'); }
    else el.removeAttribute('aria-invalid');
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' ')); else el.removeAttribute('aria-describedby');
  }

  function fieldInvalid(el) {
    if (el.closest('[hidden]')) return false;
    if (el.id === 'telefono' && el.value.trim() && el.value.replace(/\D/g, '').length < 7) return true;
    return !el.checkValidity();
  }

  function validate() {
    let first = null;
    Object.keys(MESSAGES).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const bad = fieldInvalid(el);
      setError(el, bad ? MESSAGES[id](el) : '');
      if (bad && !first) first = el;
    });
    if (first) first.focus();
    return !first;
  }

  // Al corregir un campo, su error desaparece
  Object.keys(MESSAGES).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
      if (el.getAttribute('aria-invalid') === 'true' && !fieldInvalid(el)) setError(el, '');
    });
  });
  tipo.addEventListener('change', () => {
    ['documento', 'email'].forEach((id) => { const el = document.getElementById(id); if (el) setError(el, ''); });
  });

  const LABELS = { nuevo: 'Nuevo servicio', soporte: 'Soporte técnico', pqr: 'PQR (Petición, Queja o Reclamo)', otro: 'Otro' };

  function whatsappText(d) {
    const lines = [
      'Hola Bifröst, envío esta solicitud desde la página web:',
      '• Tipo: ' + (LABELS[d.tipo] || d.tipo),
      '• Nombre: ' + d.nombre,
      '• Teléfono: ' + d.telefono,
    ];
    if (d.email) lines.push('• Correo: ' + d.email);
    if (d.barrio) lines.push('• Barrio / dirección: ' + d.barrio);
    if (d.plan) lines.push('• Plan de interés: ' + d.plan);
    if (d.documento) lines.push('• Cédula/NIT: ' + d.documento);
    if (d.mensaje) lines.push('• Mensaje: ' + d.mensaje);
    return lines.join('\n');
  }

  function done(message) {
    form.hidden = true;
    successText.textContent = message;
    success.classList.add('show');
    success.focus();
  }

  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    errorBox.classList.remove('show');
    if (!validate()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    data.autorizacion_datos = data.autorizacion_datos ? 'Sí — ' + new Date().toISOString() : 'No';
    data.origen = location.href;
    track('generate_lead', { form_type: data.tipo, plan: data.plan || undefined, method: ENDPOINT ? 'formulario' : 'whatsapp' });

    if (!ENDPOINT) {
      window.open(window.bifrostWaUrl(whatsappText(data)), '_blank', 'noopener');
      done('Abrimos WhatsApp con tu solicitud ya redactada. Solo tienes que enviarla y te respondemos en nuestro horario de atención.');
      return;
    }

    submit.disabled = true;
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      done(data.tipo === 'pqr'
        ? 'Recibimos tu PQR. Te enviaremos por correo el Código Único Numérico (CUN) para hacer seguimiento. El plazo máximo de respuesta es de 15 días hábiles.'
        : 'Recibimos tu solicitud. Te contactaremos por WhatsApp o teléfono en nuestro horario de atención (lunes a viernes, 8:00–12:00 y 13:00–17:00).');
    } catch (err) {
      submit.disabled = false;
      const link = errorBox.querySelector('a');
      if (link) link.href = window.bifrostWaUrl(whatsappText(data));
      errorBox.classList.add('show');
    }
  });
})();
