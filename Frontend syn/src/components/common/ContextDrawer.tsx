import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ContextDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const ContextDrawer: React.FC<ContextDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div
        className="w-[460px] max-w-full bg-white border-l border-slate-200 h-full shadow-2xl flex flex-col justify-between transform transition-transform duration-200 ease-out translate-x-0"
        style={{ boxShadow: '-12px 0 40px rgba(0,0,0,0.15)' }}
      >
        {/* 3D Light Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
          <div>
            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wider font-bold">
              INSPECTION DRAWER
            </div>
            <h2 className="text-sm font-bold font-mono text-slate-900 mt-0.5">{title}</h2>
            {subtitle && <p className="text-[11px] text-slate-500 font-mono mt-0.5">{subtitle}</p>}
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-1.5 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="clay-button-secondary font-mono text-xs px-4 py-2 font-bold"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
};
