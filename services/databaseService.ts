
import { CertificateData } from '../types';
import { POTENTIAL_FOLIO_HEADERS, DATABASE_URL } from '../constants';

declare global {
  interface Window {
    XLSX: any;
  }
}

const processFile = (arrayBuffer: ArrayBuffer): CertificateData[] => {
  const data = new Uint8Array(arrayBuffer);
  const workbook = window.XLSX.read(data, { type: 'array' });
  let allData: CertificateData[] = [];

  workbook.SheetNames.forEach((sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet || !worksheet['!ref']) return;
    
    const dataAoA: any[][] = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
    if (dataAoA.length === 0) return;

    let headerRowIndex = -1;
    for (let i = 0; i < dataAoA.length; i++) {
      const row = dataAoA[i];
      if (Array.isArray(row) && row.some(cell => {
        const cellVal = String(cell || '').trim().toLowerCase();
        return POTENTIAL_FOLIO_HEADERS.includes(cellVal);
      })) {
        headerRowIndex = i;
        break;
      }
    }
    if (headerRowIndex === -1) return;

    const headers = dataAoA[headerRowIndex].map(h => (h ? String(h).trim() : ''));
    const dataRows = dataAoA.slice(headerRowIndex + 1);

    const sheetJson = dataRows
      .filter(row => Array.isArray(row) && row.some(cell => String(cell || '').trim() !== ''))
      .map(row => {
        const record: CertificateData = {};
        headers.forEach((header, i) => {
          if (header && i < row.length) record[header] = row[i];
        });
        return record;
      });

    allData = allData.concat(sheetJson);
  });

  return allData;
};

export const loadDatabase = async (): Promise<CertificateData[]> => {
  const response = await fetch(DATABASE_URL);
  if (!response.ok) {
    throw new Error('No se pudo cargar la base de datos.');
  }
  const arrayBuffer = await response.arrayBuffer();
  return processFile(arrayBuffer);
};
