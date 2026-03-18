import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@umbeli-com/ui';

interface DragDropUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  isLoading?: boolean;
  uploadSuccess?: boolean;
  uploadProgress?: number; // 0-100
  uploadedBytes?: number;
  totalBytes?: number;
  isConverting?: boolean;
  conversionProgress?: number; // 0-100
  conversionMessage?: string;
}

// Helper to format bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const DragDropUpload: React.FC<DragDropUploadProps> = ({
  onFileSelect,
  accept = 'video/*,image/*',
  maxSizeMB = 2048, // 2GB default
  className = '',
  isLoading = false,
  uploadSuccess = false,
  uploadProgress = 0,
  uploadedBytes = 0,
  totalBytes = 0,
  isConverting = false,
  conversionProgress = 0,
  conversionMessage = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  const validateFile = (file: File): boolean => {
    setError(null);

    // Check file type - be very permissive for supported extensions
    const fileName = file.name.toLowerCase();
    const supportedExtensions = [
      '.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.mpeg', '.mpg', '.mts', '.ts', '.ogv',
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.svg'
    ];

    const hasSupportedExtension = supportedExtensions.some(ext => fileName.endsWith(ext));

    if (!hasSupportedExtension) {
      setError('Type de fichier non supporté. Formats acceptés: MP4, MOV, AVI, MKV, WMV, FLV, WebM, HEIC, HEIF, JPG, PNG, GIF, WebP');
      return false;
    }

    // Check size
    if (file.size > maxSizeMB * 1024 * 1024) {
      const displaySize = maxSizeMB >= 1024 ? `${(maxSizeMB / 1024).toFixed(0)}GB` : `${maxSizeMB}MB`;
      setError(`Le fichier dépasse la taille maximale de ${displaySize}`);
      return false;
    }

    return true;
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isLoading || isConverting) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isLoading || isConverting) return;

    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const isProcessing = isLoading || isConverting;

  return (
    <div
      className={`drag-drop-upload ${isDragOver ? 'is-drag-over' : ''} ${isProcessing ? 'is-loading' : ''} ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept={accept}
        className="drag-drop-upload__input"
        disabled={isProcessing}
      />

      <div className="drag-drop-upload__content">
        {isConverting ? (
          <div className="drag-drop-upload__loader drag-drop-upload__converting">
            <div className="drag-drop-upload__progress-container">
              <div className="drag-drop-upload__progress-bar drag-drop-upload__progress-bar--conversion">
                <div 
                  className="drag-drop-upload__progress-fill drag-drop-upload__progress-fill--conversion" 
                  style={{ width: `${conversionProgress}%` }}
                />
              </div>
              <p className="drag-drop-upload__progress-percentage">{conversionProgress}%</p>
            </div>
            <p className="drag-drop-upload__progress-text">{conversionMessage || 'Conversion en cours...'}</p>
          </div>
        ) : isLoading ? (
          <div className="drag-drop-upload__loader">
            <div className="drag-drop-upload__progress-container">
              <div className="drag-drop-upload__progress-bar">
                <div 
                  className="drag-drop-upload__progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="drag-drop-upload__progress-percentage">{uploadProgress}%</p>
              {totalBytes > 0 && (
                <p className="drag-drop-upload__progress-bytes">
                  {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}
                </p>
              )}
            </div>
            <p className="drag-drop-upload__progress-text">Téléchargement en cours...</p>
          </div>
        ) : uploadSuccess ? (
          <div className="drag-drop-upload__success">
            <div className="drag-drop-upload__success-icon">✓</div>
            <p className="drag-drop-upload__success-text">Fichier téléchargé avec succès !</p>
          </div>
        ) : (
          <>
            <div className="drag-drop-upload__icon-wrapper">
              <Upload size={48} />
            </div>
            
            <div className="drag-drop-upload__text-wrapper">
              <p className="drag-drop-upload__title">
                Glissez votre fichier ici
              </p>
              <p className="drag-drop-upload__divider">
                ou
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleButtonClick}
                type="button"
              >
                Parcourir les fichiers
              </Button>
            </div>

            <div className="drag-drop-upload__meta">
              Formats supportés: MP4, MOV, AVI, MKV, WMV, FLV, WebM, HEIC, HEIF, JPG, PNG, GIF, WebP (Max {maxSizeMB >= 1024 ? `${(maxSizeMB / 1024).toFixed(0)}GB` : `${maxSizeMB}MB`})
            </div>

            {error && (
              <div className="drag-drop-upload__error">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
