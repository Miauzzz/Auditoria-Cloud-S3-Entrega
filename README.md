# Auditoría de Seguridad: S3 File Upload

**Grupo:** N°6
**Integrantes:** Manuel Constanzo, Esteban Peñalillo, Martin Mora.
**Asignatura:** Arquitectura On-Premise y On-Cloud

Este repositorio contiene la auditoría técnica realizada sobre la aplicación "S3 File Upload". Se incluye el código fuente analizado, la documentación de las vulnerabilidades descubiertas y la propuesta de remediación basada en Infraestructura como Código (IaC).

**Proyecto:** ArchivaCloud SpA
**Fork de:** https://github.com/JimmyDaroch/ArchivaCloud-P01
**Integrantes:** Jimmy Polanco y José Tapia

## Estructura del Repositorio

- `/backend`: Código fuente original de la API (FastAPI).
- `/frontend`: Código fuente original del cliente (React).
- `/iac_remediacion/`: Carpeta que contiene la arquitectura segura propuesta (Terraform).
    - `main.tf`: Configuración con bloqueos de S3, cifrado KMS, WAF y políticas TLS.

## Hallazgos Técnicos (DAST)

Se han documentado vulnerabilidades críticas como acceso no autenticado, Path Traversal y ausencia de límites de consumo. Los scripts de validación están disponibles en los reportes del informe final.

## Instrucciones de Reproducción

Para verificar el entorno de auditoría:

1. **Configuración del Backend:**
   - Navegue a la carpeta `/backend`.
   - Instale dependencias: `pip install -r requirements.txt` (corregido, faltaba dependencia "pymupdf" en el requirements.txt).
   - Inicie el servidor: `uvicorn app.main:app --port 8001`.

2. **Ejecución de Pruebas (Ejemplos):**
   - Para reproducir el hallazgo de **Path Traversal (VULN-003)**:
     ```bash
     curl -X DELETE http://localhost:8001/api/files/uploads/..%2f..%2f..%2fetc%2fpasswd
     ```
   - Para verificar la evasión de filtro en **URL Prefirmada (VULN-004)**:
     ```bash
     curl -i -X POST http://localhost:8001/api/upload/presigned-url -H "Content-Type: application/json" -d '{"fileName": "malware.exe.pdf", "fileType": "application/pdf", "fileSize": 1024}'
     ```

## Remediación (IaC)

La arquitectura propuesta corrige los hallazgos mediante Terraform. 
Para desplegar los controles de seguridad:
1. Navegue a `/iac_remediacion`.
2. Inicialice Terraform: `terraform init`.
3. Valide y aplique: `terraform validate` y `terraform apply`.

*Nota: Asegúrarse de tener configuradas sus credenciales de AWS en el entorno de ejecución.*