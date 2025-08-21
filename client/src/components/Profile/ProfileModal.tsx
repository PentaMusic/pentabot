import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { CloseIcon, SettingsIcon } from '../icons/Icons';
import './ProfileModal.css';

interface Organization {
  id: string;
  name: string;
  description?: string;
}

interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  company_name?: string;
  position_title?: string;
  nickname?: string;
  organizations?: Organization[];
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    display_name: '',
    company_name: '',
    position_title: '',
    nickname: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to load profile first
      const profileResponse = await fetch(`${apiUrl}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      let profileData = null;
      let organizationsData = { organizations: [] };

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error('Profile API error:', errorText);
        throw new Error('프로필 데이터를 불러올 수 없습니다. DB 스키마를 확인해주세요.');
      }

      profileData = await profileResponse.json();

      // Try to load organizations (optional if table doesn't exist yet)
      try {
        const organizationsResponse = await fetch(`${apiUrl}/profile/organizations`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (organizationsResponse.ok) {
          organizationsData = await organizationsResponse.json();
        } else {
          console.warn('Organizations table not available yet');
        }
      } catch (orgError) {
        console.warn('Organizations feature not available:', orgError);
      }

      setUserProfile(profileData.user);
      setAvailableOrganizations(organizationsData.organizations);
      
      // Set form data
      setFormData({
        display_name: profileData.user.display_name || '',
        company_name: profileData.user.company_name || '',
        position_title: profileData.user.position_title || '',
        nickname: profileData.user.nickname || ''
      });

      // Set selected organizations
      const userOrgIds = profileData.user.organizations?.map((org: Organization) => org.id) || [];
      setSelectedOrganizations(userOrgIds);

    } catch (error) {
      console.error('Error loading profile data:', error);
      setError('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, token]);

  // Load user profile and available organizations
  useEffect(() => {
    if (isOpen && token) {
      loadData();
    }
  }, [isOpen, token]); // loadData 의존성 제거

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOrganizationChange = (orgId: string, checked: boolean) => {
    setSelectedOrganizations(prev => {
      if (checked) {
        return [...prev, orgId];
      } else {
        return prev.filter(id => id !== orgId);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          organization_ids: selectedOrganizations
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedProfile = await response.json();
      setUserProfile(updatedProfile.user);
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <div className="profile-modal-title">
            <SettingsIcon />
            <h2>개인정보 설정</h2>
          </div>
          <button
            className="profile-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="profile-modal-content">
          {isLoading ? (
            <div className="profile-loading">
              <div className="loading-spinner" />
              <span>Loading profile...</span>
            </div>
          ) : error ? (
            <div className="profile-error">
              <p>{error}</p>
              <button onClick={loadData} className="retry-button">
                Retry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-section">
                <h3>기본 정보</h3>
                
                <div className="form-group">
                  <label htmlFor="email">이메일</label>
                  <input
                    id="email"
                    type="email"
                    value={userProfile?.email || ''}
                    disabled
                    className="form-input disabled"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="display_name">표시명</label>
                  <input
                    id="display_name"
                    name="display_name"
                    type="text"
                    value={formData.display_name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="표시할 이름을 입력하세요"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="nickname">별칭</label>
                  <input
                    id="nickname"
                    name="nickname"
                    type="text"
                    value={formData.nickname}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="별칭을 입력하세요"
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>직장 정보</h3>
                
                <div className="form-group">
                  <label htmlFor="company_name">회사명</label>
                  <input
                    id="company_name"
                    name="company_name"
                    type="text"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="회사명을 입력하세요"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="position_title">직급</label>
                  <input
                    id="position_title"
                    name="position_title"
                    type="text"
                    value={formData.position_title}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="직급을 입력하세요"
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>조직 (다중선택 가능)</h3>
                <div className="organizations-grid">
                  {availableOrganizations.map(org => (
                    <label key={org.id} className="organization-item">
                      <input
                        type="checkbox"
                        checked={selectedOrganizations.includes(org.id)}
                        onChange={(e) => handleOrganizationChange(org.id, e.target.checked)}
                        className="organization-checkbox"
                      />
                      <div className="organization-info">
                        <span className="organization-name">{org.name}</span>
                        {org.description && (
                          <span className="organization-description">{org.description}</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={onClose}
                  className="cancel-button"
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="save-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;