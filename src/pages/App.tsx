import React, { useState, useEffect } from 'react';
import { CustomerPage } from '../components/CustomerPage';
import { AdminPage } from '../components/AdminPage';
import { AuthModal } from '../components/AuthModal';
import { NotificationBanner } from '../components/NotificationBanner';
import { DatabaseManager } from '../utils/database';
import { SupabaseManager } from '../utils/supabaseManager';
import { REFERENCE_TIME, getCurrentTime, setTestTime } from '../utils/constants';
import { isSupabaseConfigured, getAuthUser, signOut, isAdmin } from '../utils/supabase';

type Mode = 'local' | 'supabase';
type Role = 'customer' | 'admin';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
}

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('local');
  const [role, setRole] = useState<Role>('customer');
  const [db, setDb] = useState<DatabaseManager | SupabaseManager | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(getCurrentTime());
  const [testTimeInput, setTestTimeInput] = useState<string>('');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const initUserSession = async (user: any) => {
    setAuthUser(user);
    const supabaseDb = new SupabaseManager(user.id);
    await supabaseDb.initialize();
    setDb(supabaseDb);

    let isAdminUser = false;
    try {
      isAdminUser = await isAdmin();
      setRole(isAdminUser ? 'admin' : 'customer');
    } catch (err) {
      console.error('Failed to check admin status:', err);
      setRole('customer');
    }
    return isAdminUser;
  };

  // 초기화: Supabase 설정 여부 확인
  useEffect(() => {
    const checkSupabase = async () => {
      if (isSupabaseConfigured()) {
        setMode('supabase');
        try {
          const user = await getAuthUser();
          if (user) {
            await initUserSession(user);
          } else {
            setAuthUser(null);
            setDb(null);
          }
        } catch (err) {
          console.error('Supabase 연결 실패:', err);
          setAuthError('Supabase 연결 실패: ' + String(err));
        }
      } else {
        setMode('local');
        setDb(new DatabaseManager());
      }
      setIsLoading(false);
    };
    checkSupabase();
  }, []);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    const roleText = newRole === 'admin' ? '어드민' : '고객';
    addNotification(`${roleText} 모드로 전환되었습니다`, 'info', 2000);
  };

  const handleResetData = () => {
    if (window.confirm('모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      if (db) {
        db.reset();
        addNotification('데이터를 초기화하는 중입니다...', 'warning', 2000);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
  };

  const handleSetTestTime = () => {
    if (!testTimeInput.trim()) {
      setTestTime(null);
      setCurrentTime(new Date());
      setTestTimeInput('');
      return;
    }
    try {
      const time = new Date(testTimeInput);
      setTestTime(time);
      setCurrentTime(time);
      addNotification(`테스트 시간: ${time.toLocaleString('ko-KR')}로 설정되었습니다`, 'info', 2000);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      addNotification('잘못된 시간 형식입니다', 'error', 3000);
    }
  };

  const handleClearTestTime = () => {
    setTestTime(null);
    setCurrentTime(new Date());
    setTestTimeInput('');
    addNotification('테스트 시간 설정이 해제되었습니다', 'info', 2000);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const addNotification = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 4000) => {
    const id = `notif-${Date.now()}-${Math.random()}`;
    const notification: Notification = { id, type, message, duration };
    setNotifications((prev) => [...prev, notification]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setAuthUser(null);
      setDb(null);
      setAuthError('');
      setRole('customer');
      addNotification('로그아웃되었습니다', 'info', 3000);
    } catch (err) {
      setAuthError('로그아웃 실패: ' + String(err));
      addNotification('로그아웃 실패: ' + String(err), 'error', 4000);
    }
  };

  const handleAuthSuccess = async () => {
    setIsLoading(true);
    try {
      const user = await getAuthUser();
      if (user) {
        const isAdminUser = await initUserSession(user);
        setAuthError('');
        const roleText = isAdminUser ? '어드민' : '고객';
        addNotification(`${user.email}로 로그인했습니다 (${roleText})`, 'success', 3000);
      } else {
        setAuthError('로그인 사용자 정보를 가져오지 못했습니다.');
      }
    } catch (err) {
      setAuthError('인증 확인 실패: ' + String(err));
      addNotification('로그인 실패: ' + String(err), 'error', 4000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToLocal = () => {
    setMode('local');
    setDb(new DatabaseManager());
    addNotification('로컬 데모 모드로 전환되었습니다', 'info', 2000);
  };

  const handleSwitchToSupabase = async () => {
    if (!isSupabaseConfigured()) {
      addNotification('Supabase 환경 변수가 설정되지 않았습니다', 'warning', 3000);
      return;
    }
    setIsLoading(true);
    setMode('supabase');
    try {
      const user = await getAuthUser();
      if (user) {
        await initUserSession(user);
      } else {
        setAuthUser(null);
        setDb(null);
      }
      setAuthError('');
      addNotification('Supabase 모드로 전환되었습니다', 'info', 2000);
    } catch (err) {
      setAuthError('Supabase 연결 실패: ' + String(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || (mode === 'local' && !db)) {
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
      <NotificationBanner notifications={notifications} onClose={removeNotification} />

      <div className="header">
        <div>
          <h1>cal.dudu-works.com</h1>
          <div className="reference-time">
            기준 시각: {REFERENCE_TIME.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (고정)
            <br />
            현재 시각: {currentTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
          </div>
          {mode === 'local' && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>테스트 시간 고정:</label>
              <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                <input
                  type="datetime-local"
                  value={testTimeInput}
                  onChange={(e) => setTestTimeInput(e.target.value)}
                  style={{ padding: '6px', fontSize: '12px', flex: 1 }}
                  placeholder="2026-09-09T09:00"
                />
                <button onClick={handleSetTestTime} style={{ padding: '6px 12px', fontSize: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  설정
                </button>
                <button onClick={handleClearTestTime} style={{ padding: '6px 12px', fontSize: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  해제
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="role-selector">
          {mode === 'supabase' && authUser ? (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
              <span>로그인: {authUser.email}</span>
              <button className="btn btn-secondary" onClick={handleSignOut} style={{ padding: '6px 12px', fontSize: '12px', color: 'white', background: '#6c757d' }}>
                로그아웃
              </button>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {mode === 'local' && (
              <>
                <span style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }}>역할</span>
                <button
                  className={`btn ${role === 'customer' ? 'active' : ''}`}
                  onClick={() => handleRoleChange('customer')}
                  style={{
                    padding: '8px 18px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    background: role === 'customer' ? '#2563eb' : '#f8fafc',
                    color: role === 'customer' ? '#ffffff' : '#334155',
                    border: role === 'customer' ? '2px solid #2563eb' : '2px solid #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    boxShadow: role === 'customer' ? '0 2px 4px rgba(37, 99, 235, 0.25)' : 'none',
                  }}
                >
                  고객
                </button>
                <button
                  className={`btn ${role === 'admin' ? 'active' : ''}`}
                  onClick={() => handleRoleChange('admin')}
                  style={{
                    padding: '8px 18px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    background: role === 'admin' ? '#2563eb' : '#f8fafc',
                    color: role === 'admin' ? '#ffffff' : '#334155',
                    border: role === 'admin' ? '2px solid #2563eb' : '2px solid #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    boxShadow: role === 'admin' ? '0 2px 4px rgba(37, 99, 235, 0.25)' : 'none',
                  }}
                >
                  어드민
                </button>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: '20px', flexWrap: 'wrap' }}>
            <span className={`mode-badge ${mode}`}>{mode === 'local' ? '로컬 모드' : 'Supabase 모드'}</span>
            {mode === 'supabase' && (
              <button
                className="btn btn-secondary"
                onClick={handleSwitchToLocal}
                style={{ padding: '6px 12px', fontSize: '12px', color: 'white', background: '#475569', whiteSpace: 'nowrap' }}
              >
                로컬 모드로 전환
              </button>
            )}
            {mode === 'local' && isSupabaseConfigured() && (
              <button
                className="btn btn-secondary"
                onClick={handleSwitchToSupabase}
                style={{ padding: '6px 12px', fontSize: '12px', color: 'white', background: '#0284c7', whiteSpace: 'nowrap' }}
              >
                Supabase 모드로 전환
              </button>
            )}
            {mode === 'local' && (
              <button
                className="btn btn-secondary"
                onClick={handleResetData}
                style={{ padding: '6px 12px', fontSize: '12px', color: 'white', background: '#6c757d', whiteSpace: 'nowrap' }}
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

      <AuthModal
        isOpen={mode === 'supabase' && !authUser}
        onLoginSuccess={handleAuthSuccess}
        onSwitchToLocal={handleSwitchToLocal}
      />

      {db && mode === 'local' && (
        <>
          {role === 'customer' && <CustomerPage db={db} mode={mode} onNotify={addNotification} />}
          {role === 'admin' && <AdminPage db={db} mode={mode} onNotify={addNotification} />}
        </>
      )}

      {db && mode === 'supabase' && authUser ? (
        <>
          {role === 'customer' && <CustomerPage db={db} mode={mode} userId={authUser.id} onNotify={addNotification} />}
          {role === 'admin' && <AdminPage db={db} mode={mode} userId={authUser.id} onNotify={addNotification} />}
        </>
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
