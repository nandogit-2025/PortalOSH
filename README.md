# PortalOSH

Portal de aplicaciones de OSH Hotels, con chat OSHI conectado al backend
FastAPI de OSH Knowledge. Esta rama corresponde a la prueba local.

## Archivos del chat

- `index.html`: conserva la navegación, aplicaciones, mesas de ayuda y buscador.
- `oshi-chat.js`: widget que envía `POST http://localhost:8099/chat` con
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

## Antes de publicar el chat para otros usuarios

La URL actual `http://localhost:8099/chat`, definida en `oshi-chat.js`, es solo
para esta prueba en el equipo local. Para el portal público hay que desplegar
el backend con HTTPS y configurar esa URL. El backend actual usa la sesión
local de Azure CLI; todavía es un POC, sin autenticación de usuarios.

Las credenciales y las llamadas a Foundry permanecen en el backend. No se
incluyen en este repositorio. Esta integración se prueba en una rama aparte
de `main` hasta que exista la dirección del backend publicado.
