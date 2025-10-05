import { useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDropzone } from "react-dropzone";

interface FileUploadProps {
  onUpload: (files: FileList) => void;
}

export default function FileUpload({ onUpload }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const fileList = new DataTransfer();
        acceptedFiles.forEach(file => fileList.items.add(file));
        onUpload(fileList.files);
      }
    },
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`file-upload-area p-6 rounded-lg text-center cursor-pointer transition-colors ${
        isDragActive ? "border-primary bg-primary/5" : ""
      }`}
      data-testid="file-upload-area"
    >
      <input {...getInputProps()} />
      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
      <p className="text-foreground font-medium mb-1">Upload study materials</p>
      <p className="text-sm text-muted-foreground mb-3">
        Drag & drop or click to upload PDF, DOC, or TXT files (max 10MB)
      </p>
      <Button
        type="button"
        size="sm"
        className="pointer-events-none"
        data-testid="button-choose-files"
      >
        Choose Files
      </Button>
    </div>
  );
}
