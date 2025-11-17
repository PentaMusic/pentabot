import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './AuthModal.css'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [tokens, setTokens] = useState<{
    accessToken: string | null
    refreshToken: string | null
    type: string | null
  }>({ accessToken: null, refreshToken: null, type: null })

  useEffect(() => {
    // Try to get tokens from URL search params first
    let accessToken = searchParams.get('access_token')
    let refreshToken = searchParams.get('refresh_token')
    let type = searchParams.get('type')

    // If not found in search params, try to parse from hash (fragment)
    if (!accessToken && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      accessToken = hashParams.get('access_token')
      refreshToken = hashParams.get('refresh_token')
      type = hashParams.get('type')
    }
    
    console.log('URL params debug:', {
      searchParams: Object.fromEntries(searchParams.entries()),
      hash: window.location.hash,
      extracted: { accessToken: !!accessToken, refreshToken: !!refreshToken, type }
    })
    
    setTokens({ accessToken, refreshToken, type })
    
    if (!accessToken || type !== 'recovery') {
      setError('잘못된 비밀번호 재설정 링크입니다.')
    } else {
      setError('')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password || !confirmPassword) {
      setError('모든 필드를 입력해주세요.')
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (!tokens.accessToken) {
      setError('잘못된 비밀번호 재설정 링크입니다.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const apiUrl = import.meta.env.VITE_API_URL
      const response = await fetch(`${apiUrl}/auth/updatePassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`
        },
        body: JSON.stringify({ 
          password,
          refreshToken: tokens.refreshToken 
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '비밀번호 재설정에 실패했습니다.')
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/')
      }, 3000)

    } catch (error) {
      console.error('Password reset error:', error)
      setError(error instanceof Error ? error.message : '비밀번호 재설정에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-modal-backdrop">
        <div className="auth-modal">
          <div className="auth-modal-content">
            <div className="auth-header">
              <h2>비밀번호 재설정 완료</h2>
              <p>비밀번호가 성공적으로 변경되었습니다. 잠시 후 홈페이지로 이동합니다.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-modal-backdrop">
      <div className="auth-modal">
        <div className="auth-modal-content">
          <div className="auth-header">
            <h2>새 비밀번호 설정</h2>
            <p>새로운 비밀번호를 입력해주세요.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">새 비밀번호</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="새 비밀번호를 입력하세요"
                disabled={isLoading || !tokens.accessToken}
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">비밀번호 확인</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                disabled={isLoading || !tokens.accessToken}
                minLength={6}
              />
            </div>

            {error && (
              <div className="error-message">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="auth-submit-btn"
              disabled={isLoading || !tokens.accessToken}
            >
              {isLoading ? (
                <div className="loading-spinner">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                      <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                      <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                </div>
              ) : (
                '비밀번호 재설정'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              <button 
                type="button"
                className="auth-link"
                onClick={() => navigate('/')}
              >
                홈으로 돌아가기
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword