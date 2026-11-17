# Baztango · Consulta del evento

Interfaz de solo lectura: https://joteiza003.github.io/baztangoapp/

La interfaz se publica en GitHub Pages desde `main:/docs`. El backend se instala manualmente en Wix. La configuración actual apunta a `https://www.joseba-bakartxo.com/_functions/baztango` y muestra el acceso mediante contraseña. Se ha comprobado la conectividad y el rechazo de consultas sin sesión y de otros orígenes, sin introducir credenciales ni leer datos privados. Si `apiUrl` se deja vacío, muestra **Conexión pendiente**. La carga real y la sincronización del gestor no se presuponen por conectar el endpoint.

## Puesta en marcha en Wix

1. Descarga `Baztango_Wix_Importacion.zip` de este repositorio o usa `wix-importacion/`. Incluye **14 CSV de cabeceras**, 14 ejemplos ficticios y el diccionario. Sigue `wix-importacion/LEEME_IMPORTACION.md` para campos, referencias, índices y permisos. Cabeceras CSV no configuran tipos, privacidad ni sincronización.
2. Crea las 14 colecciones con estos IDs exactos: `BTEventos`, `BTVersiones`, `BTReservas`, `BTPersonas`, `BTPagos`, `BTImputaciones`, `BTActividades`, `BTParticipaciones`, `BTHabitaciones`, `BTEstancias`, `BTCajas`, `BTMovimientos`, `BTGastos`, `BTSolicitudes`. En todas: leer/crear/actualizar/borrar solo Admin. No publiques los ejemplos: llevan edición inactiva, puntero vacío y versión loading.
3. En Secrets Manager crea **`BAZTANGO_APP_ACCESS_PASSWORD`**. Elige una contraseña aleatoria de al menos 32 caracteres con un gestor de contraseñas (el backend rechaza menos de 20). Comunícala al equipo por un canal privado. No introduzcas su valor en colecciones, CSV, código, GitHub, Actions ni URL. No se necesita una clave administrativa Wix en el navegador.
4. En el backend de Velo crea la carpeta `baztango` y copia `wix/service.js`, `wix/schema.js` y `wix/repository.js` como `backend/baztango/service.js`, `schema.js` y `repository.js`. Son módulos backend normales `.js`, **no** módulos públicos `.web.js`/`.jsw`.
5. Abre tu `backend/http-functions.js` existente. **Integra** el contenido de `wix/http-functions.fragment.js`: conserva tus funciones actuales, combina imports duplicados y añade los identificadores `baztango*`, `post_baztango` y `options_baztango`. Si ya existen esos nombres, resuelve la colisión antes de publicar. No reemplaces el archivo completo. No se instalan dependencias externas: se utiliza `crypto` de Node.js, Wix Data, Wix Auth y Wix Secrets v2.
6. Publica el sitio Wix. La URL pública será `https://TU-DOMINIO/_functions/baztango` o `https://USUARIO.wixsite.com/SITIO/_functions/baztango`. Usa la URL de producción, no `_functions-dev`. Mantén TLS/HTTPS. Los endpoints no sirven datos sin sesión válida.
7. Cambia **solo** `apiUrl` en `docs/config.js` por esa URL pública, conserva la exportación del archivo, haz commit/push y espera a Pages. La URL del endpoint es configuración pública; no pongas la contraseña junto a ella. El origen autorizado ya es `https://joteiza003.github.io` en `wix/service.js` (sin `/baztangoapp`, pues Origin no contiene rutas).
8. Accede desde la web publicada y verifica: contraseña incorrecta → acceso denegado; correcta con colecciones vacías → sin ediciones/datos publicados. Comprueba también que una consulta directa sin `Authorization` devuelve 401 y que un origen diferente devuelve 403. No pegues contraseñas/tokens en comandos guardados, capturas o incidencias públicas.
9. La primera copia real deberá cargarla un proceso administrativo independiente con el contrato de `CARGA_DATOS.md`. Hasta entonces no hay datos reales conectados. La implementación entregada no contiene exportador ni sincronizador del gestor.

El usuario ha comunicado que ha completado la preparación en Wix, incluido el secret y los archivos backend. Las comprobaciones anónimas confirman que el endpoint está publicado y protege el acceso. El login autorizado, los permisos de las colecciones y la primera copia real todavía requieren comprobación por el operador. Las pruebas locales usan exclusivamente datos ficticios.

## Arquitectura y acceso

GitHub Pages aloja únicamente HTML/CSS/JS. Wix HTTP Functions autentica y consulta las colecciones privadas. Esta arquitectura sustituye la propuesta previa de servidor externo + cuentas Members: la contraseña compartida **no identifica a cada operador** ni ofrece revocación individual. No requiere configurar OAuth Headless/Members para entrar en este panel.

El login comprueba la contraseña en Secrets Manager mediante `elevate(secrets.getSecretValue)` y emite un token HMAC-SHA256 con caducidad absoluta de 15 minutos, audiencia fija y nonce aleatorio. Cada consulta verifica firma, audiencia, caducidad y contraseña vigente. Rotar el secret invalida las sesiones anteriores. El token es una credencial de acceso: no lo compartas. Salir borra la sesión del navegador; un token sustraído antes de salir seguiría siendo válido hasta caducar o rotar el secret. No hay lista central de sesiones ni promesa de revocación individual.

Las consultas sin token o con formato de token inválido se rechazan antes de consultar Secrets Manager. Las lecturas simultáneas del secret comparten la misma petición en curso; su valor no se guarda en caché entre peticiones completadas.

Si Wix o la aplicación devuelve HTTP 429, el acceso muestra una cuenta atrás y evita enviar nuevos intentos hasta el plazo indicado. No reenvía la contraseña automáticamente. El backend actualizado distingue sus límites propios (`RATE_LIMIT`) de una cuota en el servicio de acceso de Wix (`ACCESS_SERVICE_BUSY`) o en la consulta de datos (`DATA_SERVICE_BUSY`). La versión actual separa los 10 intentos/minuto por conexión usando exclusivamente `request.ip`, propiedad de solo lectura proporcionada por Wix, y mantiene 180 peticiones/minuto globales y 60 consultas/minuto por token. El contador de conexión usa un HMAC con sal aleatoria por instancia; no guarda la IP en claro ni la devuelve. Las conexiones que comparten IP comparten su límite; no se aceptan X-Forwarded-For ni direcciones enviadas en JSON. Si Wix no proporciona IP se aplica un contador de respaldo limitado compartido.

Para actualizar una instalación existente: sustituye `backend/baztango/service.js` por `wix/service.js` y, en `http-functions.js`, añade `ip: request.ip,` al objeto enviado a `baztangoService`, junto a `method`, `origin`, `authorization` y `body`. El fragmento de integración ya incluye esa línea. Publica ambos cambios juntos. No cambies las colecciones ni el secret. Esta actualización evita que intentos desde otra conexión consuman el cupo de tu primer acceso. La validez de la contraseña y la copia publicada se comprueban después del acceso autorizado.

Contraseña y token permanecen solo en memoria volátil del frontend. No hay cookies entre sitios, localStorage, sessionStorage, IndexedDB, service worker ni copia sin conexión. Respuestas privadas: `Cache-Control: no-store`. No se registran cuerpos, contraseñas, tokens ni datos personales. La interfaz limpia los datos al cerrar sesión y ante errores de acceso/conexión.

CORS admite únicamente `https://joteiza003.github.io`; es una protección de navegador, no autenticación. Otros proyectos bajo ese mismo origen comparten la frontera de origen. Un cliente externo puede falsificar Origin, pero debe seguir presentando una sesión firmada válida. La contraseña debe tener alta entropía: una firma conocida permite intentos de diccionario fuera de línea sobre contraseñas débiles.

Límites backend: 4.000 caracteres por cuerpo, búsqueda de 100 caracteres, 25 resultados por defecto/100 máximo, página 0–200, 10 logins/minuto por IP proporcionada por Wix, 60 consultas/minuto por token y 180 peticiones/minuto globales **por instancia Velo**. Los contadores en memoria se reinician en arranques y no se comparten entre instancias; no constituyen un límite distribuido ni protección completa ante ataques volumétricos. No se usan IPs no verificadas del cliente. Para una exposición de mayor riesgo, hace falta un límite distribuido/gateway adicional autorizado. Se mantienen además las cuotas de Wix. Resumen admite hasta 10.000 personas; detalle hasta 200 filas por relación. Un exceso devuelve error explícito, nunca totales parciales.

## Consultas y consistencia

Solo existen `POST` de consulta y `OPTIONS`. Ninguna ruta escribe, cobra, modifica asistencias o envía mensajes. Los nombres de recursos y campos son listas cerradas; el navegador no elige una colección arbitraria. Contacto y alimentación se devuelven en la ficha individual, no en listas generales. Los campos de búsqueda privados no se devuelven.

Cada consulta lleva evento y versión. Solo se lee una edición activa y su versión actual `ready`, publicada, con esquema 1 y referencias del mismo evento. Se comprueba el puntero antes y después de la consulta; si cambia se devuelve `VERSION_EXPIRED` y hay que volver a consultar. Esta primera implementación exige la versión actual: no sirve copias antiguas aunque se conserven en Wix. Las versiones publicadas deben ser inmutables.

Los saldos individuales, netos, imputaciones y sesiones proceden de proyecciones canónicas del gestor. Se presentan importes enteros en céntimos. El pendiente global suma pendientes individuales, incluidas bajas con obligaciones, y nunca compensa sobrepagos ajenos. Un dato desconocido no se sustituye por cero. No se vuelve a sumar el libro de pagos junto a movimientos de caja o imputaciones.

## Desarrollo y comprobación

Node.js 22 o posterior. `npm ci`, `npm test`, `npm run serve`. Frontend sin dependencias de producción. Playwright es dependencia de desarrollo para pruebas emuladas: `npx playwright install chromium`, `npx playwright test`. No hay servicio real de Wix durante estas pruebas. Los fixtures del navegador son interceptaciones exclusivas de QA y no forman parte del frontend publicado.

Consulta `VERIFICACION.md` para resultados y límites de cobertura. `node scripts/check-live.js` compara los seis recursos públicos con el checkout y comprueba la pantalla de acceso o Conexión pendiente según la configuración. `node scripts/check-backend.js` comprueba el preflight y las denegaciones sin sesión y desde otro origen, sin credenciales ni datos privados.

Pages se configura en Settings → Pages → Deploy from a branch → `main` → `/docs`. No se requiere secret de GitHub ni workflow personalizado. Solo se sirve `docs/`; el código backend y el paquete sintético permanecen descargables desde el repositorio público.

## Documentación oficial contrastada

- [HTTP Functions y autenticación en backend](https://dev.wix.com/docs/develop-websites/articles/coding-with-velo/integrations/exposing-services/write-an-http-function)
- [Respuestas HTTP personalizadas](https://dev.wix.com/docs/velo/velo-only-apis/wix-http-functions/response)
- [IP del cliente proporcionada por Wix](https://dev.wix.com/docs/velo/velo-only-apis/wix-http-functions/wix-http-function-request/ip)
- [Secrets v2 y permisos elevados](https://dev.wix.com/docs/velo/apis/wix-secrets-backend-v2/secrets/get-secret-value)
- [Wix Data: permisos y lectura consistente](https://dev.wix.com/docs/velo/apis/wix-data/wix-data-query/find)
- [Entorno backend Node.js](https://dev.wix.com/docs/develop-websites)
- [Permisos CMS](https://support.wix.com/en/article/cms-changing-your-collection-permissions)

El diccionario de colecciones entregado en `wix-importacion/` conserva la propuesta histórica de Members/servidor externo para trazabilidad. Los pasos de autenticación vigentes son los de este README; los 14 esquemas, campos, referencias y reglas financieras se conservan.
