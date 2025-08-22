import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import CreateFolderModal from './CreateFolderModal';
import { FolderIcon, FolderPlusIcon, MoreVerticalIcon, LockIcon } from '../icons/Icons';
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
  depth?: number;
  is_system_folder: boolean;
  created_at: string;
  updated_at: string;
  children?: KnowledgeFolder[];
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
  const [subfolders, setSubfolders] = useState<KnowledgeFolder[]>([]);
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
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [activeFileMenu, setActiveFileMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState<boolean>(false);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

  // Fetch folders on component mount
  useEffect(() => {
    if (user && token) {
      fetchFolders();
    }
  }, [user, token]);

  // Build folder tree structure
  const buildFolderTree = (folders: KnowledgeFolder[]): KnowledgeFolder[] => {
    // Create a map for quick lookup
    const folderMap = new Map<string, KnowledgeFolder>();
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    const rootFolders: KnowledgeFolder[] = [];
    const result: KnowledgeFolder[] = [];

    // First, identify root folders and build parent-child relationships
    folders.forEach(folder => {
      if (!folder.parent_folder_id) {
        rootFolders.push(folderMap.get(folder.id)!);
      } else {
        const parent = folderMap.get(folder.parent_folder_id);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(folderMap.get(folder.id)!);
        }
      }
    });

    // Sort root folders (system folders first)
    rootFolders.sort((a, b) => {
      if (a.is_system_folder !== b.is_system_folder) {
        return a.is_system_folder ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    // Flatten the tree into display order
    const flattenTree = (folders: KnowledgeFolder[]) => {
      folders.forEach(folder => {
        result.push(folder);
        if (folder.children && folder.children.length > 0) {
          // Sort children
          folder.children.sort((a, b) => a.name.localeCompare(b.name));
          flattenTree(folder.children);
        }
      });
    };

    flattenTree(rootFolders);
    return result;
  };

  // Fetch folder contents when folder is selected
  useEffect(() => {
    if (selectedFolder && user && token) {
      fetchFolderContents(selectedFolder);
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
          const systemFolders = data.folders.filter((f: KnowledgeFolder) => f.is_system_folder);
          if (systemFolders.length > 0) {
            // Sort system folders to get personal folder first
            systemFolders.sort((a: KnowledgeFolder, b: KnowledgeFolder) => {
              if (a.access_level === 'personal') return -1;
              if (b.access_level === 'personal') return 1;
              return a.name.localeCompare(b.name);
            });
            setSelectedFolder(systemFolders[0].id);
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

  const fetchFolderContents = async (folderId: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/knowledge/folders/${folderId}/children?include_files=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const children = data.children || [];
        
        // Separate folders and files
        const subfolders = children.filter((item: any) => item.type === 'folder');
        const files = children.filter((item: any) => item.type === 'file');
        
        setFiles(files);
        // Store subfolders separately (we'll need this for rendering)
        setSubfolders(subfolders);
      } else {
        setError('Failed to fetch folder contents');
      }
    } catch (error) {
      console.error('Error fetching folder contents:', error);
      setError('Error fetching folder contents');
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
        // Refresh folder contents
        fetchFolderContents(selectedFolder);
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
        fetchFolderContents(selectedFolder);
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
        // Refresh folders list and select the new folder
        await fetchFolders();
        setSelectedFolder(data.folder.id);
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
          fetchFolderContents(selectedFolder);
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
          fetchFolderContents(selectedFolder);
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
        fetchFolderContents(selectedFolder);
      }
    } catch (error) {
      console.error('Error deleting files:', error);
      setError('파일 삭제 중 오류가 발생했습니다.');
    }
  };

  const moveSelectedFiles = async () => {
    console.log("here",  user, token, selectAllFiles, targetFolderId);
    if (!user || !token || selectedFiles.size === 0 || !targetFolderId) return;
    
    const fileIdsArray = Array.from(selectedFiles);
    console.log('Moving files:', { fileIds: fileIdsArray, targetFolderId, selectedFiles });
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      console.log('apiUrl:', apiUrl);
      const response = await fetch(`${apiUrl}/knowledge/files/move`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileIds: fileIdsArray,
          targetFolderId: targetFolderId
        }),
      });
      
      console.log('Move response:', response);

      if (response.ok) {
        const data = await response.json();
        console.log(data);
        setSelectedFiles(new Set());
        setIsMoveModalOpen(false);
        setTargetFolderId(null);
        
        // Refresh current folder
        if (selectedFolder) {
          fetchFolderContents(selectedFolder);
        }
      } else if (response.status === 401) {
        // Token expired, try to refresh
        console.log('Token expired, attempting refresh...');
        // For now, redirect to login
        window.location.href = '/login';
      } else {
        const errorData = await response.json();
        setError(errorData.error || '파일 이동에 실패했습니다');
        console.error('Error moving files:', errorData);
      }
    } catch (error) {
      console.error('Error moving files:', error);
      setError('파일 이동 중 오류가 발생했습니다');
    }
  };

  const openMoveModal = () => {
    if (selectedFiles.size === 0) return;
    setIsMoveModalOpen(true);
  };

  const closeMoveModal = () => {
    setIsMoveModalOpen(false);
    setTargetFolderId(null);
  };

  // Clear file selection when folder changes
  useEffect(() => {
    setSelectedFiles(new Set());
  }, [selectedFolder]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (folderMenuOpenId) {
        const target = event.target as Element;
        if (!target.closest('.folder-menu') && !target.closest('.folder-menu-btn')) {
          setFolderMenuOpenId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [folderMenuOpenId]);

  const startEditingFolderName = (folder: KnowledgeFolder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
    setFolderMenuOpenId(null); // Close menu
  };

  const cancelEditingFolderName = () => {
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  const saveFolderName = async (folderId: string) => {
    if (!user || !token || !editingFolderName.trim()) {
      cancelEditingFolderName();
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/knowledge/folders/${folderId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingFolderName.trim()
        }),
      });

      if (response.ok) {
        // Refresh folders list
        fetchFolders();
        cancelEditingFolderName();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to rename folder');
      }
    } catch (error) {
      console.error('Error renaming folder:', error);
      setError('Error renaming folder');
    }
  };

  const handleFolderNameKeyDown = (e: React.KeyboardEvent, folderId: string) => {
    if (e.key === 'Enter') {
      saveFolderName(folderId);
    } else if (e.key === 'Escape') {
      cancelEditingFolderName();
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!user || !token) return;

    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const confirmed = window.confirm(`"${folder.name}" 폴더를 삭제하시겠습니까? 폴더 안의 모든 파일과 하위 폴더도 함께 삭제됩니다.`);
    if (!confirmed) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/knowledge/folders/${folderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // If the deleted folder was selected, select parent or first available folder
        if (selectedFolder === folderId) {
          const parentFolder = folders.find(f => f.id === folder.parent_folder_id);
          if (parentFolder) {
            setSelectedFolder(parentFolder.id);
          } else {
            const systemFolders = folders.filter(f => f.is_system_folder);
            if (systemFolders.length > 0) {
              setSelectedFolder(systemFolders[0].id);
            }
          }
        }
        
        // Refresh folders list
        fetchFolders();
        setFolderMenuOpenId(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete folder');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      setError('Error deleting folder');
    }
  };

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

  const toggleFileMenu = (fileId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (activeFileMenu === fileId) {
      setActiveFileMenu(null);
      setMenuPosition(null);
    } else {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX - 120 // Adjust for menu width
      });
      setActiveFileMenu(fileId);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (activeFileMenu) {
        setActiveFileMenu(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeFileMenu]);

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
  const orderedFolders = buildFolderTree(folders);

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
            {orderedFolders.map((folder) => (
              <div
                key={folder.id}
                className={`folder-item-container ${selectedFolder === folder.id ? 'active' : ''}`}
              >
                <div
                  className="folder-item"
                  onClick={(e) => {
                    // Only select folder if not clicking on menu or input
                    if (!e.currentTarget.querySelector('.folder-actions:hover, .folder-name-input')) {
                      if (editingFolderId !== folder.id) {
                        setSelectedFolder(folder.id);
                      }
                    }
                  }}
                  style={{ paddingLeft: `${16 + (folder.depth || 0) * 20}px` }}
                >
                  <FolderIcon className="folder-icon" />
                  <div className="folder-info">
                    {editingFolderId === folder.id ? (
                      <input
                        type="text"
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onKeyDown={(e) => handleFolderNameKeyDown(e, folder.id)}
                        onBlur={() => saveFolderName(folder.id)}
                        className="folder-name-input"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="folder-name-container">
                        <span className="folder-name">{folder.name}</span>
                        {folder.is_system_folder && (
                          <LockIcon className="system-folder-lock" width={12} height={12} />
                        )}
                      </div>
                    )}
                    {folder.depth === 0 && editingFolderId !== folder.id && (
                      <span className={`access-badge ${getAccessLevelBadge(folder.access_level).class}`}>
                        {getAccessLevelBadge(folder.access_level).text}
                      </span>
                    )}
                  </div>
                </div>
                
                {!folder.is_system_folder && (
                  <div className={`folder-actions ${folderMenuOpenId === folder.id ? 'menu-open' : ''}`}>
                    <button
                      className="folder-menu-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFolderMenuOpenId(folderMenuOpenId === folder.id ? null : folder.id);
                      }}
                      onMouseEnter={(e) => e.stopPropagation()}
                      onMouseLeave={(e) => e.stopPropagation()}
                    >
                      <MoreVerticalIcon />
                    </button>
                    
                    {folderMenuOpenId === folder.id && (
                      <div 
                        className="folder-menu" 
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={(e) => e.stopPropagation()}
                        onMouseLeave={(e) => e.stopPropagation()}
                      >
                        <button 
                          className="folder-menu-item"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startEditingFolderName(folder);
                          }}
                          onMouseEnter={(e) => e.stopPropagation()}
                        >
                          이름 변경
                        </button>
                        <button 
                          className="folder-menu-item delete"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteFolder(folder.id);
                          }}
                          onMouseEnter={(e) => e.stopPropagation()}
                        >
                          삭제
                        </button>
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
                        className="move-selected-btn"
                        onClick={openMoveModal}
                      >
                        이동
                      </button>
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

          {files.length === 0 && subfolders.length === 0 ? (
            <div className="empty-state">
              <p>이 폴더에는 아직 파일이 없습니다.</p>
              {selectedFolder && (
                <p>파일을 드래그하거나 업로드 버튼을 사용하여 시작해보세요.</p>
              )}
            </div>
          ) : (
            <div className={`files-${viewMode}`}>
              {/* Render subfolders first */}
              {subfolders.map((folder) => (
                <div key={`folder-${folder.id}`} className="file-item folder-item">
                  <div className="file-icon">
                    <FolderIcon />
                  </div>
                  <div className="file-details">
                    <h3 className="file-name">{folder.name}</h3>
                    <div className="file-meta">
                      <span>폴더</span>
                      <span>{formatDate(folder.created_at)}</span>
                      {folder.access_level && (
                        <span className={`access-badge ${getAccessLevelBadge(folder.access_level).class}`}>
                          {getAccessLevelBadge(folder.access_level).text}
                        </span>
                      )}
                    </div>
                    {folder.description && (
                      <div className="folder-description">
                        {folder.description}
                      </div>
                    )}
                  </div>
                  <div className="file-actions">
                    <div className="file-menu">
                      <button 
                        className="download-btn"
                        onClick={() => setSelectedFolder(folder.id)}
                        title="폴더 열기"
                      >
                        열기
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Render files */}
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
                        <button 
                          className="file-menu-trigger"
                          onClick={(e) => toggleFileMenu(file.id, e)}
                        >
                          <MoreVerticalIcon />
                        </button>
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

      {/* File menu portal */}
      {activeFileMenu && menuPosition && (
        <div 
          className="file-menu-content"
          style={{
            position: 'fixed',
            top: menuPosition.top,
            left: menuPosition.left,
            zIndex: 1000,
            opacity: 1,
            visibility: 'visible',
            transform: 'translateY(0)',
            pointerEvents: 'auto'
          }}
        >
          <button 
            className="file-menu-item"
            onClick={() => {
              const file = files.find(f => f.id === activeFileMenu);
              if (file) startEditingFileName(file);
              setActiveFileMenu(null);
              setMenuPosition(null);
            }}
          >
            이름 변경
          </button>
          <button 
            className="file-menu-item delete"
            onClick={() => {
              deleteFile(activeFileMenu);
              setActiveFileMenu(null);
              setMenuPosition(null);
            }}
          >
            삭제
          </button>
        </div>
      )}
      
      {/* Move Files Modal */}
      {isMoveModalOpen && (
        <div className="modal-overlay" onClick={closeMoveModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>파일 이동</h3>
              <button className="modal-close" onClick={closeMoveModal}>×</button>
            </div>
            <div className="modal-body">
              <p>{selectedFiles.size}개의 파일을 이동할 폴더를 선택하세요.</p>
              <div className="folder-tree-list">
                {buildFolderTree(folders).map((folder) => (
                  <div
                    key={folder.id}
                    className={`folder-tree-item ${targetFolderId === folder.id ? 'selected' : ''} ${folder.id === selectedFolder ? 'disabled' : ''}`}
                    style={{ paddingLeft: `${16 + (folder.depth || 0) * 20}px` }}
                    onClick={() => {
                      if (folder.id !== selectedFolder) {
                        setTargetFolderId(folder.id);
                      }
                    }}
                  >
                    <FolderIcon width={16} height={16} />
                    <span className="folder-name">{folder.name}</span>
                    {folder.is_system_folder && (
                      <LockIcon className="system-folder-lock" width={10} height={10} />
                    )}
                    {folder.id === selectedFolder && <span className="current-folder">(현재 폴더)</span>}
                    <span className={`access-badge ${getAccessLevelBadge(folder.access_level).class}`}>
                      {getAccessLevelBadge(folder.access_level).text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeMoveModal}>
                취소
              </button>
              <button 
                className="btn-primary" 
                onClick={moveSelectedFiles}
                disabled={!targetFolderId}
              >
                이동
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;