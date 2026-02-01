import type { ChangeEvent, DragEvent } from 'react';

interface Props {
  uploading: boolean;
  isDragging: boolean;
  images: string[];
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onRemoveImage: (index: number) => void;
}

export default function DailyNotesImageUpload({
  uploading,
  isDragging,
  images,
  onImageUpload,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveImage,
}: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        🖼️ Hình ảnh
      </label>
      <div className="space-y-3">
        <div
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
            isDragging
              ? 'border-[#fc5d01] bg-[#fedac2] scale-105'
              : 'border-gray-300 hover:border-[#fc5d01] hover:bg-gray-50'
          }`}
        >
          <label className="w-full cursor-pointer">
            <div className="text-center">
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-[#fc5d01] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600">Đang tải lên...</span>
                </div>
              ) : isDragging ? (
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-8 h-8 text-[#fc5d01]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm font-medium text-[#fc5d01]">Thả hình ảnh vào đây</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-[#fc5d01]">Click để chọn</span> hoặc kéo thả/dán (Ctrl+V) hình ảnh vào đây
                  </div>
                  <span className="text-xs text-gray-500">Tối đa 5MB/ảnh</span>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onImageUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {images.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}