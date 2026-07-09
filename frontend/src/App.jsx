import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  ExternalLink, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FolderOpen,
  X,
  LayoutDashboard,
  Folder,
  Bell,
  Download,
  Shield,
  Activity,
  Server
} from 'lucide-react';

// Custom HD SVG vectors for PDF and DOCX
const PdfIcon = ({ size = 24 }) => (
  <svg width={size} height={(size * 30) / 24} viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="brand-icon pdf-icon">
    <path d="M4 2C2.89543 2 2 2.89543 2 4V26C2 27.1046 2.89543 28 4 28H20C21.1046 28 22 27.1046 22 26V10L14 2H4Z" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1.5" />
    <path d="M14 2V10H22" fill="#E5E7EB" stroke="#D1D5DB" strokeWidth="1.5" />
    {/* Acrobat ribbon outline representation */}
    <path d="M12 6.5C10.5 6.5 10.5 8.5 12 8.5C13.5 8.5 13.5 10.5 12 10.5" stroke="#EF4444" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    {/* Red banner at bottom */}
    <rect x="2" y="16" width="20" height="7" fill="#EF4444" />
    <text x="12" y="21.5" fill="#FFFFFF" fontSize="6.5" fontWeight="900" textAnchor="middle" fontFamily="var(--font-heading), sans-serif">PDF</text>
  </svg>
);

const DocxIcon = ({ size = 24 }) => (
  <svg width={size} height={(size * 30) / 24} viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="brand-icon docx-icon">
    <path d="M4 2C2.89543 2 2 2.89543 2 4V26C2 27.1046 2.89543 28 4 28H20C21.1046 28 22 27.1046 22 26V10L14 2H4Z" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1.5" />
    <path d="M14 2V10H22" fill="#E5E7EB" stroke="#D1D5DB" strokeWidth="1.5" />
    {/* Microsoft Word tile with W */}
    <rect x="5" y="14" width="7" height="10" rx="1" fill="#2563EB" />
    <text x="8.5" y="21.5" fill="#FFFFFF" fontSize="8" fontWeight="900" textAnchor="middle" fontFamily="var(--font-heading), sans-serif">W</text>
    {/* Lines representing document content */}
    <line x1="14" y1="16" x2="19" y2="16" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="14" y1="19" x2="19" y2="19" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="14" y1="22" x2="17" y2="22" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default function App() {
  // NAVIGATION & VIEWS
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'files'
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // STATE MANAGEMENT
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileFilter, setFileFilter] = useState('all'); // 'all', 'pdf', 'docx'
  const [sizeFilter, setSizeFilter] = useState('all'); // 'all', 'small' (<1MB), 'medium' (1-5MB), 'large' (5-10MB)
  const [sortBy, setSortBy] = useState('date-desc'); // 'date-desc', 'size-desc', 'name-asc'
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Upload & UI Feedback States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [shakeDropzone, setShakeDropzone] = useState(false);

  // Technical panel health check
  const [apiOnline, setApiOnline] = useState(true);
  const [serverActive, setServerActive] = useState(false);
  const [connectionConfig, setConnectionConfig] = useState({ aws_region: 'us-east-1', port: 8001, encryption_standard: 'AES-256' });

  // Fallback states for PDF image loads
  const [failedPreviews, setFailedPreviews] = useState({});

  const triggerShake = () => {
    setShakeDropzone(true);
    setTimeout(() => setShakeDropzone(false), 500);
  };
  
  // Notification & Modals
  const [notification, setNotification] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { key, name }
  
  const fileInputRef = useRef(null);

  // AUTO-HIDE NOTIFICATIONS
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // FETCH FILES AND API HEALTH ON LOAD
  useEffect(() => {
    fetchFiles();
    checkApiHealth();
  }, []);

  // RESET PAGINATION ON FILTER CHANGE
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, fileFilter, sizeFilter, sortBy]);

  const triggerNotification = (type, message) => {
    setNotification({ type, message });
  };

  // CHECK BACKEND API HEALTH
  const checkApiHealth = async () => {
    try {
      // 1. Intentar obtener la configuración del puerto y la región para ver si el servidor responde
      try {
        const configRes = await axios.get('/api/config');
        setConnectionConfig({
          aws_region: configRes.data.aws_region,
          port: configRes.data.port,
          encryption_standard: configRes.data.encryption_standard
        });
        setServerActive(true);
      } catch (configErr) {
        console.error('Error fetching backend config:', configErr);
        setServerActive(false);
      }

      // 2. Verificar la conectividad real con AWS S3 y DynamoDB
      await axios.get('/healthz');
      setApiOnline(true);
    } catch (error) {
      console.error('API is offline or AWS disconnected:', error);
      setApiOnline(false);
      // Si falló el health check pero el /api/config funcionó, el servidor está activo pero sin credenciales
    }
  };

  // GET /api/files
  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/files');
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      triggerNotification(
        'error', 
        error.response?.data?.detail || 'No se pudo conectar con el servidor para listar los archivos.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // FRONTEND SANITIZATION
  const sanitizeFilename = (filename) => {
    const extIndex = filename.lastIndexOf('.');
    if (extIndex === -1) return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    const baseName = filename.substring(0, extIndex);
    const extension = filename.substring(extIndex);
    const safeBase = baseName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^[._]+|[._]+$/g, '');
    
    if (!safeBase) return `file_${Date.now()}${extension.toLowerCase()}`;
    return `${safeBase}${extension.toLowerCase()}`;
  };

  // UPLOAD WORKFLOW
  const handleFileUpload = async (file) => {
    if (!file) return;

    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const maxSizeBytes = 10 * 1024 * 1024; // 10 MB

    // 1. Validation: Allowed Extensions
    if (extension !== '.pdf' && extension !== '.docx') {
      triggerShake();
      triggerNotification('error', 'Tipo de archivo no permitido. Solo se aceptan documentos PDF y DOCX.');
      return;
    }

    // 2. Validation: Max Size
    if (file.size > maxSizeBytes) {
      triggerShake();
      triggerNotification('error', 'El archivo supera el tamaño máximo permitido de 10 MB.');
      return;
    }

    // 3. Sanitization
    const sanitizedName = sanitizeFilename(file.name);
    setUploadingFileName(sanitizedName);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step A: Request S3 Presigned URL from Backend
      const presignedRes = await axios.post('/api/upload/presigned-url', {
        fileName: sanitizedName,
        fileType: file.type || (extension === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        fileSize: file.size
      });

      const { presignedUrl } = presignedRes.data;

      // Step B: Direct PUT upload to S3 Bucket with Axios Progress Tracking
      await axios.put(presignedUrl, file, {
        headers: {
          'Content-Type': file.type || (extension === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
          'x-amz-server-side-encryption': 'AES256'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      triggerNotification('success', `¡Archivo "${sanitizedName}" subido exitosamente!`);
      // Reset failed previews cache for this filename if it is being reuploaded
      setFailedPreviews(prev => {
        const next = { ...prev };
        delete next[sanitizedName];
        return next;
      });
      fetchFiles(); // Auto-refresh list
      setIsUploadOpen(false); // Close dropzone on success
    } catch (error) {
      console.error('Error during upload:', error);
      const errMsg = error.response?.data?.detail || 'Ocurrió un error al subir el archivo al almacenamiento S3.';
      triggerNotification('error', errMsg);
    } finally {
      setIsUploading(false);
      setUploadingFileName('');
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // DELETE WORKFLOW
  const confirmDeleteFile = async () => {
    if (!deleteConfirmation) return;
    const { key, name } = deleteConfirmation;
    setDeleteConfirmation(null);

    try {
      await axios.delete(`/api/files/${key}`);
      triggerNotification('success', `El archivo "${name}" fue eliminado correctamente.`);
      fetchFiles(); // Auto-refresh list
    } catch (error) {
      console.error('Error deleting file:', error);
      triggerNotification('error', error.response?.data?.detail || 'No se pudo eliminar el archivo.');
    }
  };

  // DRAG & DROP EVENT HANDLERS
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // UTILITY: FORMAT FILE SIZE
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // UTILITY: FORMAT DATE
  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  // UTILITY: PARSE UUID AND DISPLAY FILENAME
  const parseFile = (file) => {
    const fileName = file.name;
    const uuidRegex = /^([0-9a-fA-F]{8})-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}-(.+)$/;
    const match = fileName.match(uuidRegex);
    if (match) {
      return {
        id: match[1].toUpperCase(),
        displayName: match[2]
      };
    }
    return {
      id: 'N/A',
      displayName: fileName
    };
  };

  // DYNAMIC COMPUTATION OF STORAGE
  const totalSizeInBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const totalSizeInMB = totalSizeInBytes / (1024 * 1024);
  const limitInBytes = 10 * 1024 * 1024 * 1024; // 10 GB
  const percentUsed = (totalSizeInBytes / limitInBytes) * 100;

  // METRICS COMPUTATION FOR DASHBOARD
  const totalFiles = files.length;
  const pdfCount = files.filter(f => f.name.endsWith('.pdf')).length;
  const docxCount = files.filter(f => f.name.endsWith('.docx')).length;

  // SORT & FILTER LIST
  const filteredFiles = files
    .filter(file => {
      // Extension filter
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (fileFilter === 'pdf' && ext !== '.pdf') return false;
      if (fileFilter === 'docx' && ext !== '.docx') return false;
      
      // Size filter
      const sizeInMB = file.size / (1024 * 1024);
      if (sizeFilter === 'small' && sizeInMB >= 1) return false;
      if (sizeFilter === 'medium' && (sizeInMB < 1 || sizeInMB > 5)) return false;
      if (sizeFilter === 'large' && sizeInMB < 5) return false;

      // Search query filter
      const { displayName } = parseFile(file);
      return displayName.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.lastModified) - new Date(a.lastModified);
      }
      if (sortBy === 'size-desc') {
        return b.size - a.size;
      }
      if (sortBy === 'name-asc') {
        const nameA = parseFile(a).displayName;
        const nameB = parseFile(b).displayName;
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

  // PAGINATION CALCULATIONS
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredFiles.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);

  // LAST 3 FILES UPLOADED
  const lastThreeFiles = [...files]
    .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
    .slice(0, 3);

  // RENDER DASHBOARD VIEW
  const renderDashboard = () => (
    <div className="dashboard-view-el">
      <h2 className="dashboard-title">Panel de Control</h2>
      
      {/* 4 Live Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrapper">
            <FolderOpen size={24} />
          </div>
          <div className="metric-details">
            <span className="metric-label">Total de Archivos</span>
            <span className="metric-value">{totalFiles}</span>
            <span className="metric-sub">Documentos en la nube</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper success">
            <Shield size={24} />
          </div>
          <div className="metric-details">
            <span className="metric-label">Espacio Utilizado</span>
            <span className="metric-value">{totalSizeInMB.toFixed(2)} MB</span>
            <span className="metric-sub">{percentUsed.toFixed(4)}% de 10 GB</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper" style={{ borderRadius: '50%', background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <FileText size={24} />
          </div>
          <div className="metric-details" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span className="metric-label" style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)' }}>Tipos de Archivo</span>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '15px', fontWeight: '700', lineHeight: '1.4', margin: '2px 0' }}>
              <div style={{ color: 'var(--text-secondary)' }}>
                PDF: <span style={{ color: '#ef4444' }}>{pdfCount}</span>
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                DOCX: <span style={{ color: '#3b82f6' }}>{docxCount}</span>
              </div>
            </div>
            <span className="metric-sub" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Formatos permitidos</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper success">
            <Shield size={24} />
          </div>
          <div className="metric-details">
            <span className="metric-label">Estado de Cifrado</span>
            <span className="metric-value" style={{ color: 'var(--success)' }}>Cifrado SSE-S3 Activo</span>
            <span className="metric-sub">Protección AES-256 en reposo</span>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        {/* Left Side: Last 3 Uploaded Files */}
        <div className="dashboard-panel">
          <h3 className="panel-title">Últimos Archivos Subidos</h3>
          {lastThreeFiles.length === 0 ? (
            <div className="empty-files" style={{ padding: '20px 0' }}>
              <FileText size={24} style={{ opacity: 0.5 }} />
              <p style={{ marginTop: '8px' }}>No hay archivos cargados actualmente.</p>
            </div>
          ) : (
            <div className="recent-files-list">
              {lastThreeFiles.map(file => {
                const isPdf = file.name.endsWith('.pdf');
                const { id, displayName } = parseFile(file);
                return (
                  <div key={file.key} className="recent-file-item">
                    <div className="recent-file-left">
                      {isPdf ? <PdfIcon size={20} /> : <DocxIcon size={20} />}
                      <div className="recent-file-info">
                        <span className="recent-file-name" title={displayName}>{displayName}</span>
                        <div className="recent-file-meta">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>ID: {id}</span>
                          <span>•</span>
                          <span>{formatDate(file.lastModified)}</span>
                        </div>
                      </div>
                    </div>
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      title="Descarga rápida"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <button className="btn-icon">
                        <Download size={16} />
                      </button>
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Technical Connection Panel */}
        <div className="dashboard-panel">
          <h3 className="panel-title">Estado de Conexión</h3>
          <div className="connection-panel">
            <div className="connection-item">
              <span className="connection-label">API Backend</span>
              <span className="connection-val">
                <div className={`status-dot ${apiOnline ? '' : 'offline'}`}></div>
                {apiOnline ? 'En línea' : 'Desconectado'}
              </span>
            </div>
            <div className="connection-item">
              <span className="connection-label">Región AWS</span>
              <span className="connection-val">
                <span className="type-badge docx" style={{ textTransform: 'none', padding: '2px 6px' }}>
                  {serverActive ? connectionConfig.aws_region : 'N/A'}
                </span>
              </span>
            </div>
            <div className="connection-item">
              <span className="connection-label">Puerto de Servicio</span>
              <span className="connection-val">
                {serverActive ? connectionConfig.port : 'N/A'}
              </span>
            </div>
            <div className="connection-item">
              <span className="connection-label">Estándar Cifrado</span>
              <span className="connection-val" style={{ color: 'var(--success)' }}>
                {serverActive ? connectionConfig.encryption_standard : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // RENDER FILES VIEW
  const renderFiles = () => (
    <div className="files-view-el">
      {/* Search, Filter & Upload trigger */}
      <div className="files-control-row">
        <div className="files-search-filters">
          <div className="search-wrapper" style={{ minWidth: '220px' }}>
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar por nombre..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                title="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select 
            className="select-filter"
            value={fileFilter}
            onChange={(e) => setFileFilter(e.target.value)}
          >
            <option value="all">Tipo: Todos</option>
            <option value="pdf">Tipo: PDF</option>
            <option value="docx">Tipo: DOCX</option>
          </select>

          <select 
            className="select-filter"
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
          >
            <option value="all">Tamaño: Todos</option>
            <option value="small">Tamaño: Pequeño (&lt; 1 MB)</option>
            <option value="medium">Tamaño: Mediano (1 - 5 MB)</option>
            <option value="large">Tamaño: Grande (5 - 10 MB)</option>
          </select>

          <select 
            className="select-filter"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date-desc">Fecha: Más recientes</option>
            <option value="size-desc">Tamaño: Más grandes</option>
            <option value="name-asc">Nombre: A-Z</option>
          </select>

          <button 
            className="btn-icon" 
            onClick={fetchFiles} 
            title="Actualizar lista"
            disabled={isLoading}
          >
            <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
          </button>
        </div>

        <button 
          className="btn-primary-sm"
          style={{ padding: '10px 18px', fontWeight: 'bold' }}
          onClick={() => setIsUploadOpen(!isUploadOpen)}
        >
          <UploadCloud size={16} />
          + Subir archivo
        </button>
      </div>

      {/* Collapsible upload panel */}
      <div className={`collapsible-dropzone ${isUploadOpen ? 'open' : ''}`}>
        <div className="dropzone-container-card">
          <button className="close-dropzone-btn" onClick={() => setIsUploadOpen(false)}>
            <X size={18} />
          </button>
          
          <div 
            className={`dropzone ${dragActive ? 'active' : ''} ${shakeDropzone ? 'shake' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              className="file-input" 
              accept=".pdf,.docx"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            
            <div className="dropzone-icon">
              <UploadCloud size={32} />
            </div>
            
            <div className="dropzone-text">
              <h3>Arrastra tus archivos aquí</h3>
              <p>O haz clic para seleccionar desde tu equipo (Máx: 10 MB, solo PDF y DOCX)</p>
            </div>
          </div>

          {isUploading && (
            <div className="progress-container" style={{ marginTop: '16px' }}>
              <div className="progress-header">
                <span className="file-name">{uploadingFileName}</span>
                <span className="percentage">{uploadProgress}%</span>
              </div>
              <div className="progress-bar-bg">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="progress-status">
                <RefreshCw size={12} className="spin" />
                <span>Subiendo archivo cifrado con SSE-S3...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Files Table */}
      {isLoading && files.length === 0 ? (
        <div className="empty-files">
          <RefreshCw size={32} className="spin" />
          <h3>Cargando almacenamiento...</h3>
          <p>Conectando de forma segura con el bucket S3 en us-east-1.</p>
        </div>
      ) : currentItems.length === 0 ? (
        <div className="empty-files">
          <FileText size={32} />
          <h3>No se encontraron archivos</h3>
          <p>
            {searchQuery || fileFilter !== 'all' || sizeFilter !== 'all'
              ? 'Prueba modificando tus filtros o criterio de búsqueda.' 
              : 'Haz clic en "+ Subir archivo" para subir tu primer documento PDF o DOCX.'}
          </p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="files-table-el">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Preview</th>
                  <th>Nombre</th>
                  <th style={{ width: '120px' }}>Tipo</th>
                  <th style={{ width: '120px' }}>Tamaño</th>
                  <th style={{ width: '200px' }}>Fecha de Subida</th>
                  <th style={{ width: '150px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((file) => {
                  const isPdf = file.name.endsWith('.pdf');
                  const { id, displayName } = parseFile(file);

                  return (
                    <tr key={file.key}>
                      {/* PREVIEW COLUMN */}
                      <td>
                        <div className="table-preview-cell">
                          <div className="table-preview-container">
                            {isPdf ? (
                              !failedPreviews[file.key] ? (
                                <img 
                                  src={`/api/files/preview/${file.key}`} 
                                  alt={`Vista previa de ${displayName}`}
                                  className="table-preview-img"
                                  onError={() => setFailedPreviews(prev => ({ ...prev, [file.key]: true }))}
                                  onClick={() => window.open(file.url, '_blank')}
                                  title="Click para abrir/previsualizar"
                                />
                              ) : (
                                <div 
                                  className="pdf-preview-fallback" 
                                  onClick={() => window.open(file.url, '_blank')}
                                  title="Error al cargar miniatura. Click para abrir/previsualizar"
                                >
                                  <PdfIcon size={38} />
                                </div>
                              )
                            ) : (
                              <div 
                                className="docx-preview-tile"
                                title="Previsualización representativa de Word"
                              >
                                <DocxIcon size={38} />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* NAME COLUMN */}
                      <td>
                        <div className="table-name-cell">
                          {isPdf ? <PdfIcon size={28} /> : <DocxIcon size={28} />}
                          <div className="table-name-details">
                            {isPdf ? (
                              <span 
                                className="file-name-clickable"
                                onClick={() => window.open(file.url, '_blank')}
                                title="Click para abrir/previsualizar en nueva pestaña"
                              >
                                {displayName}
                              </span>
                            ) : (
                              <span className="file-name-plain">
                                {displayName}
                              </span>
                            )}
                            <span className="file-id-subtitle">ID: {id}</span>
                          </div>
                        </div>
                      </td>

                      {/* TYPE COLUMN */}
                      <td>
                        <span className={`type-badge ${isPdf ? 'pdf' : 'docx'}`}>
                          {isPdf ? 'PDF' : 'DOCX'}
                        </span>
                      </td>

                      {/* SIZE COLUMN */}
                      <td>{formatFileSize(file.size)}</td>

                      {/* DATE COLUMN */}
                      <td>{formatDate(file.lastModified)}</td>

                      {/* ACTIONS COLUMN */}
                      <td>
                        <div className="table-actions-cell">
                          <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                          >
                            <button className="btn-primary-sm" title="Descargar archivo">
                              <Download size={14} />
                            </button>
                          </a>
                          <button 
                            className="btn-danger-sm" 
                            title="Eliminar archivo"
                            onClick={() => setDeleteConfirmation({ key: file.key, name: displayName })}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-row">
              <span className="pagination-info">
                Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredFiles.length)} de {filteredFiles.length} archivos
              </span>
              
              <div className="pagination-controls">
                <button 
                  className="btn-page" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  &lt;
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page}
                    className={`btn-page ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                
                <button 
                  className="btn-page" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  &gt;
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <FolderOpen size={24} />
          <span>ArchivaCloud</span>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Inicio</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'files' ? 'active' : ''}`}
            onClick={() => setCurrentView('files')}
          >
            <Folder size={18} />
            <span>Archivos</span>
          </button>
        </nav>

        {/* Dynamic Storage Indicator */}
        <div className="storage-indicator">
          <div className="storage-header">
            <span className="storage-title">Uso en la app</span>
            <span className="storage-percentage">{percentUsed.toFixed(2)}%</span>
          </div>
          <div className="storage-bar-bg">
            <div 
              className="storage-bar-fill" 
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            ></div>
          </div>
          <div className="storage-text">
            {totalSizeInMB.toFixed(2)} MB / 10 GB
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="main-content">
        {/* TOPBAR */}
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Inicio</span>
            <span className="separator">&gt;</span>
            <span className="current">{currentView === 'dashboard' ? 'Dashboard' : 'Archivos'}</span>
          </div>
          
          <div className="topbar-right">
            <button className="topbar-bell" onClick={checkApiHealth} title="Probar conexión con API">
              <Bell size={18} />
            </button>
            
            <div className="school-badge">
              <span className="badge-title">Pareja P-01:</span>
              <span className="team-members">José Tapia &amp; Jimmy Polanco</span>
            </div>
          </div>
        </header>

        {/* VIEW CONTAINER */}
        <main className="view-container">
          {currentView === 'dashboard' ? renderDashboard() : renderFiles()}
        </main>
      </div>

      {/* MODAL CONFIRM DELETE */}
      {deleteConfirmation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />
              <h3>¿Eliminar archivo?</h3>
            </div>
            
            <div className="modal-body">
              <p>¿Estás seguro de que deseas eliminar permanentemente este archivo del bucket de Amazon S3? Esta acción no se puede deshacer.</p>
              <div className="file-to-delete">{deleteConfirmation.name}</div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setDeleteConfirmation(null)}
              >
                Cancelar
              </button>
              <button 
                className="btn-danger" 
                onClick={confirmDeleteFile}
              >
                Confirmar Eliminación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {notification && (
        <div className={`alert-toast ${notification.type}`}>
          {notification.type === 'success' ? (
            <CheckCircle size={18} />
          ) : (
            <XCircle size={18} />
          )}
          <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
}
