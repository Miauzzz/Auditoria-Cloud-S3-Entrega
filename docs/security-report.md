# Reporte de Auditoría de Seguridad (Controles SEC-01 a SEC-10)

Este reporte técnico detalla la implementación y evidencias de verificación de los controles de seguridad aplicados a **ArchivaCloud P-01**, plataforma segura de almacenamiento y gestión de documentos basada en AWS S3, FastAPI y React + Vite.

---

## SEC-01: Secretos fuera del repositorio

### Qué se implementó:
1.  **Exclusión de Secretos en Control de Versiones**: Se implementó una política estricta de exclusión mediante `.gitignore`, asegurando que ningún archivo de configuración local o credencial secreta sea cargado al repositorio de Git.
2.  **Configuración de Variables de Entorno**: El backend hace uso de `dotenv` para cargar variables a través del entorno de ejecución de forma dinámica. Se estructuró un archivo de plantilla `.env.example` en la raíz del proyecto para que los desarrolladores y evaluadores configuren sus propias credenciales sin versionar datos reales.
3.  **Variables en Frontend**: El frontend no almacena secretos de AWS ni claves privadas. Todas las interacciones con S3 se firman en el backend, por lo que el frontend solo interactúa con URLs temporales de carga y descarga.

### Evidencia:
*   El archivo `.env.example` está presente con variables de plantilla vacías.
*   El archivo `.gitignore` raíz y el archivo `frontend/.gitignore` excluyen explícitamente `.env`, `backend/.env` y `*.env`.
*   El código fuente del backend utiliza `os.getenv` para obtener dinámicamente las credenciales de AWS y del bucket.

### Archivos involucrados:
*   [.gitignore](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/.gitignore)
*   [frontend/.gitignore](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/frontend/.gitignore)
*   [.env.example](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/.env.example)
*   [backend/main.py](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/backend/main.py) (carga de variables con `load_dotenv()`)

---

## SEC-02: CORS restrictivo

### Qué se implementó:
Se configuró el middleware de CORS (`CORSMiddleware`) de FastAPI de forma restrictiva. En lugar de permitir cualquier origen mediante el comodín `*`, el origen permitido se define estrictamente en la variable de entorno `FRONTEND_ORIGIN` (apuntando a `http://localhost:5173` en desarrollo). El backend valida activamente al iniciarse que este origen no sea un comodín ni se encuentre vacío.

### Evidencia:
*   Si se inicializa el backend con la variable `FRONTEND_ORIGIN` configurada como `*`, el backend arroja un error crítico de inicialización: `ValueError("FRONTEND_ORIGIN no puede ser '*' ni estar vacío...")`.
*   Las cabeceras HTTP de respuesta solo exponen los métodos y cabeceras estrictamente necesarios para la aplicación.

### Archivos involucrados:
*   [backend/main.py](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/backend/main.py#L25-L48) (configuración de CORS y validación inicial)

---

## SEC-03: Validación de entrada y prevención de Path Traversal

### Qué se implementó:
1.  **Validación de Datos (Pydantic)**: Se creó la clase `PresignedUrlRequest` heredando de `BaseModel` de Pydantic para validar estrictamente los parámetros enviados por el frontend (`fileName` cadena de texto de 1 a 255 caracteres, `fileType` no vacío, `fileSize` entero positivo mayor a cero).
2.  **Lista Blanca de Formatos**: Se definió un mapeo estricto `ALLOWED_CONTENT_TYPES` y una lista blanca de extensiones permitidas (`.pdf` y `.docx`). Se valida tanto en el frontend como en el backend que el archivo coincida de manera exacta con su extensión y content-type esperado.
3.  **Sanitización de Nombres**: Se implementó la función `sanitize_filename` en el backend que utiliza expresiones regulares para remover cualquier carácter fuera del rango alfanumérico estándar y caracteres permitidos (`a-zA-Z0-9._-`), reemplazando caracteres inválidos con guiones bajos `_` y eliminando puntos o guiones al inicio o final.
4.  **Prevención de Path Traversal**: En todos los endpoints que reciben parámetros de ruta o nombres de archivos (`delete_file`, `get_pdf_preview`), se añadió un filtro explícito que deniega peticiones si la clave contiene secuencias de directorios relativos (`..`) o barras invertidas (`\`).

### Evidencia:
*   Intentos de inyectar rutas como `uploads/../../etc/passwd` o `uploads\\secret.txt` son interceptados y bloqueados por el backend con un código `HTTP 400 Bad Request`.
*   Subir archivos con nombres conteniendo caracteres especiales los renombra automáticamente a un formato alfanumérico seguro en el bucket de S3.

### Archivos involucrados:
*   [backend/main.py](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/backend/main.py#L80-L136) (validación Pydantic, sanitización de nombre y prevención de Traversal)

---

## SEC-04: Límite de tamaño de archivos (10 MB)

### Qué se implementó:
Se implementaron validaciones de tamaño de archivo duplicadas tanto en el cliente (frontend) como en el servidor (backend) para mitigar vectores de denegación de servicio (DoS) por agotamiento de almacenamiento o ancho de banda:
1.  **Validación del Servidor**: El backend lee la variable de entorno `MAX_FILE_SIZE_MB` (10 MB por defecto) y valida que el campo `fileSize` de la petición sea menor o igual al equivalente en bytes (`10 * 1024 * 1024`).
2.  **Validación del Cliente**: El frontend intercepta el evento de carga en `handleFileUpload` y verifica el tamaño de forma local (`file.size > maxSizeBytes`) antes de realizar la petición HTTP al servidor, mostrando una alerta amigable.

### Evidencia:
*   Si el usuario intenta cargar un archivo de más de 10 MB, el frontend cancela el flujo de subida de inmediato y muestra un toast de error.
*   Si se intenta manipular la petición HTTP de forma directa enviando un tamaño simulado mayor a la API, el backend retorna `HTTP 400 Bad Request`.

### Archivos involucrados:
*   [frontend/src/App.jsx](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/frontend/src/App.jsx#L106-L111) (validación en frontend)
*   [backend/main.py](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/backend/main.py#L130-L134) (validación en backend)

---

## SEC-05: IAM mínimo privilegio

### Qué se implementó:
Se definió y estructuró una política IAM restrictiva para las credenciales de AWS del servidor de backend. El backend solo requiere interactuar con un único bucket (`archivacloud-p01`) y específicamente bajo el prefijo seguro `uploads/`. La política deniega el acceso a cualquier otra acción de S3 o recurso de AWS.

### Evidencia:
*   La política IAM asignada limita los recursos del bucket a `arn:aws:s3:::archivacloud-p01` y sus objetos a `arn:aws:s3:::archivacloud-p01/uploads/*`.
*   Las acciones permitidas se restringen exclusivamente a `s3:ListBucket`, `s3:GetObject`, `s3:PutObject` y `s3:DeleteObject`.

### Archivos involucrados:
*   [README.md](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/README.md#L64-L106) (definición JSON de la política IAM en documentación)

---

## SEC-06: Bucket privado y Block Public Access (BPA) activo

### Qué se implementó:
1.  **Block Public Access (BPA) Activo**: El bucket `archivacloud-p01` en Amazon S3 está configurado bloqueando todo el tráfico público anónimo de internet.
2.  **URLs Presirmadas Temporales**: El backend actúa como intermediario seguro autorizando accesos por tiempo limitado. Para descargas o previsualizaciones, el backend genera dinámicamente URLs presirmadas de tipo `GET` con un tiempo de expiración corto (3600 segundos = 1 hora).

### Evidencia:
*   Acceder directamente a la URL estática del objeto (`https://archivacloud-p01.s3.amazonaws.com/uploads/...`) arroja un error XML `AccessDenied` de AWS.
*   Las URLs generadas por el sistema contienen los parámetros de firma temporales (`X-Amz-Algorithm`, `X-Amz-Credential`, `X-Amz-Date`, `X-Amz-Expires`, `X-Amz-Signature` y `X-Amz-Security-Token`) permitiendo la lectura segura y expirando transcurrido el tiempo.

### Archivos involucrados:
*   [backend/main.py](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/backend/main.py#L180-L199) (URLs temporales de subida y lectura en list_files)

---

## SEC-07: Manejo seguro de errores sin Stack Traces

### Qué se implementó:
Se configuraron manejadores globales de excepciones en el backend para interceptar cualquier fallo imprevisto de la aplicación (errores de red de boto3, excepciones de la librería fitz, etc.):
1.  El error real detallado y la traza de pila (stack trace) se escriben en los logs privados de la consola del servidor para fines de depuración interna.
2.  La respuesta enviada al cliente se sanitiza por completo, respondiendo con un mensaje genérico y seguro como `{"detail": "Ha ocurrido un error interno en el servidor."}` y un código de estado `HTTP 500`.

### Evidencia:
*   En caso de desconexión de base de datos o fallo en el cliente de S3, el cliente de navegador recibe una respuesta JSON limpia libre de trazas de código fuente o variables internas.

### Archivos involucrados:
*   [backend/main.py](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/backend/main.py#L50-L72) (manejadores globales en FastAPI)

---

## SEC-08: SSE-S3 habilitado (Cifrado del lado del servidor)

### Qué se implementó:
Se configuró la obligatoriedad del cifrado de datos en reposo en Amazon S3 usando el algoritmo estándar `AES-256`:
1.  **Petición de subida en backend**: Al solicitar la URL presirmada de subida (`PUT`), se añade el parámetro `"ServerSideEncryption": "AES256"`.
2.  **Petición Axios en frontend**: Al realizar el envío directo del archivo al bucket desde el navegador web, el frontend incorpora la cabecera `'x-amz-server-side-encryption': 'AES256'`.

### Evidencia:
*   Si el frontend no enviara la cabecera de cifrado, la firma calculada por AWS no coincidiría y el almacenamiento rechazaría la subida.
*   En el panel de control de S3, los objetos cargados muestran la propiedad "Cifrado del lado del servidor (SSE-S3)" activada.

### Archivos involucrados:
*   [backend/main.py](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/backend/main.py#L186) (parámetro en generación de URL presirmada)
*   [frontend/src/App.jsx](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/frontend/src/App.jsx#L135) (cabecera en la petición Axios PUT)

---

## SEC-09: Auditoría de dependencias (pip-audit y npm audit)

### Qué se implementó:
Se integraron en el ciclo de desarrollo herramientas automatizadas para auditar vulnerabilidades en las librerías dependientes:
1.  **pip-audit**: Escanea el archivo `backend/requirements.txt` localizando paquetes con vulnerabilidades conocidas en la base de datos de PyPI.
2.  **npm audit**: Analiza el árbol de paquetes instalados bajo `frontend/node_modules/` y su archivo `package-lock.json`.

### Evidencia:
*   Ejecución y reporte documentados de ambas auditorías con **0 vulnerabilidades encontradas** (ver reportes de auditoría en la documentación y README).

### Archivos involucrados:
*   [backend/requirements.txt](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/backend/requirements.txt)
*   [frontend/package.json](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/frontend/package.json)

---

## SEC-10: TLS extremo a extremo (HTTPS)

### Qué se implementó:
El sistema está completamente diseñado para acoplarse a configuraciones seguras con cifrado SSL/TLS de extremo a extremo. Se documenta la arquitectura de producción mediante:
1.  **Configuración de Proxy Inverso Nginx**: Redirección permanente de peticiones HTTP (puerto 80) a HTTPS (puerto 443) empleando certificados de Let's Encrypt actualizados de forma automática.
2.  **AWS ALB (Application Load Balancer)**: Configuración recomendada para entornos de nube con redirección automática a HTTPS en el puerto 443 adjuntando un certificado ACM.

### Evidencia:
*   Toda interacción en producción viaja cifrada mediante HTTPS, garantizando la confidencialidad de los tokens y firmas temporales generados por la API.

### Archivos involucrados:
*   [README.md](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/README.md) (sección de despliegue HTTPS en producción)
