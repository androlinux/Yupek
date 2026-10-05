"use client";
import { useState, useRef, ChangeEvent, DragEvent } from "react";
import Icon from "@/components/ui/Icon";

interface ImageUploaderProps {
  label?: string;
  currentImage?: string;
  onUploaded: (url: string) => void;
  helperText?: string;
  compact?: boolean;
  buttonText?: string;
}

export default function ImageUploader({
  label = "Upload Photo",
  currentImage,
  onUploaded,
  helperText = "Select from PC or choose from your phone's camera / photo library (JPG, PNG, WEBP)",
  compact = false,
  buttonText = "Upload Photo from PC / Phone",
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Validate image type
    if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|gif|svg|avif|heic|heif)$/i.test(file.name)) {
      setUploadError("Please select a valid image file (JPG, PNG, WebP, etc.)");
      return;
    }

    // Validate size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("Photo is too large (maximum 50MB).");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload photo");
      }

      setUploadSuccess(true);
      onUploaded(data.url);
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
          disabled={isUploading}
        />
        <button
          type="button"
          onClick={triggerUpload}
          disabled={isUploading}
          className="inline-flex items-center gap-1.5 bg-brown text-cream px-3 py-1.5 text-[10px] uppercase tracking-wider hover:bg-black transition-colors disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-cream border-t-transparent" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Icon name="upload" className="h-3.5 w-3.5" />
              <span>{buttonText}</span>
            </>
          )}
        </button>
        {uploadError && <span className="text-[10px] text-burgundy">{uploadError}</span>}
        {uploadSuccess && <span className="text-[10px] text-green-700 font-medium">✓ Uploaded</span>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold">
            {label}
          </label>
          <span className="text-[9px] uppercase tracking-wider text-brown/50">
            PC & Phone Upload
          </span>
        </div>
      )}

      {/* Hidden native input with accept="image/*" - on mobile opens camera / photo library */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
        disabled={isUploading}
      />

      {/* Dropzone & Click Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={triggerUpload}
        className={`relative cursor-pointer border-2 border-dashed p-4 sm:p-5 transition-all text-center rounded-sm ${
          dragOver
            ? "border-brown bg-sand/30 scale-[1.01]"
            : "border-brown/25 bg-white/60 hover:border-brown hover:bg-sand/15"
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          {isUploading ? (
            <div className="py-2 flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brown border-t-transparent" />
              <span className="text-xs uppercase tracking-wider text-brown font-medium">
                Uploading photo from device...
              </span>
              <span className="text-[10px] text-brown/60">Saving to atelier media library</span>
            </div>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sand/40 text-brown mb-1 group-hover:scale-110 transition-transform">
                <Icon name="upload" className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest font-semibold text-brown">
                  {buttonText}
                </p>
                <p className="text-[10px] text-brown/60 mt-0.5">{helperText}</p>
                <p className="text-[9px] text-burgundy/80 mt-1 uppercase tracking-wider font-medium">
                  Tap to use Camera or Camera Roll on Phone &bull; Drag & Drop on PC
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerUpload();
                }}
                className="mt-2 inline-flex items-center gap-2 bg-brown px-4 py-2 text-[10px] uppercase tracking-widest text-cream hover:bg-black transition-colors"
              >
                <Icon name="upload" className="h-3.5 w-3.5" />
                <span>Choose from Device</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Feedback Messages */}
      {uploadError && (
        <div className="rounded border border-burgundy/30 bg-burgundy/10 p-2 text-xs text-burgundy flex items-center gap-2">
          <Icon name="close" className="h-4 w-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {uploadSuccess && (
        <div className="rounded border border-green-600/30 bg-green-50 p-2 text-xs text-green-800 flex items-center gap-2">
          <Icon name="check" className="h-4 w-4 shrink-0 text-green-700" />
          <span>Photo uploaded and applied successfully!</span>
        </div>
      )}

      {/* Current Image Mini Preview */}
      {currentImage && (
        <div className="mt-2 flex items-center gap-3 border border-brown/15 bg-white/80 p-2 rounded">
          <div className="h-12 w-12 bg-sand/20 overflow-hidden relative border border-brown/10 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentImage} alt="Current Preview" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] uppercase tracking-widest text-brown/50 block">Current Photo:</span>
            <p className="text-[11px] font-mono text-brown truncate">{currentImage}</p>
          </div>
          <button
            type="button"
            onClick={triggerUpload}
            className="text-[9px] uppercase tracking-wider text-brown hover:text-burgundy hover:underline shrink-0 px-2 py-1 border border-brown/20 bg-sand/15"
          >
            Replace
          </button>
        </div>
      )}
    </div>
  );
}
