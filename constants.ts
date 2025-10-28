// URLs apuntando al nuevo repositorio del usuario en GitHub.
// Es crucial que estos archivos existan en la rama 'main' del repositorio.
export const DATABASE_URL = 'https://raw.githubusercontent.com/DA-itd/DA-itd-web/main/database.xlsx';
export const ITD_LOGO_URL = 'https://raw.githubusercontent.com/DA-itd/DA-itd-web/main/image.jpg';
export const TECNM_LOGO_URL = 'https://raw.githubusercontent.com/DA-itd/DA-itd-web/main/TecNM_logo.jpg';

// Nombres de columna que podrían contener el folio en el archivo Excel.
// El sistema buscará una columna con alguno de estos nombres (ignorando mayúsculas/minúsculas y espacios).
export const POTENTIAL_FOLIO_HEADERS = [
    'Folio',
    'ID',
    'Folio del certificado',
    'Folio de la constancia',
    'No. de Folio',
    '# Folio',
    'folio'
];
