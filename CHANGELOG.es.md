<p><a href="CHANGELOG.md">English</a> · <strong>Español</strong></p>

# Cambios

## Sin publicar

- **Fotos más livianas y seguras.** Las fotos se guardan en WebP en dos tamaños (una grande y una miniatura para las listas), bien giradas y sin metadatos como la ubicación GPS. Las listas cargan unas 8 veces menos datos. Para las fotos que ya existen: `python manage.py optimize_images`.
- **Contraofertas.** El vendedor puede responder a una oferta con su propio precio. El operador puede aceptarla, hacer otra oferta o cancelar. Las rondas son limitadas (`LISTING_MAX_COUNTEROFFERS`, 2 por defecto).
- **Registro del pago.** Tras completar la venta, el operador registra el pago (monto, fecha, referencia de la transferencia y un comprobante privado). La publicación pasa al estado nuevo "pagada" y el vendedor lo ve en vivo y puede descargar el comprobante.

## 0.1.0 · 2026-09-20

La primera versión de Trueke.

### Para quien vende
- Entrar con el teléfono y un código de un solo uso. Sin contraseñas.
- "Mi cuenta": datos personales, idioma, documento de identidad y certificado bancario (archivos privados).
- Publicar un artículo en 4 pasos: categoría, detalles con los campos propios de la categoría, fotos y dirección de recogida.
- Editar una publicación mientras está en revisión, y añadir o quitar fotos.
- Ver cada publicación con su estado, la oferta como un ticket y todo el historial.
- Aceptar o rechazar una oferta, o cancelar la publicación.
- Chatear con el equipo de Trueke en cada publicación, con adjuntos y leídos.
- Campana de notificaciones y avisos emergentes, todo en tiempo real.

### Para los operadores
- Panel con búsqueda, filtros por estado, ciudad y categoría, y páginas.
- Perfil, contacto y documentos del vendedor, para verificarlo y pagarle.
- Hacer ofertas, coordinar la recogida y completar la venta.

### Para todos
- Landing con cómo funciona, categorías, beneficios, preguntas frecuentes y newsletter.
- Términos de uso (una plantilla para adaptar) y baja del newsletter.
- Inglés por defecto, con versión completa en español: app, API, SMS y documentación.

### Por dentro
- Django 5 + DRF + Channels + Celery. Un solo WebSocket autenticado para todo.
- Una única máquina de estados para las publicaciones, con permisos por acción y tests de todas las combinaciones.
- React 19 con React Compiler, TanStack Query y Router. Tipos generados desde el esquema OpenAPI.
- Pruebas: pytest, Vitest (con un test de conteo de renders), pruebas de extremo a extremo con Playwright y tests del WebSocket contra un Redis real en CI.
- `make dev` levanta todo con Docker; `make seed` carga datos de demo en inglés o en español.
