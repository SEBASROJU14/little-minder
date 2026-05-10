"use client";

interface Props {
  onCamera: () => void;
  onGallery: () => void;
  onClose: () => void;
}

export default function PhotoPickerSheet({ onCamera, onGallery, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-carbon/20" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl px-4 pt-4 pb-8">
        <button onClick={onCamera} className="w-full py-4 text-left text-sm font-medium text-carbon border-b border-cream-dark active:bg-cream-dark transition-colors">
          Cámara 📷
        </button>
        <button onClick={onGallery} className="w-full py-4 text-left text-sm font-medium text-carbon active:bg-cream-dark transition-colors">
          Galería 🖼️
        </button>
      </div>
    </div>
  );
}
