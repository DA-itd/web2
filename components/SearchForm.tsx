
import React from 'react';
import SearchIcon from './icons/SearchIcon';

interface SearchFormProps {
  query: string;
  setQuery: (query: string) => void;
  onSearch: (query: string) => void;
  onClear: () => void;
}

const SearchForm: React.FC<SearchFormProps> = ({ query, setQuery, onSearch, onClear }) => {
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md w-full max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Buscar Constancia</h2>
      <p className="text-gray-600 mb-6">Ingrese el folio de la constancia para verificar su validez.</p>
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-grow w-full">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: TNM-054-00-2025-123"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex space-x-2 w-full sm:w-auto">
          <button type="submit" className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Verificar
          </button>
          <button type="button" onClick={onClear} className="flex-1 sm:flex-none px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300 transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
            Borrar
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchForm;
