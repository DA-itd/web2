
import React, { useState, useCallback, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

// Since XLSX and jsPDF are loaded from CDN, we need to declare them on the window object
declare const XLSX: any;
declare const jspdf: any;

// ============================================================================
// UTILS & TYPES
// ============================================================================

const ValidationStatus = {
  IDLE: 'idle',
  SUCCESS: 'success',
  NOT_FOUND: 'not_found',
  ERROR: 'error',
};

/**
 * Gets a property from an object using a single, case-insensitive key.
 * @param {object} obj The object to search.
 * @param {string} keyName The case-insensitive key to find.
 * @returns The property value or undefined if not found.
 */
const getProperty = (obj: any, keyName: string) => {
    if (!obj || typeof obj !== 'object' || !keyName) {
        return undefined;
    }
    const keyToFind = keyName.toLowerCase();
    const foundKey = Object.keys(obj).find(k => k.trim().toLowerCase() === keyToFind);
    return foundKey ? obj[foundKey] : undefined;
};

/**
 * Gets a property from an object by trying an array of possible keys.
 * @param {object} obj The object to search.
 * @param {string[]} keys An array of possible keys to try.
 * @returns The property value of the first key found, or undefined.
 */
const getFlexibleProperty = (obj: any, keys: string[]) => {
    if (!obj || typeof obj !== 'object' || !Array.isArray(keys)) {
        return undefined;
    }
    for (const key of keys) {
        const value = getProperty(obj, key);
        if (value !== undefined && value !== null) {
            return value;
        }
    }
    return undefined;
};


/**
 * Formats a date value intelligently, preserving date ranges as strings.
 * @param {*} dateValue The value to format.
 * @returns {string} The formatted date or original string.
 */
const formatDate = (dateValue: any) => {
    if (dateValue === undefined || dateValue === null) return 'N/A';

    // If it's a string that looks like a date range, return it as is.
    if (typeof dateValue === 'string') {
        const lowerCaseValue = dateValue.toLowerCase();
        if (lowerCaseValue.includes(' al ') || lowerCaseValue.includes(' del ') || (lowerCaseValue.match(/ y /g) || []).length > 0) {
            return dateValue;
        }
    }

    // Attempt to parse single dates (from Excel serial or other formats)
    let date;
    if (typeof dateValue === 'number') { // Excel serial date
        date = new Date((dateValue - 25569) * 86400 * 1000);
        // Adjust for timezone offset to get correct UTC date
        date = new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
    } else {
        const parsedDate = new Date(dateValue);
        // Handle common non-standard formats like DD/MM/YYYY
        if (isNaN(parsedDate.getTime()) && typeof dateValue === 'string') {
            const parts = dateValue.split(/[/.-]/);
            if (parts.length === 3) {
                // Assuming DD/MM/YYYY
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) -1;
                const year = parseInt(parts[2], 10);
                if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                    date = new Date(Date.UTC(year, month, day));
                }
            }
        } else {
             date = parsedDate;
        }
    }

    if (!date || isNaN(date.getTime())) {
        return String(dateValue);
    }

    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
};

const playSound = (type: 'success' | 'error') => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!audioCtx) {
        console.warn("AudioContext not supported by this browser.");
        return;
    }

    if (type === 'success') {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'error') {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(164.81, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.2);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.2);
    }
};

// ============================================================================
// ICONS
// ============================================================================

const LogoIcon = (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
    </svg>
);

const SearchIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

const CheckCircleIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const XCircleIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const InfoIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
  </svg>
);

const DownloadIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const UploadIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
  </svg>
);

const SpinnerIcon = (props: any) => (
    <div className="h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" {...props}></div>
);

// ============================================================================
// COMPONENTS
// ============================================================================

const FileUploader = ({ onFileProcessed, setLoading, setError }: any) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFile = (file: File) => {
        if (!file) return;

        if (!file.name.endsWith('.xlsx')) {
            setError('Por favor, seleccione un archivo de Excel válido (.xlsx).');
            return;
        }

        setLoading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const arrayBuffer = e.target!.result as ArrayBuffer;
                onFileProcessed(arrayBuffer);
            } catch (err) {
                console.error("Error reading file:", err);
                setError('Hubo un problema al leer el archivo.');
                setLoading(false);
            }
        };
        reader.onerror = () => {
            console.error("FileReader error");
            setError('No se pudo leer el archivo.');
            setLoading(false);
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    };

    const dragClasses = isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50';

    return (
        <div 
            className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${dragClasses}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                aria-label="File uploader"
            />
            <UploadIcon className="h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-800">Cargar Base de Datos</h3>
            <p className="text-slate-500 mt-1">Arrastre y suelte su archivo <span className="font-semibold text-slate-600">.xlsx</span> aquí, o haga clic para seleccionarlo.</p>
        </div>
    );
};


const SearchBar = ({ onSearch, onClear, query, setQuery }: any) => {

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query) onSearch(query);
  };
  
  const handleClearClick = () => {
      onClear();
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
      <h2 className="text-xl font-semibold text-slate-800 mb-1">Buscar Constancia</h2>
      <p className="text-slate-600 mb-4">Ingrese el folio de la constancia para verificar su validez.</p>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Ej: TNM-054-00-2025-123"
              className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
              aria-label="Folio de la constancia"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
            disabled={!query}
          >
            Verificar
          </button>
           <button
            type="button"
            onClick={handleClearClick}
            className="px-6 py-3 text-sm font-semibold text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            disabled={!query}
          >
            Borrar
          </button>
        </div>
      </form>
    </div>
  );
};


const ResultItem = ({ label, value }: any) => (
  <div>
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-md font-semibold text-slate-800">{value || 'N/A'}</p>
  </div>
);

const ValidationResult = ({ status, result }: any) => {
    
  const handleDownloadPdf = () => {
    if (!result) return;

    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    
    // New Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TECNOLÓGICO NACIONAL DE MÉXICO', 105, 15, { align: 'center' });
    doc.text('INSTITUTO TECNOLÓGICO DE DURANGO', 105, 22, { align: 'center' });

    // Main Title
    doc.setFontSize(20);
    doc.text('Constancia de Validez', 105, 35, { align: 'center' });
    
    // Fields section
    doc.setFontSize(12);
    let yPos = 50; // Start fields lower down
    const fieldGap = 12;
    const labelX = 20;
    const valueX = 65;
    const wrapWidth = 125;

    const addField = (label: string, value: any) => {
        if (value === undefined || value === null) return;
        doc.setFont('helvetica', 'bold');
        doc.text(label, labelX, yPos);
        doc.setFont('helvetica', 'normal');
        const textLines = doc.splitTextToSize(String(value), wrapWidth);
        doc.text(textLines, valueX, yPos);
        yPos += (textLines.length * 5) + (fieldGap - 5);
    };

    const folio = getFlexibleProperty(result, ['Folio', 'ID', 'Clave', 'Constancia']);
    addField('Folio:', folio);
    addField('Nombre del Titular:', getFlexibleProperty(result, ['Nombre', 'Nombre del Titular']));
    addField('Curso/Taller:', getFlexibleProperty(result, ['Curso', 'Nombre del curso-taller', 'Curso/Taller']));
    addField('Fecha:', formatDate(getFlexibleProperty(result, ['Fecha', 'Fecha del curso-taller'])));
    addField('Departamento:', getFlexibleProperty(result, ['Departamento']));
    addField('Duración:', getFlexibleProperty(result, ['Duracion', 'Duración']));

    yPos += 5;
    doc.setLineWidth(0.2);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Este documento es una representación digital para la verificación de la constancia.`, 105, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`Generado el: ${new Date().toLocaleString('es-ES')}`, 105, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`Contacto para dudas o aclaraciones: coord_actualizaciondocente@itdurango.edu.mx`, 105, yPos, { align: 'center' });

    doc.save(`Validacion-${folio || 'INVALIDA'}.pdf`);
  };
    
  if (status === ValidationStatus.IDLE) {
    return <div className="mt-6"></div>;
  }
  
  if (status === ValidationStatus.SUCCESS && result) {
    const departamento = getFlexibleProperty(result, ['Departamento']);
    const duracion = getFlexibleProperty(result, ['Duracion', 'Duración']);
    return (
      <div className="mt-6 bg-green-50 border-l-4 border-green-500 text-green-800 p-6 rounded-r-lg shadow-md transition-all animate-fade-in" role="alert">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-500 mr-3" />
            <h3 className="text-2xl font-bold">Constancia Válida</h3>
          </div>
          <button
            onClick={handleDownloadPdf}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            aria-label="Descargar Validación"
          >
            <DownloadIcon className="h-5 w-5" />
            <span>Descargar Validación</span>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 border-t border-green-200 pt-4">
          <ResultItem label="Folio" value={<span className="font-mono bg-green-100 px-2 py-1 rounded">{getFlexibleProperty(result, ['Folio', 'ID', 'Clave', 'Constancia'])}</span>} />
          <ResultItem label="Nombre del Titular" value={getFlexibleProperty(result, ['Nombre', 'Nombre del Titular'])} />
          <ResultItem label="Nombre del curso-taller" value={getFlexibleProperty(result, ['Curso', 'Nombre del curso-taller', 'Curso/Taller'])} />
          <ResultItem label="Fecha del curso-taller" value={formatDate(getFlexibleProperty(result, ['Fecha', 'Fecha del curso-taller']))} />
          {departamento && <ResultItem label="Departamento" value={departamento} />}
          {duracion && <ResultItem label="Duración" value={duracion} />}
        </div>
      </div>
    );
  }

  if (status === ValidationStatus.NOT_FOUND) {
    return (
      <div className="mt-6 bg-red-50 border-l-4 border-red-500 text-red-800 p-6 rounded-r-lg shadow-md transition-all animate-fade-in" role="alert">
        <div className="flex items-center">
          <XCircleIcon className="h-8 w-8 text-red-500 mr-3" />
          <div>
            <h3 className="text-2xl font-bold">Constancia no Encontrada</h3>
            <p className="mt-1">El folio ingresado no fue encontrado en la base de datos. Por favor, verifique el folio e intente de nuevo.</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (status === ValidationStatus.ERROR) {
    return (
       <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-6 rounded-r-lg shadow-md transition-all animate-fade-in" role="alert">
        <div className="flex items-center">
          <InfoIcon className="h-8 w-8 text-yellow-500 mr-3" />
          <div>
            <h3 className="text-2xl font-bold">Error</h3>
            <p className="mt-1">Ocurrió un error inesperado durante la validación.</p>
          </div>
        </div>
      </div>
    );
  }

  return <div className="mt-6"></div>;
};

const DebugInfo = ({ debugData, autoExpandSkipped }: any) => {
  if (!debugData) return null;

  const isNewFormat = typeof debugData === 'object' && debugData !== null && !Array.isArray(debugData);
  const summaryMessage = isNewFormat ? debugData.summaryMessage : null;
  const dataToDisplay = isNewFormat ? debugData.sheets : [];
  const instruction = isNewFormat && debugData.skippedCount > 0 
    ? "La(s) hoja(s) omitida(s) no tenían una columna 'folio' reconocible, estaban vacías o no se pudieron leer. Por favor, revise los detalles a continuación."
    : "Si algunas hojas no se cargan, copie y pegue todo el contenido de este cuadro para ayudar a resolver el problema.";
  const rawSheetNames = debugData.rawSheetNames || [];

  return (
    <div className="mt-8 p-4 bg-slate-800 text-white rounded-lg shadow-inner animate-fade-in">
      <h3 className="text-lg font-bold mb-2 text-yellow-300">Información de Depuración</h3>
      {summaryMessage && <p className="text-sm text-slate-300 mb-2">{summaryMessage}</p>}
      <p className="text-xs text-slate-400 mb-4">{instruction}</p>

      <div className="mb-4 p-3 rounded bg-slate-900/50">
        <h4 className="text-sm font-semibold text-slate-300">Análisis del Archivo</h4>
        <p className="text-xs text-slate-400 mt-1">
          Se detectaron las siguientes hojas en el archivo fuente:
        </p>
        <pre className="mt-2 text-xs bg-black/50 p-2 rounded overflow-x-auto">
          <code>{rawSheetNames.length > 0 ? rawSheetNames.join(', ') : 'Ninguna hoja detectada.'}</code>
        </pre>
      </div>

      <div className="space-y-4">
        {dataToDisplay.map((sheet: any, index: number) => (
          <div key={index} className={`p-3 rounded ${sheet.status === 'processed' ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
            <div className="flex justify-between items-center">
              <span className="font-mono text-sm font-semibold">{sheet.sheetName}</span>
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${sheet.status === 'processed' ? 'bg-green-500 text-green-950' : 'bg-red-500 text-red-950'}`}>
                {sheet.status === 'processed' ? 'PROCESADA' : 'OMITIDA'}
              </span>
            </div>
            {sheet.reason && <p className="text-xs text-red-300 mt-1">{sheet.reason}</p>}
            {sheet.foundColumns && sheet.foundColumns.length > 0 && <p className="text-xs text-slate-400 mt-1">Cabeceras encontradas: <span className="font-mono text-slate-300">{sheet.foundColumns.join(', ')}</span></p>}
            <p className="text-xs text-slate-400 mt-1">{sheet.rowCount} fila(s) detectada(s).</p>
            {sheet.dataPreview && sheet.dataPreview.length > 0 && (
              <details className="mt-2" open={autoExpandSkipped && sheet.status === 'skipped'}>
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-white">Vista previa de datos</summary>
                <pre className="mt-1 text-xs bg-black/50 p-2 rounded overflow-x-auto">
                  <code>{JSON.stringify(sheet.dataPreview, null, 2)}</code>
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const AiHelpDisplay = ({ suggestion, onClear }: any) => {
    // Basic markdown-to-html: bold, lists
    const formattedSuggestion = suggestion
        .split('\n')
        .map((line: string) => {
            line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-300">$1</strong>'); // Bold
            if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                return `<li class="ml-5 list-disc">${line.substring(2)}</li>`;
            }
            return `<p class="mb-2">${line}</p>`;
        })
        .join('');

    return (
        <div className="mt-6 p-6 bg-slate-800 border border-cyan-500/30 rounded-lg animate-fade-in shadow-2xl">
            <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-bold text-cyan-300">Asistente de IA para Excel</h3>
                 <button onClick={onClear} className="text-slate-400 hover:text-white">&times;</button>
            </div>
            <div className="prose prose-invert prose-sm text-slate-300 max-w-none" dangerouslySetInnerHTML={{ __html: formattedSuggestion }}></div>
        </div>
    );
};

const FOLIO_KEYS = ['folio', 'id', 'clave', 'constancia', 'no. de folio', 'no de folio', 'no. folio', 'certificado'];

const App = () => {
    const [data, setData] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<React.ReactNode | null>(null);
    const [validationStatus, setValidationStatus] = useState(ValidationStatus.IDLE);
    const [validationResult, setValidationResult] = useState<any | null>(null);
    const [query, setQuery] = useState('');
    const [debugInfo, setDebugInfo] = useState<any | null>(null);

    const [isFixingWithAi, setIsFixingWithAi] = useState(false);
    const [aiFixSuggestion, setAiFixSuggestion] = useState('');
    const [aiFixError, setAiFixError] = useState<string | null>(null);
    
    const handleGetAiFix = useCallback(async () => {
        if (!debugInfo) return;
        setIsFixingWithAi(true);
        setAiFixSuggestion('');
        setAiFixError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const problemDetails = debugInfo.sheets
                .filter((sheet: any) => sheet.status === 'skipped')
                .map((sheet: any) => `\n- Hoja: "${sheet.sheetName}"\n- Razón por la que fue omitida: ${sheet.reason}\n- Cabeceras que encontré: ${sheet.foundColumns ? `[${sheet.foundColumns.join(', ')}]` : 'Ninguna'}\n- Número de filas con datos: ${sheet.rowCount}`)
                .join('');

            const prompt = `
Eres un asistente experto en análisis de datos, especializado en Microsoft Excel. Tu tono es amigable, claro y muy paciente.
Un usuario está intentando cargar un archivo Excel en una aplicación, pero algunas hojas no se procesan correctamente.
La aplicación requiere que cada hoja de cálculo contenga una columna con un encabezado de "Folio" (o variantes como "ID", "Clave", "Constancia").

Este es un resumen del problema detectado en su archivo:
${problemDetails}

Tu tarea es generar instrucciones paso a paso, muy sencillas y en español, para que el usuario pueda corregir su archivo Excel y cargarlo exitosamente.
Debes explicar por qué cada hoja fue omitida y cómo arreglarla. Por ejemplo, si una cabecera es "FOLIO DE AGOSTO", explícale que debe cambiarla a simplemente "Folio". Si una hoja está vacía, indícale que debe agregar datos o eliminarla.
Usa markdown para formatear tu respuesta (ej. **texto en negrita** para enfatizar y listas con * o -).
Termina con una nota de ánimo.
`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            
            setAiFixSuggestion(response.text);

        } catch (err) {
            console.error("Error with AI fix suggestion:", err);
            setAiFixError('Hubo un problema al contactar al asistente de IA. Asegúrate de que tu API Key esté configurada y revisa la consola para más detalles.');
        } finally {
            setIsFixingWithAi(false);
        }
    }, [debugInfo]);

    const processData = useCallback((sheetsData: any, source: string, rawSheetNames: string[]) => {
        let allRecords: any[] = [];
        let processedCount = 0;
        let skippedCount = 0;
        const debugSheets: any[] = [];
        const allDetectedSheetNames = rawSheetNames || Object.keys(sheetsData);
        setAiFixSuggestion('');
        setAiFixError(null);

        const findHeaderRow = (sheetData: any[][]) => {
            for (let i = 0; i < Math.min(sheetData.length, 10); i++) { // Check first 10 rows
                const row = sheetData[i];
                if (row && Array.isArray(row)) {
                    for (const cell of row) {
                        if (cell && typeof cell === 'string') {
                            const trimmedCell = cell.trim().toLowerCase();
                            if (FOLIO_KEYS.includes(trimmedCell)) {
                                return { headerRow: row.map(h => h ? String(h).trim() : ''), rowIndex: i };
                            }
                        }
                    }
                }
            }
            return null;
        };

        allDetectedSheetNames.forEach(sheetName => {
            const sheetData = sheetsData[sheetName]; // Now an array of arrays

            if (!sheetData || !Array.isArray(sheetData) || sheetData.length === 0) {
                skippedCount++;
                debugSheets.push({
                    sheetName,
                    status: 'skipped',
                    reason: 'La hoja está vacía o no se pudo leer su contenido.',
                    rowCount: 0,
                    dataPreview: []
                });
                return;
            }
            
            const headerInfo = findHeaderRow(sheetData);

            if (!headerInfo) {
                skippedCount++;
                debugSheets.push({
                    sheetName,
                    status: 'skipped',
                    reason: "No se encontró una fila de encabezado con una columna 'folio' reconocible en las primeras 10 filas.",
                    rowCount: sheetData.length,
                    dataPreview: sheetData.slice(0, 5), // show first 5 rows as arrays
                    foundColumns: []
                });
                return;
            }

            const { headerRow, rowIndex } = headerInfo;
            const dataRows = sheetData.slice(rowIndex + 1);

            const records = dataRows
                .map(row => {
                    const record: { [key: string]: any } = {};
                    headerRow.forEach((header, index) => {
                        if (header) { // Only map columns with headers
                            record[header] = row[index];
                        }
                    });
                    return record;
                })
                .filter(record => {
                    // Filter out empty rows that might have been parsed
                    const folioValue = getFlexibleProperty(record, FOLIO_KEYS);
                    return folioValue !== undefined && folioValue !== null && String(folioValue).trim() !== '';
                });

            if (records.length > 0) {
                processedCount++;
                allRecords = allRecords.concat(records);
                debugSheets.push({
                    sheetName,
                    status: 'processed',
                    rowCount: records.length,
                    dataPreview: records.slice(0, 3),
                    foundColumns: headerRow.filter(h => h)
                });
            } else {
                 skippedCount++;
                 debugSheets.push({
                    sheetName,
                    status: 'skipped',
                    reason: 'Se encontró un encabezado, pero no se encontraron filas de datos con un folio válido debajo de él.',
                    rowCount: sheetData.length,
                    dataPreview: sheetData.slice(0, 5),
                    foundColumns: headerRow.filter(h => h)
                });
            }
        });

        if (allRecords.length > 0) {
            setData(allRecords);
            setError(null);
        } else {
            setError('No se encontraron datos válidos en el archivo. Revise la información de depuración.');
        }

        const totalSheets = allDetectedSheetNames.length;
        const summaryMessage = `Se procesaron datos de ${processedCount} de ${totalSheets} hoja(s) detectada(s) desde ${source}.`;
        
        setDebugInfo({
            summaryMessage,
            processedCount,
            skippedCount,
            sheets: debugSheets,
            rawSheetNames: allDetectedSheetNames,
        });

        if (skippedCount > 0 && processedCount > 0) {
             setError(<span>Advertencia: Se omitieron <strong>{skippedCount} de {totalSheets} hoja(s)</strong>. <strong>Revise el panel de depuración de abajo</strong> para ver la causa de cada hoja omitida.</span>);
        } else if (skippedCount > 0 && processedCount === 0) {
             setError(<span><strong>Error Crítico:</strong> No se pudo procesar ninguna de las {totalSheets} hojas. Verifique que sus hojas tengan una columna con un encabezado como 'Folio' o 'ID'. <strong>Consulte el panel de depuración para más detalles.</strong></span>)
        }

    }, []);


    const handleFileProcessed = useCallback((arrayBuffer: ArrayBuffer) => {
        try {
            const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
            const sheetsData: { [key: string]: any[][] } = {};
            const rawSheetNames = workbook.SheetNames || [];
            
            rawSheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: null, header: 1 });
                sheetsData[sheetName] = json;
            });

            processData(sheetsData, "el archivo Excel", rawSheetNames);
        } catch (err) {
            console.error("Error processing Excel file:", err);
            setError('Hubo un error al procesar el archivo Excel.');
        } finally {
            setLoading(false);
        }
    }, [processData]);
    
    const handleSearch = (searchQuery: string) => {
        if (!data) {
            setValidationStatus(ValidationStatus.ERROR);
            return;
        }
        
        const trimmedQuery = searchQuery.trim().toLowerCase();
        
        const result = data.find(item => {
           const folio = getFlexibleProperty(item, FOLIO_KEYS);
           return folio && String(folio).trim().toLowerCase() === trimmedQuery;
        });

        if (result) {
            setValidationResult(result);
            setValidationStatus(ValidationStatus.SUCCESS);
            playSound('success');
        } else {
            setValidationResult(null);
            setValidationStatus(ValidationStatus.NOT_FOUND);
            playSound('error');
        }
    };
    
    const handleClear = () => {
        setQuery('');
        setValidationStatus(ValidationStatus.IDLE);
        setValidationResult(null);
    };

    return (
        <div className="bg-slate-100 min-h-screen font-sans">
            <header className="bg-white shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center space-x-3">
                        <LogoIcon className="h-8 w-8 text-blue-600"/>
                        <h1 className="text-2xl font-bold text-slate-800">Validador de Constancias</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-lg border border-slate-200">
                        <SpinnerIcon />
                        <p className="mt-4 text-slate-600 font-semibold">Procesando archivo...</p>
                        <p className="mt-1 text-slate-500 text-sm">Esto puede tardar unos segundos.</p>
                    </div>
                ) : !data ? (
                     <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                        <FileUploader onFileProcessed={handleFileProcessed} setLoading={setLoading} setError={setError} />
                    </div>
                ) : (
                    <>
                        <SearchBar onSearch={handleSearch} onClear={handleClear} query={query} setQuery={setQuery} />
                        <ValidationResult status={validationStatus} result={validationResult} />
                    </>
                )}

                {error && (
                    <div className="mt-6 bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg shadow-md animate-fade-in" role="alert">
                         <div className="flex items-center">
                            <XCircleIcon className="h-6 w-6 text-red-500 mr-3" />
                            <div>
                                <h3 className="text-lg font-semibold">Hubo un Problema</h3>
                                <p className="mt-1 text-sm">{error}</p>
                            </div>
                         </div>
                    </div>
                )}
                
                {aiFixSuggestion && <AiHelpDisplay suggestion={aiFixSuggestion} onClear={() => setAiFixSuggestion('')}/>}
                
                {aiFixError && (
                    <div className="mt-6 bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg shadow-md animate-fade-in">
                        <p>{aiFixError}</p>
                    </div>
                )}
                
                {debugInfo && (
                    <div className="mt-6">
                        <DebugInfo debugData={debugInfo} autoExpandSkipped={debugInfo.skippedCount > 0} />
                         {debugInfo.skippedCount > 0 && !aiFixSuggestion && (
                            <div className="mt-4 text-center">
                                <button
                                    onClick={handleGetAiFix}
                                    disabled={isFixingWithAi}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors disabled:bg-slate-400"
                                >
                                    {isFixingWithAi ? <SpinnerIcon className="h-5 w-5 border-2" /> : '💡'}
                                    {isFixingWithAi ? 'Analizando...' : '¿Necesitas ayuda para arreglarlo? Pregúntale a la IA'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

            </main>
        </div>
    );
};

export default App;
