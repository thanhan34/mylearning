'use client';

interface ValidationErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invalidLinks: string[];
  expectedFormat: string;
  homeworkType: string;
}

export default function ValidationErrorDialog({
  isOpen,
  onClose,
  invalidLinks,
  expectedFormat,
  homeworkType
}: ValidationErrorDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-medium text-[#fc5d01]">
            Định dạng không hợp lệ
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
          <p className="text-gray-600 mb-2">
            Các liên kết sau không đúng định dạng cho bài tập {homeworkType}:
          </p>
          <div className="bg-[#fedac2] rounded p-3 mb-4 max-h-40 overflow-y-auto">
            {invalidLinks.map((link, index) => (
              <div key={index} className="text-[#fc5d01] mb-2 last:mb-0 break-all">
                {link}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Định dạng yêu cầu:
          </h4>
          <code className="text-sm bg-white rounded px-2 py-1 border border-gray-200 block whitespace-pre-wrap break-all">
            {expectedFormat}
          </code>
          <p className="text-sm text-gray-600 mt-2">
            Lưu ý: Hệ thống chấp nhận cả "shared a answer" và "shared an answer". Đối với định dạng mobile, chỉ chấp nhận định dạng có xuống dòng giữa "shared a/an answer from PTE APEUni" và "APEUni AI Score".
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
