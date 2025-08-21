import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import CreateFolderModal from './CreateFolderModal';
import { FolderIcon, FolderPlusIcon, MoreVerticalIcon } from '../icons/Icons';
import './KnowledgeBase.css';

interface KnowledgeFolder {
  id: string;
  name: string;
  description?: string;
  parent_folder_id?: string;
  owner_id: string;
  access_level: 'personal' | 'department' | 'company';
  organization_id?: string;
  path: string;
  is_system_folder: boolean;
  created_at: string;
  updated_at: string;
}

interface KnowledgeFile {
  id: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  file_size: number;
  folder_id: string;
  owner_id: string;
  access_level: 'personal' | 'department' | 'company';
  organization_id?: string;
  storage_path: string;
  download_count: number;
  tags?: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface KnowledgeBaseProps {
  onBackToChat: () => void;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ onBackToChat }) => {
  const { user, token } = useAuth();
  const [folders, setFolders] = useState<KnowledgeFolder[]>([]);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState<boolean>(false);
  const [folderMenuOpenId, setFolderMenuOpenId] = useState<string | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileName, setEditingFileName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Fetch folders on component mount
  useEffect(() => {
    if (user && token) {
      fetchFolders();
    }
  }, [user, token]);

  // Fetch files when folder is selected
  useEffect(() => {
    if (selectedFolder && user && token) {
      fetchFiles(selectedFolder);
    }
  }, [selectedFolder, user, token]);

  const fetchFolders = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/knowledge/folders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
        
        // Auto-select first system folder if no folder is selected
        if (!selectedFolder && data.folders.length > 0) {
          const firstSystemFolder = data.folders.find((f: KnowledgeFolder) => f.is_system_folder);
          if (firstSystemFolder) {
            setSelectedFolder(firstSystemFolder.id);
          }
        }
      } else {
        setError('Failed to fetch folders');
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
      setError('Error fetching folders');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFiles = async (folderId: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/knowledge/folders/${folderId}/files`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      } else {
        setError('Failed to fetch files');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setError('Error fetching files');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !selectedFolder) return;

    setUploadingFiles(true);
    const formData = new FormData();
    
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('files', selectedFiles[i]);
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/knowledge/folders/${selectedFolder}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Files uploaded:', data);
        // Refresh files list
        fetchFiles(selectedFolder);
      } else {
        setError('Failed to upload files');
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Error uploading files');
    } finally {
      setUploadingFiles(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  const handleDownload = async (file: KnowledgeFile) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/knowledge/files/${file.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Open download URL in new tab
        window.open(data.downloadUrl, '_blank');
      } else {
        setError('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Error downloading file');
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (selectedFolder) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    
    if (!selectedFolder) return;
    
    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/knowledge/folders/${selectedFolder}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Files uploaded:', data);
        fetchFiles(selectedFolder);
      } else {
        setError('Failed to upload files');
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Error uploading files');
    } finally {
      setUploadingFiles(false);
    }
  };

  const createFolder = async (name: string, description?: string) => {
    if (!user || !token) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/knowledge/folders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          parentFolderId: selectedFolder
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Folder created:', data.folder);
        // Refresh folders list
        fetchFolders();
        setIsCreateFolderModalOpen(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  };

  const startEditingFileName = (file: KnowledgeFile) => {
    setEditingFileId(file.id);
    setEditingFileName(file.original_name);
  };

  const cancelEditingFileName = () => {
    setEditingFileId(null);
    setEditingFileName('');
  };

  const saveFileName = async (fileId: string) => {
    if (!user || !token || !editingFileName.trim()) {
      cancelEditingFileName();
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/knowledge/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_name: editingFileName.trim()
        }),
      });

      if (response.ok) {
        // Refresh files list
        if (selectedFolder) {
          fetchFiles(selectedFolder);
        }
        cancelEditingFileName();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to rename file');
      }
    } catch (error) {
      console.error('Error renaming file:', error);
      setError('Error renaming file');
    }
  };

  const handleFileNameKeyDown = (e: React.KeyboardEvent, fileId: string) => {
    if (e.key === 'Enter') {
      saveFileName(fileId);
    } else if (e.key === 'Escape') {
      cancelEditingFileName();
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!user || !token) return;

    const confirmed = window.confirm('이 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.');
    if (!confirmed) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/knowledge/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Refresh files list
        if (selectedFolder) {
          fetchFiles(selectedFolder);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Error deleting file');
    }
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const selectAllFiles = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  };

  const deleteSelectedFiles = async () => {
    if (!user || !token || selectedFiles.size === 0) return;

    const confirmed = window.confirm(`선택한 ${selectedFiles.size}개 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      
      // Delete files in parallel
      const deletePromises = Array.from(selectedFiles).map(fileId =>
        fetch(`${apiUrl}/knowledge/files/${fileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      );

      const results = await Promise.allSettled(deletePromises);
      
      let successCount = 0;
      let errorCount = 0;
      
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      });

      if (errorCount > 0) {
        setError(`${errorCount}개 파일 삭제 실패, ${successCount}개 파일 삭제 성공`);
      }

      // Clear selection and refresh files
      setSelectedFiles(new Set());
      if (selectedFolder) {
        fetchFiles(selectedFolder);
      }
    } catch (error) {
      console.error('Error deleting files:', error);
      setError('파일 삭제 중 오류가 발생했습니다.');
    }
  };

  // Clear file selection when folder changes
  useEffect(() => {
    setSelectedFiles(new Set());
  }, [selectedFolder]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getAccessLevelBadge = (level: string) => {
    const badges = {
      personal: { text: '개인', class: 'access-personal' },
      department: { text: '부서', class: 'access-department' },
      company: { text: '전사', class: 'access-company' }
    };
    return badges[level as keyof typeof badges] || { text: level, class: 'access-default' };
  };

  if (isLoading) {
    return (
      <div className="knowledge-base">
        <div className="knowledge-header">
          <button className="back-btn" onClick={onBackToChat}>
            ← 채팅으로 돌아가기
          </button>
          <h1>지식 베이스</h1>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="knowledge-base">
        <div className="knowledge-header">
          <button className="back-btn" onClick={onBackToChat}>
            ← 채팅으로 돌아가기
          </button>
          <h1>지식 베이스</h1>
        </div>
        <div className="error-state">
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()}>다시 시도</button>
        </div>
      </div>
    );
  }

  const currentFolder = folders.find(f => f.id === selectedFolder);

  return (
    <div className="knowledge-base">
      <div className="knowledge-header">
        <button className="back-btn" onClick={onBackToChat}>
          ← 채팅으로 돌아가기
        </button>
        <h1>지식 베이스</h1>
        
        <div className="header-actions">
          <div className="view-toggle">
            <button 
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
            >
              ⊞
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              ☰
            </button>
          </div>
          
          <button
            className="create-folder-btn"
            onClick={() => setIsCreateFolderModalOpen(true)}
            disabled={!selectedFolder}
          >
            <FolderPlusIcon />
            폴더 생성
          </button>
          
          <label className={`upload-btn ${!selectedFolder ? 'disabled' : ''}`}>
            {uploadingFiles ? '업로드 중...' : selectedFolder ? '파일 업로드' : '폴더를 선택하세요'}
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={uploadingFiles || !selectedFolder}
            />
          </label>
        </div>
      </div>

      <div className="knowledge-content">
        <div className="folders-sidebar">
          <h3>폴더</h3>
          <div className="folders-list">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className={`folder-item-container ${selectedFolder === folder.id ? 'active' : ''}`}
              >
                <button
                  className="folder-item"
                  onClick={() => setSelectedFolder(folder.id)}
                  style={{ paddingLeft: `${16 + (folder.depth || 0) * 20}px` }}
                >
                  <FolderIcon className="folder-icon" />
                  <div className="folder-info">
                    <span className="folder-name">{folder.name}</span>
                    {folder.depth === 0 && (
                      <span className={`access-badge ${getAccessLevelBadge(folder.access_level).class}`}>
                        {getAccessLevelBadge(folder.access_level).text}
                      </span>
                    )}
                  </div>
                </button>
                
                {!folder.is_system_folder && (
                  <div className="folder-actions">
                    <button
                      className="folder-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFolderMenuOpenId(folderMenuOpenId === folder.id ? null : folder.id);
                      }}
                    >
                      <MoreVerticalIcon />
                    </button>
                    
                    {folderMenuOpenId === folder.id && (
                      <div className="folder-menu">
                        <button className="folder-menu-item">이름 변경</button>
                        <button className="folder-menu-item delete">삭제</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div 
          className={`files-area ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {currentFolder && (
            <div className="folder-header">
              <h2>{currentFolder.name}</h2>
              {currentFolder.description && (
                <p className="folder-description">{currentFolder.description}</p>
              )}
              
              {files.length > 0 && (
                <div className="file-selection-tools">
                  <label className="select-all-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedFiles.size === files.length && files.length > 0}
                      onChange={selectAllFiles}
                    />
                    전체 선택 ({files.length}개)
                  </label>
                  
                  {selectedFiles.size > 0 && (
                    <div className="bulk-actions">
                      <span className="selected-count">{selectedFiles.size}개 선택됨</span>
                      <button
                        className="delete-selected-btn"
                        onClick={deleteSelectedFiles}
                      >
                        선택 삭제
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isDragging && selectedFolder && (
            <div className="drop-overlay">
              <div className="drop-message">
                <span className="drop-icon">📁</span>
                <p>파일을 여기에 드롭하세요</p>
              </div>
            </div>
          )}

          {files.length === 0 ? (
            <div className="empty-state">
              <p>이 폴더에는 아직 파일이 없습니다.</p>
              {selectedFolder && (
                <p>파일을 드래그하거나 업로드 버튼을 사용하여 시작해보세요.</p>
              )}
            </div>
          ) : (
            <div className={`files-${viewMode}`}>
              {files.map((file) => (
                <div key={file.id} className={`file-item ${selectedFiles.has(file.id) ? 'selected' : ''}`}>
                  <label className="file-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => toggleFileSelection(file.id)}
                    />
                  </label>
                  <div className="file-icon">📄</div>
                  <div className="file-details">
                    {editingFileId === file.id ? (
                      <input
                        type="text"
                        value={editingFileName}
                        onChange={(e) => setEditingFileName(e.target.value)}
                        onKeyDown={(e) => handleFileNameKeyDown(e, file.id)}
                        onBlur={() => saveFileName(file.id)}
                        className="file-name-input"
                        autoFocus
                      />
                    ) : (
                      <h4 className="file-name">{file.original_name}</h4>
                    )}
                    <div className="file-meta">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <span>{formatDate(file.created_at)}</span>
                      {file.download_count > 0 && (
                        <>
                          <span>•</span>
                          <span>{file.download_count}회 다운로드</span>
                        </>
                      )}
                    </div>
                    {file.tags && file.tags.length > 0 && (
                      <div className="file-tags">
                        {file.tags.map((tag, index) => (
                          <span key={index} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="file-actions">
                    <div className="file-menu">
                      <button 
                        className="download-btn"
                        onClick={() => handleDownload(file)}
                      >
                        다운로드
                      </button>
                      <div className="file-menu-dropdown">
                        <button className="file-menu-trigger">
                          <MoreVerticalIcon />
                        </button>
                        <div className="file-menu-content">
                          <button 
                            className="file-menu-item"
                            onClick={() => startEditingFileName(file)}
                          >
                            이름 변경
                          </button>
                          <button 
                            className="file-menu-item delete"
                            onClick={() => deleteFile(file.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onCreateFolder={createFolder}
        parentFolderName={currentFolder?.name}
      />
    </div>
  );
};

export default KnowledgeBase;