import React, { useState } from 'react';
import { CloseIcon } from '../icons/Icons';
import './CreateFolderModal.css';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (name: string, description?: string) => Promise<void>;
  parentFolderName?: string;
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  onCreateFolder,
  parentFolderName
}) => {
  const [folderName, setFolderName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!folderName.trim()) {
      setError('폴더 이름을 입력해주세요.');
      return;
    }

    // Validate folder name
    if (!/^[a-zA-Z0-9가-힣\s\-_()]+$/.test(folderName.trim())) {
      setError('폴더 이름에는 특수문자를 사용할 수 없습니다.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await onCreateFolder(folderName.trim(), description.trim() || undefined);
      handleClose();
    } catch (error) {
      console.error('Error creating folder:', error);
      setError('폴더 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setFolderName('');
    setDescription('');
    setError(null);
    setIsCreating(false);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="create-folder-modal-overlay" onClick={handleOverlayClick}>
      <div className="create-folder-modal">
        <div className="modal-header">
          <h2>새 폴더 만들기</h2>
          <button className="close-btn" onClick={handleClose} disabled={isCreating}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-content">
          {parentFolderName && (
            <div className="parent-folder-info">
              <span>위치: {parentFolderName}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="folder-name">폴더 이름 *</label>
            <input
              id="folder-name"
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="폴더 이름을 입력하세요"
              maxLength={100}
              disabled={isCreating}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="folder-description">설명 (선택사항)</label>
            <textarea
              id="folder-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="폴더에 대한 설명을 입력하세요"
              rows={3}
              maxLength={500}
              disabled={isCreating}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={handleClose}
              disabled={isCreating}
            >
              취소
            </button>
            <button
              type="submit"
              className="create-btn"
              disabled={isCreating || !folderName.trim()}
            >
              {isCreating ? '생성 중...' : '폴더 만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFolderModal;