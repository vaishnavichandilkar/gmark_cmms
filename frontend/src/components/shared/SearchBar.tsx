import { Search } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

export function SearchBar(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative w-full lg:max-w-[400px]">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-full text-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00a651]/20 focus:border-[#00a651] transition-all shadow-sm"
        placeholder="Search by Building, System, or Device..."
        {...props}
      />
    </div>
  );
}
