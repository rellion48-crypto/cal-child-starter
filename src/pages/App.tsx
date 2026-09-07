import React, { useState, useEffect } from 'react';
import { CustomerPage } from '../components/CustomerPage';
import { AdminPage } from '../components/AdminPage';
import { DatabaseManager } from '../utils/database';
import { REFERENCE_TIME } from '../utils/constants';
import { isSupabaseConfigured, getAuthUser, signOut } from '../utils/supabase';

type Mode = 'local' | 'supabase';
type Role = 'customer' | 'admin';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('local');
  const [role, setRole] = useState<Role>('customer');
  const [db] = useState(() => new DatabaseManager());
  const [authUser, setAuthUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // 초기화: Supabase 설정 여부 확인
  useEffect(() => {
    const checkSupabase = async () => {
      if (isSupabaseConfigured()) {
        try {
          const user = await getAuthUser();
          setAuthUser(user);
          setMode('supabase');
        } catch (err) {
          setAuthError('Supabase 연결 실패');
          setMode('local');
        }
      } else {
        setMode('local');
      }
      setIsLoading(false);
    };
    checkSupabase();
  }, []);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
  };

  const handleResetData = () => {
    if (window.confirm('모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      db.reset();
      window.location.reload();
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setAuthUser(null);
      setAuthError('');
      setRole('customer');
    } catch (err) {
      setAuthError('로그아웃 실패: ' + String(err));
    }
  };

  if (isLoading) {
    return (
      <div className="container">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>초기화 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>cal.dudu-works.com</h1>
          <div className="reference-time">
            기준 시각: {REFERENCE_TIME.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (고정)
          </div>
        </div>

        <div className="role-selector">
          {mode === 'supabase' && authUser ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
              <span>로그인: {authUser.email}</span>
              <button className="btn btn-secondary" onClick={handleSignOut} style={{ padding: '6px 12px', fontSize: '12px' }}>
                로그아웃
              </button>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {mode === 'local' && (
              <>
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>역할</span>
                <button
                  className={`btn ${role === 'customer' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleRoleChange('customer')}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  고객
                </button>
                <button
                  className={`btn ${role === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleRoleChange('admin')}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  어드민
                </button>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: '20px' }}>
            <span className={`mode-badge ${mode}`}>{mode === 'local' ? '로컬 모드' : 'Supabase 모드'}</span>
            {mode === 'local' && (
              <button
                className="btn btn-secondary"
                onClick={handleResetData}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                데이터 초기화
              </button>
            )}
          </div>
        </div>
      </div>

      {mode === 'local' && (
        <div className="alert alert-info">
          <strong>로컬 모드:</strong> 브라우저 로컬 스토리지에 데이터를 저장합니다. 진짜 인증이 아닌 수업용 데모입니다.
          역할 전환은 이 모드에만 있습니다.
        </div>
      )}

      {mode === 'supabase' && (
        <div className={`alert ${authUser ? 'alert-success' : 'alert-warning'}`}>
          <strong>Supabase 모드:</strong> 실제 데이터베이스와 인증이 적용됩니다.
          {authUser ? ' 인증됨.' : ' 로그인이 필요합니다.'}
        </div>
      )}

      {authError && (
        <div className="alert alert-error">
          <strong>오류:</strong> {authError}
        </div>
      )}

      {mode === 'local' && (
        <>
          {role === 'customer' && <CustomerPage db={db} mode={mode} />}
          {role === 'admin' && <AdminPage db={db} mode={mode} />}
        </>
      )}

      {mode === 'supabase' && authUser ? (
        <>
          {role === 'customer' && <CustomerPage db={db} mode={mode} userId={authUser.id} />}
          {role === 'admin' && <AdminPage db={db} mode={mode} userId={authUser.id} />}
        </>
      ) : mode === 'supabase' ? (
        <div className="alert alert-warning" style={{ marginTop: '20px' }}>
          <p>로그인이 필요합니다. (구현 예정)</p>
        </div>
      ) : null}

      <hr style={{ margin: '40px 0', borderColor: '#ddd' }} />
      <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', paddingBottom: '20px' }}>
        <p>cal.dudu-works.com v1.0 - 수업용 기본 실습 앱</p>
        <p>기본값: 42슬롯(14일 × 3시간대), 고객 1-3개 희망, 어드민 수동 확정</p>
      </div>
    </div>
  );
};

export default App;
