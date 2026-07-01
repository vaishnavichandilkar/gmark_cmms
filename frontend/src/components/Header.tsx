// Cleaned up unused imports

interface HeaderProps {
  facilityName: string;
}

export function Header({ facilityName }: HeaderProps) {
  return (
    <header className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-white mb-1 leading-tight">
          {facilityName}
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 font-medium">Facility Overview Dashboard</p>
      </div>
    </header>
  );
}
