# Checklist de Entrega Final (Anexo E) - ArchivaCloud P-01

Este documento contiene la lista de verificación final para la entrega del proyecto **ArchivaCloud P-01**, de acuerdo con las especificaciones del Anexo E del enunciado.

---

## 📋 Lista de Verificación de Requisitos

### 👥 Identificación y Estructura
*   **Código de Pareja P-01 y nombres de integrantes en README.md**: ✅ Cumple
*   **Entorno virtual y carpeta `.git` excluidos en `.gitignore`**: ✅ Cumple
*   **Archivos de secretos `.env` excluidos y plantilla `.env.example` disponible**: ✅ Cumple
*   **Estructura de directorios organizada (`backend/`, `frontend/`, `docs/`)**: ✅ Cumple

### 🔒 Controles de Seguridad (SEC-01 a SEC-10)
*   **SEC-01 (Sin secretos hardcodeados)**: ✅ Cumple
*   **SEC-02 (CORS restrictivo sin comodín `*`)**: ✅ Cumple
*   **SEC-03 (Validación de tipo, extensión y Path Traversal en backend)**: ✅ Cumple
*   **SEC-04 (Límite de tamaño de 10 MB en cliente y servidor)**: ✅ Cumple
*   **SEC-05 (Política IAM de mínimo privilegio documentada)**: ✅ Cumple
*   **SEC-06 (Bucket privado con Block Public Access activo)**: ✅ Cumple
*   **SEC-07 (Manejo de errores seguro y eliminación de stack traces)**: ✅ Cumple
*   **SEC-08 (Cifrado en reposo SSE-S3 AES-256 en la subida)**: ✅ Cumple
*   **SEC-09 (Auditorías de dependencias pip-audit y npm audit limpias)**: ✅ Cumple
*   **SEC-10 (Diseño preparado para TLS / HTTPS extremo a extremo)**: ✅ Cumple

### 📸 Features del Negocio
*   **Carga directa a S3 mediante URLs presirmadas PUT**: ✅ Cumple
*   **Listado de archivos dinámico desde S3**: ✅ Cumple
*   **Borrado seguro de archivos con confirmación y verificación de existencia**: ✅ Cumple
*   **Descarga segura mediante URLs presirmadas temporales GET**: ✅ Cumple
*   **Feature Extra: Previsualización de primera página de PDF cargada dinámicamente**: ✅ Cumple
*   **Icono distintivo de Microsoft Word para archivos DOCX sin renderizado complejo**: ✅ Cumple

### 📄 Entregables y Documentación
*   **Reporte de seguridad completo en `docs/security-report.md`**: ✅ Cumple
*   **Documentación de la Feature Extra en `docs/feature-preview-pdf.md`**: ✅ Cumple
*   **README.md estructurado con todos los comandos y diagramas ASCII**: ✅ Cumple
*   **Diagrama de arquitectura manuscrito y firmado**: ⚠️ Requiere acción manual
    *   *Estado actual*: Se generó un placeholder visual en [docs/arquitectura.jpg](file:///d:/CLoud/ArchivaCloud-P01-master-master/ArchivaCloud-P01-master-master/docs/arquitectura.jpg) que el estudiante debe sustituir por la foto de su dibujo manuscrito.
*   **Screencast demostrativo grabado y enlazado**: ⚠️ Requiere acción manual
    *   *Estado actual*: Se dejó un enlace placeholder en el README.md. El estudiante debe grabar su screencast y actualizar el link.
*   **Declaración de uso de herramientas de IA adjunta**: ⚠️ Requiere acción manual
    *   *Estado actual*: Debe completarse y adjuntarse al entregar en la plataforma educativa.
*   **Bitácora de trabajo firmada por ambos integrantes**: ⚠️ Requiere acción manual
    *   *Estado actual*: Debe firmarse digital o físicamente por ambos integrantes y adjuntarse en el zip final.
*   **Tag de Git `v1.0.0` creado en el repositorio**: ⚠️ Requiere acción manual
    *   *Estado actual*: El estudiante debe correr el comando `git tag v1.0.0` y hacer push del tag una vez inicialice su repositorio personal.
