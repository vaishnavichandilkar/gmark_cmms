import { type ReactNode } from 'react';
import { FloatingNavbar } from '../components/FloatingNavbar';

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Floating Glass Navbar */}
      <FloatingNavbar />

      {/* Main Content Area with bottom padding to clear the bottom floating navbar */}
      <div className="flex-1 min-w-0 flex flex-col pb-32 sm:pb-36">
        <div className="flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
