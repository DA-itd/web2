
import React from 'react';
import { LOGO_URL } from '../constants';

const Header: React.FC = () => (
  <header className="bg-white shadow-sm w-full">
    <div className="container mx-auto px-6 py-4 flex items-center">
      <img src={LOGO_URL} alt="Logo ITD" className="h-10 mr-4" />
      <h1 className="text-lg sm:text-xl font-bold text-gray-800">Validador de Constancias y Reconocimientos del ITD</h1>
    </div>
  </header>
);

export default Header;
