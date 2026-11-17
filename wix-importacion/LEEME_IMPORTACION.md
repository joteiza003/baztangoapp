# Importación de las colecciones de Baztango en Wix

Preparado el 17 de noviembre de 2026. Este paquete no contiene clientes, pagos ni datos reales del evento. Los registros de ejemplo son ficticios. Ningún archivo contiene una contraseña, token o clave de API.

## Qué contiene

- **plantillas-vacias/**: 14 CSV con las cabeceras exactas de cada colección. Sirven como estructura y base para una carga posterior; no contienen registros.
- **ejemplos-no-publicar/**: los mismos 14 CSV con un registro ficticio por colección para comprobar formatos y enlaces. La edición tiene isActive=false, no apunta a una versión publicada y la versión permanece loading. No activar estos ejemplos como si fueran una copia real del evento.
- **DICCIONARIO_CAMPOS_NO_IMPORTAR.csv**: lista de los 254 campos personalizados con su tipo, obligación del contrato, defecto, referencia y reglas. Es una guía; no importarlo como datos de una colección.
- **COLECCIONES_WIX.md**: explicación completa de colecciones, relaciones, permisos e índices.
- **manifest.json**: relación técnica de archivos, IDs de ejemplo y versión del esquema. No importarlo en el CMS.

Los CSV usan UTF-8 con BOM, coma como separador, primera fila de cabeceras y booleanos true/false. Los importes se guardan como enteros en céntimos; 10000 representa 100,00 EUR. Las fechas civiles son texto YYYY-MM-DD; los instantes son Fecha y hora en ISO UTC. Abrirlos en Excel puede alterar IDs o fechas si no se importan como texto: no hace falta abrirlos ni guardarlos en Excel para cargarlos en Wix.

## 1. Crear las colecciones y sus campos

El diseño utiliza **14 colecciones**, no una sola tabla que mezcle personas, pagos y actividades. Crear colecciones de varios elementos con estos IDs exactos:

| Orden lógico | ID de colección | Contenido |
|---|---|---|
| 1 | BTEventos | Ediciones y puntero a la copia publicada |
| 2 | BTVersiones | Metadatos de cada copia completa |
| 3 | BTReservas | Agrupaciones por reserva |
| 4 | BTPersonas | Personas y situación individual |
| 5 | BTPagos | Movimientos económicos únicos |
| 6 | BTImputaciones | Partes de pago atribuidas a personas |
| 7 | BTActividades | Programa de la edición |
| 8 | BTParticipaciones | Derechos y asistencia por actividad |
| 9 | BTHabitaciones | Unidades y capacidades |
| 10 | BTEstancias | Ocupantes e intervalos de alojamiento |
| 11 | BTCajas | Sesiones de caja |
| 12 | BTMovimientos | Detalle de movimientos de caja |
| 13 | BTGastos | Gastos previstos y pagados |
| 14 | BTSolicitudes | Revisión, espera y rechazos |

Crear primero las colecciones vacías para poder añadir después campos Referencia hacia ellas. El orden de creación del manual resuelve la referencia circular entre evento y versión y las autorreferencias. Los números de los archivos identifican el diccionario; no obligan a cargar BTMovimientos antes que BTGastos.

Cada CSV incluye _id. Es el **ID del sistema Wix**, no un nuevo campo de texto llamado _id. En la importación, mapearlo al campo ID del sistema cuando se use un ID conocido. Usar title como campo principal. No crear manualmente _createdDate, _updatedDate ni _owner.

Un CSV no establece por sí solo los tipos de campo, destinos de Referencia, valores permitidos, índices o permisos. Configurar esos elementos con el diccionario antes de importar; no aceptar automáticamente todos los campos como Texto. Los campos que terminan en Ref son Referencia al destino indicado, no una cadena de nombre visible.

Si el asistente permite crear campos desde una plantilla de cabeceras, comprobar sus IDs y tipos con el diccionario. Si rechaza un CSV sin filas o no puede inferir el tipo, crear los campos manualmente; los ejemplos son una alternativa para ensayar el mapeo sin usar datos reales.

## 2. Configurar privacidad

En todas las colecciones, dejar lectura, creación, actualización y borrado **solo para administradores CMS**. No dar lectura directa a visitantes, miembros ni al creador del elemento. No cambiarlo a público para conseguir que funcione la web.

La página GitHub Pages alojará la interfaz. El backend de Wix deberá verificar el acceso antes de leer colecciones y devolver únicamente la información permitida. Ocultar tablas en la interfaz o restringir CORS no sustituye esa comprobación.

El secret previsto para el acceso es **BAZTANGO_APP_ACCESS_PASSWORD**, a crear por el usuario en Wix Secrets Manager. El valor lo eliges tú; no aparece en estos archivos y no debes introducirlo en una colección, un CSV, el repositorio, un enlace o la configuración pública. La nueva sesión de implementación entregará el backend y sus instrucciones exactas. No crees aún otros secretos basándote en nombres supuestos.

Este acceso por credencial compartida debe comprobarse en cada consulta de backend; no equivale a cuentas personales. La clave de administración Wix nunca se entrega al navegador. Las credenciales que introduzca un operador para acceder no deben persistirse en almacenamiento del navegador.

## 3. Importar los ejemplos, solo si quieres comprobar la estructura

No son necesarios para publicar la interfaz ni para preparar las colecciones vacías. Importarlos únicamente si quieres ensayar los tipos y referencias antes de cargar datos reales.

1. Usar el CSV de ejemplos correspondiente a cada colección. Las cabeceras se mapean a los IDs de campo exactos; mapear _id al ID del sistema.
2. Importar BTEventos, BTVersiones, BTReservas y BTPersonas.
3. Importar BTPagos y BTImputaciones; después BTActividades y BTParticipaciones.
4. Importar BTHabitaciones y BTEstancias.
5. Importar BTGastos, BTCajas y después BTMovimientos.
6. Importar BTSolicitudes.
7. Comprobar en el CMS que las referencias muestran el elemento de destino correcto, no una celda vacía o una cadena suelta.

Los enlaces de los ejemplos contienen los _id deterministas incluidos en sus CSV. Si Wix no conserva esos IDs en la modalidad de importación utilizada, exportar los IDs asignados y sustituir las referencias de los archivos dependientes antes de importarlos. No confundir un código de persona/reserva con un ID del sistema.

Para revisar booleanos, elegir true como verdadero y false como falso. Configurar las fechas ISO según su formato y comprobar que los campos Número permanecen enteros. Una celda vacía representa dato no informado; no equivale a cero.

No rellenar currentVersionRef ni cambiar state a ready en los ejemplos. Los archivos sirven para estructura y formatos; no son un snapshot real validado del gestor. Mantener los ejemplos fuera de la copia real y no mezclarlos con ella.

## 4. Cómo recibirá datos reales la página

La sesión **Implementar y publicar Baztango App en GitHub Pages** construirá la web y el adaptador de lectura, preparará el backend Wix y entregará los pasos de conexión. Hasta configurar la URL Wix, el backend, el secret y una copia publicada de datos reales, el sitio debe mostrar Conexión pendiente o Sin datos publicados y no aparentar que consulta el evento.

Importar una plantilla vacía crea estructura, pero **no sincroniza el gestor**. Un archivo CSV es una carga puntual. La alimentación real necesita generar las 14 tablas desde los servicios del gestor, validar relaciones/saldos/recuentos y publicar una versión completa. El cargador deberá usar nuevos IDs y claves para la copia real, conservar una única versión en cada consulta y activar currentVersionRef solo al terminar la validación. Este paquete no implementa ni ejecuta ese exportador o sincronizador.

No subir CSV con datos reales ni copias SQLite al repositorio público. Los archivos reales se generan localmente y se cargan por un canal administrativo autorizado. No sustituir las reglas financieras por columnas exportadas de forma ingenua.

## Documentación de Wix y GitHub

- [Importar CSV en Wix y referencias por ID](https://support.wix.com/en/article/cms-formerly-content-manager-importing-content-into-a-collection)
- [Campos e ID del sistema Wix](https://support.wix.com/en/article/cms-formerly-content-manager-about-your-collection-fields)
- [Tipos de campos](https://support.wix.com/en/article/cms-formerly-content-manager-adding-a-field-to-a-collection)
- [Permisos de colecciones](https://support.wix.com/en/article/cms-changing-your-collection-permissions)
- [Secretos en backend Wix](https://dev.wix.com/docs/velo/apis/wix-secrets-backend-v2/introduction)
- [GitHub Pages y alojamiento estático](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
