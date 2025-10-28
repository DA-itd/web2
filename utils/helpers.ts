export const getProperty = (obj: any, keyName: string): any => {
  if (!obj || typeof obj !== 'object' || !keyName) return undefined;
  const keyToFind = keyName.toLowerCase();
  const foundKey = Object.keys(obj).find(k => k.trim().toLowerCase() === keyToFind);
  return foundKey ? obj[foundKey] : undefined;
};

export const getFlexibleProperty = (obj: any, keys: string[]): any => {
  if (!obj || typeof obj !== 'object' || !Array.isArray(keys)) return undefined;
  for (const key of keys) {
    const value = getProperty(obj, key);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

export const formatDate = (dateValue: any): string => {
    if (dateValue === undefined || dateValue === null) return 'N/A';
    if (typeof dateValue === 'string') {
         if (!isNaN(dateValue as any) && !isNaN(parseFloat(dateValue))) {
             let date = new Date((parseFloat(dateValue) - 25569) * 86400 * 1000);
             date = new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
             if (isNaN(date.getTime())) return String(dateValue);
             return date.toLocaleDateString('es-ES',{ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
         }
         return dateValue.toUpperCase();
    }
    let date;
    if (typeof dateValue === 'number') {
        date = new Date((dateValue - 25569) * 86400 * 1000);
        date = new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
    } else {
        date = new Date(dateValue);
    }
    if (!date || isNaN(date.getTime())) return String(dateValue).toUpperCase();
    return date.toLocaleDateString('es-ES',{ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
};

export const playSound = (id: string) => {
    const sound = document.getElementById(id) as HTMLAudioElement;
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(error => console.error(`Error playing sound: ${id}`, error));
    }
};
