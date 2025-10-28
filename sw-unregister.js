// Este service worker tiene un único propósito: encontrar y anular el registro de
// cualquier service worker antiguo que se comporte mal. Luego, se anula a sí mismo.
self.addEventListener('install', () => {
  // Forzar a este SW a activarse inmediatamente.
  self.skipWaiting();
});

self.addEventListener('activate', async () => {
  // Anular el registro de TODAS las instalaciones de service workers.
  await self.registration.unregister();

  // Indicar a todos los clientes (pestañas) abiertos que se actualicen para obtener la última versión.
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.navigate(client.url);
  });
});
