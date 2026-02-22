import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full m-4 transform transition-all duration-300 scale-100"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-black text-slate-800 mb-4">{title}</h2>
        <p className="text-slate-600 mb-8 leading-relaxed">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-xl text-xs font-black uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-8 py-3 rounded-xl text-xs font-black uppercase text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
