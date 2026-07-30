# Guía para crear og-image.jpg (Imagen Social)

## Especificaciones técnicas

**Dimensiones:** 1200 x 630 píxeles (ratio 1.91:1)
**Formato:** JPG (también funciona PNG)
**Peso máximo:** < 8 MB (recomendado < 1 MB)
**Ubicación:** `/assets/og-image.jpg`

## Diseño recomendado

### Composición visual

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│         [Logo Bifröst - Isotipo + Wordmark]                │
│                                                             │
│                                                             │
│           El puente hacia el                                │
│        MEJOR INTERNET de Colombia                           │
│                                                             │
│         • Fibra Óptica GPON Simétrica                      │
│         • Planes desde $68.000/mes                         │
│         • Medellín, Colombia                               │
│                                                             │
│         [Haz Bifröst - gradiente azul a naranja]           │
│                                                             │
│                    bifrostinternet.com                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Elementos clave

1. **Fondo**: Color oscuro (#050507 o gradiente sutil)

2. **Logo**: 
   - Usar `assets/svg/logo_bifrost_w.svg` (versión blanca)
   - Tamaño: ~300-400px de ancho
   - Posición: Superior centro

3. **Texto principal**:
   - "El puente hacia el"
   - "MEJOR INTERNET de Colombia" (destacado)
   - Fuente: General Sans Bold/Extra Bold
   - Color: Blanco (#FFFFFF)

4. **Bullet points**:
   - Fibra Óptica GPON Simétrica
   - Planes desde $68.000/mes
   - Medellín, Colombia
   - Fuente: General Sans Medium
   - Color: Gris claro (#CCCCCC)

5. **Elemento visual**:
   - Arco degradado Bifröst (del SVG haz-bifrost.svg)
   - Gradiente: #0011FF → #8b3fff → #ff3f8b → #FE5000

6. **URL del sitio**:
   - "bifrostinternet.com"
   - Posición: Inferior centro
   - Fuente: IBM Plex Mono
   - Color: Gris medio (#999999)

## Colores de marca

```css
Azul primario:   #0011FF
Naranja acento:  #FE5000
Fondo oscuro:    #050507
Blanco:          #FFFFFF
Gris claro:      #CCCCCC
Gris medio:      #999999
```

## Herramientas recomendadas

- **Figma** (https://figma.com) - Gratis, colaborativo
- **Canva** (https://canva.com) - Plantillas predefinidas
- **Adobe Photoshop** - Profesional
- **GIMP** - Open source, gratis

## Zona segura

Mantén el contenido importante dentro de los márgenes:
- **Margen lateral:** 100px (cada lado)
- **Margen vertical:** 80px (arriba/abajo)

Esto asegura que el contenido sea visible incluso si las plataformas recortan la imagen.

## Validación

Después de crear la imagen, valida cómo se ve en:

1. **Facebook Sharing Debugger**
   https://developers.facebook.com/tools/debug/

2. **Twitter Card Validator**
   https://cards-dev.twitter.com/validator

3. **LinkedIn Post Inspector**
   https://www.linkedin.com/post-inspector/

## Exportación

- **JPG:** Calidad 80-90%, optimizado para web
- **Compresión:** Usa TinyPNG (https://tinypng.com/) para reducir peso
- **Nombre del archivo:** `og-image.jpg`

## Alternativa rápida

Si necesitas algo rápido para pruebas, puedes:
1. Capturar un screenshot del hero de tu sitio
2. Redimensionar a 1200x630px
3. Agregar texto con el mensaje principal

Una vez tengas la imagen profesional, reemplázala.
