# Verificación de la entrega — 17/11/2026

## Evidencia local

- `npm test`: 20 pruebas backend aprobadas. Incluyen contraseña errónea, origen ausente/ajeno, token alterado/caducado, rotación de secret, ausencia de escrituras, límites, errores sin PII, versión incompleta/ajena/caducada, referencias cruzadas, diccionario de campos, búsquedas con tildes, pagos compartidos, saldos individuales/bajas, asistencias fuera de derecho, noche de salida y capacidad real, movimientos de madrugada y arqueo desconocido.
- `npx playwright test`: 5 pruebas de navegador aprobadas en Chromium 159.0.8154.6, Windows, modo headless. Interceptación de API solo para QA, con identidades y cifras ficticias; los fixtures no están en `docs/` ni se ofrecen como modo de demostración.
- Shell sin configurar: ninguna petición externa, ninguna persistencia local y ninguna cifra o persona simulada. Se comprueban 15 tamaños entre 320×568 y 3440×1440, incluyendo tabletas y horizontal.
- Sesión ficticia: búsqueda/filtros, vuelta de ficha conservando consulta, contacto desplegable, programa/grupos, habitación/noche, gastos/movimientos relacionados, seis secciones sin desbordamiento a tamaños representativos, cierre y foco del menú con Escape, logout/offline/caducidad.
- Axe con etiquetas WCAG 2 A/AA, 2.1 AA y 2.2 AA: sin infracciones detectadas en el shell y las seis áreas comprobadas. Redistribución con texto al 200 % y ancho de 320 px. Son comprobaciones automatizadas, no certificación completa WCAG.
- Capturas locales revisadas de shell escritorio/móvil, resumen ficticio y lista con nombre muy largo. Las capturas de QA están ignoradas por Git.
- Revisión independiente del backend: dos incidencias de correctitud detectadas (normalización de búsquedas en catálogos y filtro de pagos de gasto); corregidas y cubiertas por regresión.
- `npm audit --omit=dev`: sin vulnerabilidades conocidas; no hay dependencias de producción.

## Límites de estas pruebas

No se han instalado los archivos en una cuenta Wix real ni consultado datos reales. Siguen pendientes la creación de colecciones/secret, permisos en el sitio, publicación del backend, configuración de su URL y una copia validada del gestor. Esas comprobaciones requieren la configuración manual descrita en README.

No se han probado dispositivos físicos, Safari de iPhone/iPad, Chrome de Android, Firefox ni Safari de escritorio. El zoom de navegador real y las tecnologías de asistencia requieren validación manual adicional; se ha probado ampliación de texto y redistribución emulada. No se declara sincronización automática.

## Publicación

GitHub Pages sirve únicamente `main:/docs`, sin workflow propio ni secretos de despliegue. Se comprueba por separado el despliegue y los recursos HTTPS de producción después del push. El backend copiable y el ZIP sintético están en el repositorio, fuera del directorio servido por Pages.
