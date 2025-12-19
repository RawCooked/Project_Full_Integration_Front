import React, { useRef } from 'react';

/**
 * ImageUploader Component - Mobile Optimized
 * Handles image upload with file validation
 * Accepts common image formats (PNG, JPG, GIF, WebP)
 */
function ImageUploader({ onUpload, disabled }) {
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image (PNG, JPG, GIF, or WebP)');
      return false;
    }

    if (file.size > maxSize) {
      alert('Image size must be less than 10MB');
      return false;
    }

    return true;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      onUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      className="image-uploader"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="upload-button"
      >
        📸 Choose
      </button>
      <p className="upload-hint">or drop image</p>
    </div>
  );
}

export default ImageUploader;

