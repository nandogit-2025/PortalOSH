# PortalOSH

Portal de aplicaciones de OSH Hotels, con chat OSHI conectado al backend
FastAPI de OSH Knowledge. Incluye pruebas locales/LAN y configuración para HTTPS.

## Archivos del chat

- `index.html`: conserva la navegación, aplicaciones, mesas de ayuda y buscador.
- `oshi-chat-config.js`: dirección HTTPS pública del backend, sin credenciales.
- `oshi-chat.js`: widget que envía `POST` a la dirección configurada con
  `{"message":"..."}` y muestra el campo `answer`.
- `oshi-chat.css`: estilos limitados al widget, incluida la vista móvil.
- `logos/`: imágenes originales del portal; no se reemplazaron ni modificaron.

Las cuatro rutas de logos que diferían en mayúsculas se ajustaron a los nombres
reales para que también funcionen en alojamientos que distinguen mayúsculas.
`n8n-chat-brand.css` se conserva en el repositorio, pero ya no se carga.

## Probar localmente en PowerShell

Terminal 1, backend (requiere una sesión válida de Azure CLI):

```powershell
cd "C:\Users\jtapia\OneDrive - OSH Hotels (1)\Apps\osh-knowledge"
az account show
# Ejecutar az login si no hay una sesión válida.
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8099
```

Terminal 2, portal:

```powershell
cd "C:\Users\jtapia\OneDrive - OSH Hotels (1)\Apps\PortalOSH"
& "..\osh-knowledge\.venv\Scripts\python.exe" -m http.server 8080 --bind 127.0.0.1
```

Abrir <http://localhost:8080/>. El estado del backend se consulta en
<http://localhost:8099/health>. Detener ambos servidores con `Ctrl+C`.

El chat permite Enter para enviar, Shift+Enter para un salto de línea y Escape
para cerrar. El portal sigue siendo utilizable mientras se consulta. Los
mensajes se insertan como texto y el historial solo dura mientras está abierta
la página. Los fallos muestran un mensaje simple y permiten volver a intentar.

## Prueba desde el Portal desplegado — 20 de octubre de 2026

El chat de <https://portalosh.netlify.app/> tiene configurado un túnel HTTPS
temporal hacia el backend del anfitrión. Para conectar, abrir OSHI e introducir
el **código de prueba** que entrega el responsable. Se valida antes de habilitar
el envío y solo se conserva en memoria mientras la página esté abierta.
No se guarda en Git, en la URL ni en el almacenamiento del navegador.

La pasarela exige el código y filtra la IP de salida de la oficina. Permite
únicamente el origen del Portal. Las credenciales de Azure permanecen en el
backend; no son el código de prueba ni se entregan a los usuarios.

El PC anfitrión, el backend, la pasarela y el túnel deben permanecer encendidos.
La dirección cambia al crear un túnel nuevo: actualizar `chatUrl` y volver a
publicar. Es una prueba temporal; el acceso estable y la identidad por usuario
siguen pendientes. Desde otras redes se requiere habilitación explícita.

Con `useLocalBackendOnHttp: true`, las páginas HTTP locales/LAN conservan
el backend del hostname del Portal en el puerto 8099, sin pasar por el túnel.

## Configurar el backend HTTPS

El sitio publicado es <https://portalosh.netlify.app/>. Editar `chatUrl` en
`oshi-chat-config.js` cuando exista la dirección real y completa de `/chat`.
El archivo se carga antes del widget desde `index.html`.

```javascript
window.OSHI_CONFIG = Object.freeze({
  chatUrl: '', // Sustituir por la URL HTTPS real del backend terminada en /chat.
  requiresAccessCode: true, // Para la pasarela de pruebas con código.
  useLocalBackendOnHttp: true,
});
```

Con `chatUrl` vacío, una página HTTPS muestra «OSHI no está disponible en este
momento» y deshabilita el envío. No consulta localhost ni una IP privada desde
Netlify. Las direcciones inválidas, HTTP o con credenciales/parámetros también
deshabilitan el chat, sin intentar una ruta alternativa.

Para activar el servicio publicado:

1. Desplegar el backend con HTTPS, autenticación para los usuarios y acceso a Foundry.
2. Permitir el origen `https://portalosh.netlify.app` en CORS del backend.
3. Escribir su URL real en `oshi-chat-config.js`, guardar y subir el cambio.
4. Llevar el cambio a la rama configurada para desplegar en Netlify y verificar
   el nuevo despliegue con una consulta real desde otro PC.

Publicar el frontend no inicia el backend de la carpeta `osh-knowledge`.
Netlify tampoco puede alcanzar la IP privada de un PC mediante una ruta proxy.
El backend local sigue usando la sesión Azure CLI del anfitrión, sin
autenticación individual. El túnel apunta a una pasarela protegida, no al puerto
8099 directamente. El código es una protección temporal para los probadores.

Las credenciales y las llamadas a Foundry permanecen en el backend. No se
incluyen en este repositorio. Esta integración se prueba en una rama aparte
de `main` hasta que exista la dirección del backend publicado.

## Documentos citados

El chat muestra tarjetas con el nombre del archivo y **Abrir documento**.
Se abre el archivo original en SharePoint con los permisos del usuario.
El backend 0.2 devuelve sources; reiniciarlo para activar la nueva respuesta.
Si el enlace no puede verificarse, se indica sin inventar una ruta.

El POC resuelve fuentes mediante un catálogo de metadatos verificados del
backend, actualizado el 16 de octubre de 2026. Debe refrescarse si se agregan
o renombran archivos. El catálogo no se publica en este repositorio.

## Espera y duración de consultas

Al enviar aparece: Claro, dame un momento mientras reviso la documentación de OSH.
El contador muestra el tiempo transcurrido. A partir de 30 segundos se muestra
Sigo con tu consulta. Gracias por esperar. Al terminar aparece Respuesta en X s.
El tiempo se mide en el navegador, desde el envío hasta recibir y preparar la
respuesta, e incluye red y backend. En un error se muestra el tiempo de espera.
Se registra duración, resultado e ID en la consola, sin pregunta ni respuesta.
No se conserva historial de métricas después de recargar la página.

## Pruebas desde otro PC de la LAN

Si `chatUrl` está vacío, el widget calcula el servidor usando el hostname cuando
el Portal se abre por HTTP: `http://<HOST_DEL_PORTAL>:8099/chat`. Por ello, el
otro PC debe abrir el Portal por la IP del equipo anfitrión, no por localhost.

El backend incorpora un filtro de subredes en `network_access.py`. Para iniciar
la prueba, configurar el CIDR de la LAN en la misma terminal del backend:

```powershell
# Desde la carpeta osh-knowledge. Sustituir por la subred real de la prueba.
$env:OSH_KNOWLEDGE_ALLOWED_NETWORKS = '<SUBRED_CIDR>'
.\.venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8099 --no-proxy-headers
```

En otra terminal, desde osh-knowledge:

```powershell
.\.venv\Scripts\python.exe .\scripts\serve_portal.py --directory '..\PortalOSH' --host 0.0.0.0 --port 8080 --allowed-subnet '<SUBRED_CIDR>'
```

Desde el otro equipo abrir `http://<IP_DEL_EQUIPO_ANFITRION>:8080/`.
Ambos servicios admiten loopback y únicamente la subred indicada. Sin esa
configuración el backend solo acepta loopback. El servidor del Portal sirve
solo el HTML, JS, CSS y logos; rechaza `.git` y los listados de directorio.

Si existe un firewall activo, sus reglas también deben permitir únicamente
estos puertos desde la subred de pruebas. No abrir puertos en el router.
El POC sigue usando la sesión Azure CLI del anfitrión para todas las consultas;
todavía no hay autenticación individual de usuarios en el backend.
