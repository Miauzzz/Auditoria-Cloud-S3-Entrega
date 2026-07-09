# Auditoría de Seguridad: S3 File Upload

**Grupo:** N°6

**Integrantes:** Manuel Constanzo, Esteban Peñalillo, Martin Mora.

**Asignatura:** Arquitectura On-Premise y On-Cloud

---

Este repositorio contiene la auditoría técnica realizada sobre la aplicación "S3 File Upload". Se incluye el código fuente analizado, la documentación de las vulnerabilidades descubiertas y la propuesta de remediación basada en Infraestructura como Código (IaC).

**Proyecto:** ArchivaCloud SpA

**Fork de:** https://github.com/JimmyDaroch/ArchivaCloud-P01

**Integrantes del proyecto original:** Jimmy Polanco y José Tapia

---

## Estructura del Repositorio

- /backend: Código fuente original de la API (FastAPI).
- /frontend: Código fuente original del cliente (React).
- /iac_remediacion/: Carpeta que contiene la arquitectura segura propuesta (Terraform).
    - main.tf: Configuración con bloqueos de S3, cifrado KMS, WAF y políticas TLS.

---

## Hallazgos Técnicos (DAST)

Se han documentado vulnerabilidades críticas como acceso no autenticado, Path Traversal y ausencia de límites de consumo. Los scripts de validación están disponibles en los reportes del informe final.

---

## Instrucciones de Reproducción

Para verificar el entorno de auditoría, siga los pasos a continuación:

### 1. Configuración del Backend

1. Navegue a la carpeta /backend.
2. Instale las dependencias necesarias: 
   pip install -r requirements.txt
   (Correción : Se agregó dependencia "pymupdf" faltante para arrancar el servidor en el requirements.txt original).
3. Inicie el servidor: 
   uvicorn app.main:app --port 8001

### 2. Ejecución de Pruebas (Ejemplos)

Para validar las vulnerabilidades encontradas, puede utilizar los siguientes comandos:

* Prueba de Path Traversal (VULN-003):
  curl -X DELETE http://localhost:8001/api/files/uploads/..%2f..%2f..%2fetc%2fpasswd

* Prueba de Evasión de filtro en URL Prefirmada (VULN-004):
  curl -i -X POST http://localhost:8001/api/upload/presigned-url -H "Content-Type: application/json" -d '{"fileName": "malware.exe.pdf", "fileType": "application/pdf", "fileSize": 1024}'

---

## Remediación (IaC)

La arquitectura propuesta corrige los hallazgos mediante Terraform, implementando controles de seguridad en la nube (AWS).

Para desplegar los controles de seguridad:

1. Navegue a la carpeta /iac_remediacion.
2. Inicialice el entorno de Terraform:
   terraform init
3. Valide y aplique la configuración:
   terraform validate
   terraform apply

*Nota: Asegúrese de tener configuradas sus credenciales de AWS en el entorno de ejecución antes de aplicar los cambios.*
