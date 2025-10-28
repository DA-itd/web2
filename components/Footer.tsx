import React from 'react';

const Footer = () => (
  <footer className="w-full mt-auto py-6 text-center text-xs text-gray-500 px-4">
    <p>© {new Date().getFullYear()} Validador de Constancias. Todos los derechos reservados.</p>
    <p>Desarrollo académico, coordinación de actualización docente del ITD.</p>
    <p className="mt-2 text-gray-400">Ver 2.1</p>
  </footer>
);

export default Footer;