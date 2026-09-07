import React, { useState } from 'react';
import { signInWithEmail, signUpWithEmail } from '../utils/supabase';
import { formatErrorMessage } from '../utils/formatError';

interface AuthModalProps {
  isOpen: boolean;
  onLoginSuccess: () => void;
  onSwitchToLocal?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onLoginSuccess, onSwitchToLocal }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { error: err } = await signInWithEmail(email, password);
        if (err) {
          setError(formatErrorMessage(err.message || '로그인에 실패했습니다.'));
          return;
        }
      } else {
        const { error: err } = await signUpWithEmail(email, password);
        if (err) {
          setError(formatErrorMessage(err.message || '회원가입에 실패했습니다.'));
          return;
        }
      }
      onLoginSuccess();
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>
          {mode === 'login' ? '로그인' : '회원가입'}
        </h2>

        {error && (
          <div style={styles.errorBox}>
            <span style={{ marginRight: '6px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="email-input" style={styles.label}>이메일</label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user1@test.com"
              disabled={isLoading}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="password-input" style={styles.label}>비밀번호</label>
            <div style={styles.passwordContainer}>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
                disabled={isLoading}
                style={{ ...styles.input, flex: 1 }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                style={styles.toggleButton}
              >
                {showPassword ? '숨김' : '표시'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            style={{
              ...styles.submitButton,
              opacity: isLoading || !email || !password ? 0.6 : 1,
            }}
          >
            {isLoading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>

        <div style={styles.toggleMode}>
          {mode === 'login' ? (
            <>
              계정이 없으신가요?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
                style={styles.linkButton}
                disabled={isLoading}
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              이미 계정이 있으신가요?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                style={styles.linkButton}
                disabled={isLoading}
              >
                로그인
              </button>
            </>
          )}
        </div>

        <div style={styles.hint}>
          <p style={{ margin: '0 0 6px 0', fontWeight: 'bold' }}>테스트 계정 (Supabase Auth):</p>
          <p style={{ margin: '2px 0' }}>user1@test.com / password123</p>
          <p style={{ margin: '2px 0' }}>user2@test.com / password123</p>
          <p style={{ margin: '2px 0' }}>admin@test.com / password123</p>
        </div>

        {onSwitchToLocal && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={onSwitchToLocal}
              disabled={isLoading}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              로그인 없이 로컬 데모 모드로 둘러보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
  },
  title: {
    margin: '0 0 24px 0',
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px 16px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
    border: '1px solid #f5c6cb',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontWeight: 'bold',
    fontSize: '14px',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  passwordContainer: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  toggleButton: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#f9f9f9',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  submitButton: {
    padding: '10px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  toggleMode: {
    marginTop: '16px',
    textAlign: 'center',
    fontSize: '14px',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#007bff',
    cursor: 'pointer',
    fontWeight: 'bold',
    textDecoration: 'underline',
    padding: 0,
    font: 'inherit',
  },
  hint: {
    marginTop: '20px',
    padding: '12px',
    backgroundColor: '#d1ecf1',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#0c5460',
    border: '1px solid #bee5eb',
  },
};
