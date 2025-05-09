'use client';

interface SimpleValidationErrorDialogProps {
  message: string;
  onClose: () => void;
}

export default function SimpleValidationErrorDialog({
  message,
  onClose
}: SimpleValidationErrorDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-[#fc5d01]">
            Lỗi
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-600">
            {message}
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#fc5d01] text-white px-4 py-2 rounded hover:bg-[#fd7f33] transition-colors"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
