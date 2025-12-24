import React, { useState, useEffect } from 'react';
import './DrivePermission.css';
import LoginComponent from './LoginComponent';
import MainInterfaceComponent from './MainInterfaceComponent';

const DrivePermission = () => {
  const [action, setAction] = useState('grant');
  const [mode, setMode] = useState('single');
  const [email, setEmail] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoUrls, setVideoUrls] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
  const API_KEY = process.env.REACT_APP_API_KEY;
  const SCOPES = 'https://www.googleapis.com/auth/drive';

  // Khôi phục session khi component mount
  useEffect(() => {
    loadGoogleAPI();
  }, []);

  // Chờ API load xong rồi restore session
  useEffect(() => {
    if (apiLoaded && window.tokenClient) {
      restoreSession();
    }
  }, [apiLoaded]);

  // Lưu session mỗi khi có thay đổi
  useEffect(() => {
    if (accessToken && userInfo) {
      saveSession();
    }
  }, [accessToken, userInfo]);

  // Tự động làm mới token mỗi 45 phút
  useEffect(() => {
    if (!accessToken || !isLoggedIn) return;

    const refreshInterval = setInterval(() => {
      console.log('Tự động làm mới token...');
      silentRefreshToken();
    }, 45 * 60 * 1000); // 45 phút

    return () => clearInterval(refreshInterval);
  }, [accessToken, isLoggedIn]);

  const saveSession = () => {
    try {
      const sessionData = {
        accessToken,
        userInfo,
        timestamp: Date.now()
      };
      localStorage.setItem('drivePermissionSession', JSON.stringify(sessionData));
    } catch (error) {
      console.error('Lỗi lưu session:', error);
    }
  };

  const restoreSession = async () => {
    try {
      const savedSession = localStorage.getItem('drivePermissionSession');
      if (!savedSession) {
        console.log('Không có session được lưu');
        return;
      }

      const sessionData = JSON.parse(savedSession);
      const oneDayInMs = 24 * 60 * 60 * 1000;
      
      // Kiểm tra session có hết hạn không (24 giờ)
      if (Date.now() - sessionData.timestamp > oneDayInMs) {
        console.log('Session đã hết hạn (> 24 giờ)');
        clearSession();
        return;
      }
      
      // Set ngay lập tức từ localStorage để user không phải chờ
      setAccessToken(sessionData.accessToken);
      setUserInfo(sessionData.userInfo);
      setIsLoggedIn(true);
      
      // Kiểm tra token có còn hiệu lực không (background)
      const isValid = await verifyToken(sessionData.accessToken);
      
      if (!isValid) {
        // Token không hợp lệ, thử làm mới
        console.log('Token không hợp lệ, thử làm mới...');
        silentRefreshToken();
      } else {
        console.log('Token hợp lệ, session khôi phục thành công');
      }
    } catch (error) {
      console.error('Lỗi khôi phục session:', error);
      clearSession();
    }
  };

  const silentRefreshToken = async () => {
    try {
      // Đợi API load xong (tối đa 5 giây)
      let attempts = 0;
      while (!window.tokenClient && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.tokenClient) {
        console.error('Không thể khởi tạo tokenClient');
        clearSession();
        return;
      }

      // Yêu cầu token mới (không hiện popup)
      window.tokenClient.requestAccessToken({ prompt: '' });
    } catch (error) {
      console.error('Lỗi làm mới token:', error);
      clearSession();
    }
  };

  const verifyToken = async (token) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const clearSession = () => {
    localStorage.removeItem('drivePermissionSession');
    setAccessToken(null);
    setUserInfo(null);
    setIsLoggedIn(false);
  };

  const loadGoogleAPI = () => {
    const script1 = document.createElement('script');
    script1.src = 'https://accounts.google.com/gsi/client';
    script1.async = true;
    script1.defer = true;
    script1.onload = () => {
      initializeGIS();
    };
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://apis.google.com/js/api.js';
    script2.async = true;
    script2.defer = true;
    script2.onload = () => {
      window.gapi.load('client', initializeGapiClient);
    };
    document.body.appendChild(script2);
  };

  const initializeGapiClient = async () => {
    try {
      await window.gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });
      setApiLoaded(true);
    } catch (error) {
      setApiError(`Lỗi khởi tạo GAPI: ${error.message}`);
    }
  };

  const initializeGIS = () => {
    try {
      window.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        prompt: '',
        callback: (response) => {
          if (response.access_token) {
            setAccessToken(response.access_token);
            getUserInfo(response.access_token);
          } else if (response.error) {
            console.error('Lỗi token:', response.error);
            clearSession();
          }
        },
      });
    } catch (error) {
      setApiError(`Lỗi khởi tạo GIS: ${error.message}`);
    }
  };

  const getUserInfo = async (token) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setUserInfo({
        name: data.name,
        email: data.email,
        imageUrl: data.picture,
      });
      setIsLoggedIn(true);
    } catch (error) {
      setApiError(`Lỗi lấy thông tin user: ${error.message}`);
    }
  };

  const handleLogin = () => {
    if (!window.tokenClient) {
      setResult({ type: 'error', message: 'Google API chưa sẵn sàng. Vui lòng đợi...' });
      return;
    }
    try {
      // Hiện popup đăng nhập cho lần đầu
      window.tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (error) {
      setResult({ type: 'error', message: `Lỗi đăng nhập: ${error.message}` });
    }
  };

  const handleLogout = () => {
    if (accessToken) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        clearSession();
        setResult(null);
      });
    } else {
      clearSession();
    }
  };

  const extractVideoId = (url) => {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : url.trim();
  };

  const shareVideo = async (videoId, targetEmail) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${videoId}/permissions?sendNotificationEmail=true`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'user',
            role: 'reader',
            emailAddress: targetEmail,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        
        // Nếu token hết hạn, xóa session và yêu cầu đăng nhập lại
        if (response.status === 401) {
          clearSession();
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        
        throw new Error(error.error?.message || 'Lỗi không xác định');
      }

      return { success: true, videoId };
    } catch (error) {
      return { success: false, videoId, error: error.message };
    }
  };

  const revokeVideo = async (videoId, targetEmail) => {
    try {
      const listResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${videoId}/permissions?fields=permissions(id,emailAddress)`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!listResponse.ok) {
        const error = await listResponse.json();
        
        if (listResponse.status === 401) {
          clearSession();
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        
        throw new Error(error.error?.message || 'Không thể lấy danh sách quyền');
      }

      const data = await listResponse.json();
      const permission = data.permissions?.find(p => p.emailAddress === targetEmail);

      if (!permission) {
        throw new Error('Không tìm thấy quyền cho email này');
      }

      const deleteResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${videoId}/permissions/${permission.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!deleteResponse.ok) {
        const error = await deleteResponse.json();
        throw new Error(error.error?.message || 'Không thể xóa quyền');
      }

      return { success: true, videoId };
    } catch (error) {
      return { success: false, videoId, error: error.message };
    }
  };

  const handleSharePermission = async () => {
    if (!isLoggedIn) {
      setResult({ type: 'error', message: 'Vui lòng đăng nhập Google trước!' });
      return;
    }

    if (!email.trim()) {
      setResult({ type: 'error', message: 'Vui lòng nhập email người nhận!' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setResult({ type: 'error', message: 'Email không hợp lệ!' });
      return;
    }

    setLoading(true);
    setResult(null);

    const processFunction = action === 'grant' ? shareVideo : revokeVideo;
    const actionText = action === 'grant' ? 'cấp quyền' : 'gỡ quyền';

    if (mode === 'single') {
      if (!videoUrl.trim()) {
        setResult({ type: 'error', message: 'Vui lòng nhập URL hoặc ID video!' });
        setLoading(false);
        return;
      }

      const videoId = extractVideoId(videoUrl);
      const result = await processFunction(videoId, email);

      if (result.success) {
        setResult({ type: 'success', message: `Đã ${actionText} quyền truy cập video thành công!` });
      } else {
        setResult({ type: 'error', message: `Lỗi: ${result.error}` });
      }

      setLoading(false);
    } else {
      // Chế độ hàng loạt
      const videoIds = videoUrls.split('\n').map(extractVideoId).filter(Boolean);
      let successCount = 0;
      let errorCount = 0;
      let errorMessage = '';

      for (const videoId of videoIds) {
        const result = await processFunction(videoId, email);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          errorMessage = result.error;
        }
      }

      if (successCount > 0) {
        setResult({ type: 'success', message: `Đã ${actionText} quyền truy cập cho ${successCount} video thành công!` });
      }

      if (errorCount > 0) {
        setResult({ type: 'error', message: `Đã xảy ra lỗi với ${errorCount} video: ${errorMessage}` });
      }

      setLoading(false);
    }
  };

  return (
    <div className="drive-permission-container">
      {!isLoggedIn ? (
        <LoginComponent 
          onLogin={handleLogin}
          apiLoaded={apiLoaded}
          userInfo={userInfo}
          isLoggedIn={isLoggedIn}
        />
      ) : (
        <MainInterfaceComponent
          action={action}
          setAction={setAction}
          mode={mode}
          setMode={setMode}
          email={email}
          setEmail={setEmail}
          videoUrl={videoUrl}
          setVideoUrl={setVideoUrl}
          videoUrls={videoUrls}
          setVideoUrls={setVideoUrls}
          onShare={handleSharePermission}
          loading={loading}
          result={result}
          userInfo={userInfo}
          onLogout={handleLogout}
        />
      )}

      {apiError && (
        <div className="api-error">
          {apiError}
        </div>
      )}
    </div>
  );
};

export default DrivePermission;