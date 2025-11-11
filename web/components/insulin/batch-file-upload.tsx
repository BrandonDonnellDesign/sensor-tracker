'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Trash2, 
  AlertCircle,
  FileText
} from 'lucide-react'

interface FileUploadStatus {
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  result?: {
    imported: number
    skipped: number
    errors: string[]
  }
  error?: string
}

interface BatchFileUploadProps {
  onUploadComplete?: (results: FileUploadStatus[]) => void
  maxFiles?: number
  acceptedTypes?: string[]
}

export function BatchFileUpload({ 
  onUploadComplete,
  maxFiles = 10,
  acceptedTypes = ['.csv', '.json', '.xlsx']
}: BatchFileUploadProps) {
  const [files, setFiles] = useState<FileUploadStatus[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [])

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      return acceptedTypes.includes(extension)
    })

    if (files.length + validFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    const fileStatuses: FileUploadStatus[] = validFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0
    }))

    setFiles(prev => [...prev, ...fileStatuses])
  }, [files.length, maxFiles, acceptedTypes])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files))
    }
  }, [addFiles])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const uploadFile = async (fileStatus: FileUploadStatus, index: number): Promise<void> => {
    const formData = new FormData()
    formData.append('file', fileStatus.file)

    try {
      // Update status to uploading
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'uploading', progress: 0 } : f
      ))

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map((f, i) => 
          i === index && f.progress < 90 
            ? { ...f, progress: f.progress + 10 } 
            : f
        ))
      }, 200)

      const response = await fetch('/api/insulin/import/batch', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()

      // Update to processing
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'processing', progress: 95 } : f
      ))

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update to success
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'success', 
          progress: 100,
          result: result.data
        } : f
      ))

    } catch (error) {
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error', 
          progress: 0,
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f
      ))
    }
  }

  const uploadAllFiles = async () => {
    setIsUploading(true)
    
    const pendingFiles = files
      .map((file, index) => ({ file, index }))
      .filter(({ file }) => file.status === 'pending')

    // Upload files in batches of 3 to avoid overwhelming the server
    const batchSize = 3
    for (let i = 0; i < pendingFiles.length; i += batchSize) {
      const batch = pendingFiles.slice(i, i + batchSize)
      await Promise.all(
        batch.map(({ file, index }) => uploadFile(file, index))
      )
    }

    setIsUploading(false)
    onUploadComplete?.(files)
  }

  const getStatusIcon = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />
      case 'uploading':
      case 'processing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusColor = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800'
      case 'uploading':
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'error':
        return 'bg-red-100 text-red-800'
    }
  }

  const totalFiles = files.length
  const completedFiles = files.filter(f => f.status === 'success' || f.status === 'error').length
  const successfulFiles = files.filter(f => f.status === 'success').length
  const failedFiles = files.filter(f => f.status === 'error').length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Batch File Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Supports: {acceptedTypes.join(', ')} • Max {maxFiles} files
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            disabled={isUploading}
          >
            <FileText className="h-4 w-4 mr-2" />
            Select Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Upload Progress Summary */}
        {totalFiles > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Upload Progress</span>
              <span>{completedFiles}/{totalFiles} files</span>
            </div>
            <Progress value={(completedFiles / totalFiles) * 100} />
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                {successfulFiles} successful
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-600" />
                {failedFiles} failed
              </span>
            </div>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((fileStatus, index) => (
              <div
                key={`${fileStatus.file.name}-${index}`}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(fileStatus.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">
                      {fileStatus.file.name}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className={getStatusColor(fileStatus.status)}
                    >
                      {fileStatus.status}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {(fileStatus.file.size / 1024).toFixed(1)} KB
                  </div>
                  
                  {(fileStatus.status === 'uploading' || fileStatus.status === 'processing') && (
                    <Progress value={fileStatus.progress} className="mt-2 h-1" />
                  )}
                  
                  {fileStatus.result && (
                    <div className="text-xs text-green-600 mt-1">
                      ✓ {fileStatus.result.imported} imported, {fileStatus.result.skipped} skipped
                    </div>
                  )}
                  
                  {fileStatus.error && (
                    <div className="text-xs text-red-600 mt-1">
                      ✗ {fileStatus.error}
                    </div>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={fileStatus.status === 'uploading' || fileStatus.status === 'processing'}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {files.length > 0 && (
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button
              onClick={uploadAllFiles}
              disabled={isUploading || files.every(f => f.status !== 'pending')}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload All Files
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setFiles([])}
              disabled={isUploading}
            >
              Clear All
            </Button>
          </div>
        )}

        {/* Results Summary */}
        {completedFiles > 0 && completedFiles === totalFiles && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Upload complete! {successfulFiles} files processed successfully
              {failedFiles > 0 && `, ${failedFiles} files failed`}.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}