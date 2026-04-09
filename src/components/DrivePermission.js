import React, { useState, useEffect, useCallback, useRef } from 'react';
import './DrivePermission.css';
import LoginComponent from './LoginComponent';
import MainInterfaceComponent from './MainInterfaceComponent';

const DrivePermission = () => {
  const [action, setAction] = useState('grant');
  const [mode, setMode] = useState('single');
  const [email, setEmail] = useState('');
  const [emails, setEmails] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoUrls, setVideoUrls] = useState('');
  const [folderUrl, setFolderUrl] = useState('');
  const [folderFiles, setFolderFiles] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, successCount: 0, errorCount: 0, skippedCount: 0 });
  const [detailedResults, setDetailedResults] = useState([]);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [savedGroups, setSavedGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem('emailGroups') || '[]'); } catch { return []; }
  });
  const [viewPermissions, setViewPermissions] = useState(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  const abortControllerRef = useRef(null);

  const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
  const API_KEY = process.env.REACT_APP_API_KEY;
  const SCOPES = 'https://www.googleapis.com/auth/drive';

  // Dark mode persistence
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Khôi phục session khi component mount
  useEffect(() => {
    loadGoogleAPI();
  }, []);

  useEffect(() => {
    if (apiLoaded && window.tokenClient) {
      restoreSession();
    }
  }, [apiLoaded]);

  useEffect(() => {
    if (accessToken && userInfo) {
      saveSession();
    }
  }, [accessToken, userInfo]);

  useEffect(() => {
    if (!accessToken || !isLoggedIn) return;
    const refreshInterval = setInterval(() => {
      silentRefreshToken();
    }, 45 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [accessToken, isLoggedIn]);

  const saveSession = () => {
    try {
      localStorage.setItem('drivePermissionSession', JSON.stringify({ accessToken, userInfo, timestamp: Date.now() }));
    } catch (error) {
      console.error('Lỗi lưu session:', error);
    }
  };

  const restoreSession = async () => {
    try {
      const savedSession = localStorage.getItem('drivePermissionSession');
      if (!savedSession) return;
      const sessionData = JSON.parse(savedSession);
      if (Date.now() - sessionData.timestamp > 24 * 60 * 60 * 1000) {
        clearSession();
        return;
      }
      setAccessToken(sessionData.accessToken);
      setUserInfo(sessionData.userInfo);
      setIsLoggedIn(true);
      const isValid = await verifyTokenCheck(sessionData.accessToken);
      if (!isValid) silentRefreshToken();
    } catch (error) {
      clearSession();
    }
  };

  const silentRefreshToken = async () => {
    try {
      let attempts = 0;
      while (!window.tokenClient && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (!window.tokenClient) { clearSession(); return; }
      window.tokenClient.requestAccessToken({ prompt: '' });
    } catch (error) {
      clearSession();
    }
  };

  const verifyTokenCheck = async (token) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.ok;
    } catch { return false; }
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
    script1.onload = () => initializeGIS();
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://apis.google.com/js/api.js';
    script2.async = true;
    script2.defer = true;
    script2.onload = () => window.gapi.load('client', initializeGapiClient);
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
        callback: (response) => {
          if (response.access_token) {
            setAccessToken(response.access_token);
            getUserInfo(response.access_token);
          } else if (response.error) {
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
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setUserInfo({ name: data.name, email: data.email, imageUrl: data.picture });
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

  const extractFolderId = (url) => {
    const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : url.trim();
  };

  // ===== Concurrent task runner =====
  const runWithConcurrency = async (tasks, limit, onTaskDone, signal) => {
    let index = 0;
    const results = [];

    const runNext = async () => {
      while (index < tasks.length) {
        if (signal && signal.aborted) break;
        const currentIndex = index++;
        try {
          const result = await tasks[currentIndex]();
          results[currentIndex] = result;
          if (onTaskDone) onTaskDone(result);
        } catch (error) {
          results[currentIndex] = { success: false, error: error.message };
          if (onTaskDone) onTaskDone(results[currentIndex]);
        }
      }
    };

    const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => runNext());
    await Promise.all(workers);
    return results;
  };

  // ===== API functions =====
  const shareVideo = async (videoId, targetEmail) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${videoId}/permissions?sendNotificationEmail=true`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'user', role: 'reader', emailAddress: targetEmail }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        if (response.status === 401) { clearSession(); throw new Error('Phiên đăng nhập đã hết hạn.'); }
        if (response.status === 429) { await new Promise(r => setTimeout(r, 2000)); return shareVideo(videoId, targetEmail); }
        throw new Error(error.error?.message || 'Lỗi không xác định');
      }
      return { success: true, videoId, email: targetEmail };
    } catch (error) {
      return { success: false, videoId, email: targetEmail, error: error.message };
    }
  };

  const revokeVideo = async (videoId, targetEmail) => {
    try {
      const listResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${videoId}/permissions?fields=permissions(id,emailAddress)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!listResponse.ok) {
        const error = await listResponse.json();
        if (listResponse.status === 401) { clearSession(); throw new Error('Phiên đăng nhập đã hết hạn.'); }
        if (listResponse.status === 429) { await new Promise(r => setTimeout(r, 2000)); return revokeVideo(videoId, targetEmail); }
        throw new Error(error.error?.message || 'Không thể lấy danh sách quyền');
      }
      const data = await listResponse.json();
      const permission = data.permissions?.find(p => p.emailAddress === targetEmail);
      if (!permission) return { success: true, videoId, email: targetEmail, skipped: true };

      const deleteResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${videoId}/permissions/${permission.id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!deleteResponse.ok) {
        const error = await deleteResponse.json();
        throw new Error(error.error?.message || 'Không thể xóa quyền');
      }
      return { success: true, videoId, email: targetEmail };
    } catch (error) {
      return { success: false, videoId, email: targetEmail, error: error.message };
    }
  };

  // ===== Verify file exists =====
  const verifyFile = async (fileId) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  };

  // ===== List folder files =====
  const listFolderFiles = async (folderId) => {
    let allFiles = [];
    let pageToken = null;
    do {
      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType),nextPageToken&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) throw new Error('Không thể đọc folder');
      const data = await response.json();
      allFiles = allFiles.concat(data.files || []);
      pageToken = data.nextPageToken;
    } while (pageToken);
    return allFiles;
  };

  // ===== Get permissions =====
  const getPermissions = async (fileId) => {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?fields=permissions(id,emailAddress,role,type,displayName)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) throw new Error('Không thể lấy danh sách quyền');
    return await response.json();
  };

  const handleViewPermissions = async (videoUrlOrId) => {
    if (!videoUrlOrId.trim()) return;
    setPermissionsLoading(true);
    setViewPermissions(null);
    try {
      const fileId = extractVideoId(videoUrlOrId);
      const fileInfo = await verifyFile(fileId);
      const perms = await getPermissions(fileId);
      setViewPermissions({ fileName: fileInfo?.name || fileId, permissions: perms.permissions || [] });
    } catch (error) {
      setResult({ type: 'error', message: `Lỗi: ${error.message}` });
    }
    setPermissionsLoading(false);
  };

  // ===== Scan emails from video =====
  const handleScanEmails = async (videoUrlOrId) => {
    if (!videoUrlOrId.trim()) return;
    setPermissionsLoading(true);
    try {
      const fileId = extractVideoId(videoUrlOrId);
      const perms = await getPermissions(fileId);
      const scannedEmails = (perms.permissions || [])
        .filter(p => p.type === 'user' && p.emailAddress)
        .map(p => p.emailAddress);
      if (scannedEmails.length === 0) {
        setResult({ type: 'warning', message: 'Không tìm thấy email nào có quyền trên video này.' });
      } else {
        setEmails(prev => {
          const existing = prev.split('\n').map(e => e.trim()).filter(Boolean);
          const merged = [...new Set([...existing, ...scannedEmails])];
          return merged.join('\n');
        });
        setResult({ type: 'success', message: `Đã thêm ${scannedEmails.length} email từ video vào danh sách.` });
      }
    } catch (error) {
      setResult({ type: 'error', message: `Lỗi quét email: ${error.message}` });
    }
    setPermissionsLoading(false);
  };

  // ===== Load folder =====
  const handleLoadFolder = async () => {
    if (!folderUrl.trim()) return;
    setLoading(true);
    setFolderFiles([]);
    try {
      const folderId = extractFolderId(folderUrl);
      const files = await listFolderFiles(folderId);
      setFolderFiles(files);
      setResult({ type: 'success', message: `Tìm thấy ${files.length} file trong folder.` });
    } catch (error) {
      setResult({ type: 'error', message: `Lỗi đọc folder: ${error.message}` });
    }
    setLoading(false);
  };

  // ===== Email groups =====
  const saveEmailGroup = (name) => {
    const emailList = emails.split('\n').map(e => e.trim()).filter(Boolean);
    if (emailList.length === 0 || !name) return;
    const newGroups = [...savedGroups, { name, emails: emailList }];
    setSavedGroups(newGroups);
    localStorage.setItem('emailGroups', JSON.stringify(newGroups));
  };

  const loadEmailGroup = (index) => {
    if (savedGroups[index]) {
      setEmails(savedGroups[index].emails.join('\n'));
    }
  };

  const deleteEmailGroup = (index) => {
    const newGroups = savedGroups.filter((_, i) => i !== index);
    setSavedGroups(newGroups);
    localStorage.setItem('emailGroups', JSON.stringify(newGroups));
  };

  // ===== Export CSV =====
  const exportToCSV = () => {
    if (detailedResults.length === 0) return;
    const csv = 'Email,Video ID,Trạng thái,Lỗi\n' + detailedResults.map(r =>
      `"${r.email}","${r.videoId}","${r.status}","${r.error || ''}"`
    ).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ket-qua-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===== Stop =====
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // ===== Main processing =====
  const handleSharePermission = async () => {
    if (!isLoggedIn) {
      setResult({ type: 'error', message: 'Vui lòng đăng nhập Google trước!' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const processFunction = action === 'grant' ? shareVideo : revokeVideo;
    const actionText = action === 'grant' ? 'cấp quyền' : 'gỡ quyền';

    let emailList = [];
    let videoIds = [];

    if (mode === 'single') {
      if (!email.trim() || !videoUrl.trim()) {
        setResult({ type: 'error', message: 'Vui lòng nhập đầy đủ email và URL video!' });
        return;
      }
      if (!emailRegex.test(email)) {
        setResult({ type: 'error', message: 'Email không hợp lệ!' });
        return;
      }
      emailList = [email.trim()];
      videoIds = [extractVideoId(videoUrl)];
    } else if (mode === 'multiple') {
      if (!email.trim()) { setResult({ type: 'error', message: 'Vui lòng nhập email!' }); return; }
      if (!emailRegex.test(email)) { setResult({ type: 'error', message: 'Email không hợp lệ!' }); return; }
      videoIds = [...new Set(videoUrls.split('\n').map(extractVideoId).filter(Boolean))];
      if (videoIds.length === 0) { setResult({ type: 'error', message: 'Vui lòng nhập danh sách video!' }); return; }
      emailList = [email.trim()];
    } else if (mode === 'multi-user') {
      emailList = [...new Set(emails.split('\n').map(e => e.trim()).filter(Boolean))];
      videoIds = [...new Set(videoUrls.split('\n').map(extractVideoId).filter(Boolean))];
      if (emailList.length === 0) { setResult({ type: 'error', message: 'Vui lòng nhập danh sách email!' }); return; }
      const invalidEmails = emailList.filter(e => !emailRegex.test(e));
      if (invalidEmails.length > 0) { setResult({ type: 'error', message: `Email không hợp lệ: ${invalidEmails.join(', ')}` }); return; }
      if (videoIds.length === 0) { setResult({ type: 'error', message: 'Vui lòng nhập danh sách video!' }); return; }
    } else if (mode === 'folder') {
      if (folderFiles.length === 0) { setResult({ type: 'error', message: 'Vui lòng tải folder trước!' }); return; }
      emailList = [...new Set(emails.split('\n').map(e => e.trim()).filter(Boolean))];
      if (emailList.length === 0) { setResult({ type: 'error', message: 'Vui lòng nhập danh sách email!' }); return; }
      const invalidEmails = emailList.filter(e => !emailRegex.test(e));
      if (invalidEmails.length > 0) { setResult({ type: 'error', message: `Email không hợp lệ: ${invalidEmails.join(', ')}` }); return; }
      videoIds = folderFiles.map(f => f.id);
    }

    // Build task list
    const tasks = [];
    for (const targetEmail of emailList) {
      for (const videoId of videoIds) {
        tasks.push(() => processFunction(videoId, targetEmail));
      }
    }

    const total = tasks.length;
    if (total === 0) return;

    setLoading(true);
    setResult(null);
    setDetailedResults([]);
    setProgress({ current: 0, total, successCount: 0, errorCount: 0, skippedCount: 0 });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const allResults = [];
    let successCount = 0, errorCount = 0, skippedCount = 0;
    const errorMessages = [];

    await runWithConcurrency(tasks, 5, (result) => {
      allResults.push(result);
      if (result.success) {
        if (result.skipped) skippedCount++;
        else successCount++;
      } else {
        errorCount++;
        errorMessages.push(`${result.email} - ${result.videoId}: ${result.error}`);
      }
      setProgress({
        current: allResults.length,
        total,
        successCount,
        errorCount,
        skippedCount,
      });
    }, controller.signal);

    abortControllerRef.current = null;

    // Save detailed results
    setDetailedResults(allResults.map(r => ({
      email: r.email || '',
      videoId: r.videoId || '',
      status: r.success ? (r.skipped ? 'skipped' : 'success') : 'error',
      error: r.error || '',
    })));

    const cancelled = controller.signal.aborted;
    let message = `Đã ${actionText} thành công ${successCount}/${total}`;
    if (emailList.length > 1 || videoIds.length > 1) {
      message += ` (${emailList.length} người × ${videoIds.length} video)`;
    }
    message += '.';
    if (skippedCount > 0) message += ` Bỏ qua ${skippedCount}.`;
    if (errorCount > 0) {
      message += ` Lỗi ${errorCount}: ${errorMessages.slice(0, 3).join('; ')}`;
      if (errorMessages.length > 3) message += `... và ${errorMessages.length - 3} lỗi khác`;
    }
    if (cancelled) message += ' (Đã dừng bởi người dùng)';

    setResult({ type: errorCount > 0 ? (successCount > 0 ? 'warning' : 'error') : 'success', message });
    setLoading(false);
  };

  return (
    <div className={`drive-permission-container ${darkMode ? 'dark' : ''}`}>
      {!isLoggedIn ? (
        <LoginComponent
          onLogin={handleLogin}
          apiLoaded={apiLoaded}
          userInfo={userInfo}
          isLoggedIn={isLoggedIn}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />
      ) : (
        <MainInterfaceComponent
          action={action}
          setAction={setAction}
          mode={mode}
          setMode={setMode}
          email={email}
          setEmail={setEmail}
          emails={emails}
          setEmails={setEmails}
          videoUrl={videoUrl}
          setVideoUrl={setVideoUrl}
          videoUrls={videoUrls}
          setVideoUrls={setVideoUrls}
          folderUrl={folderUrl}
          setFolderUrl={setFolderUrl}
          folderFiles={folderFiles}
          onLoadFolder={handleLoadFolder}
          onShare={handleSharePermission}
          onStop={handleStop}
          loading={loading}
          progress={progress}
          result={result}
          detailedResults={detailedResults}
          onExportCSV={exportToCSV}
          userInfo={userInfo}
          onLogout={handleLogout}
          savedGroups={savedGroups}
          onSaveGroup={saveEmailGroup}
          onLoadGroup={loadEmailGroup}
          onDeleteGroup={deleteEmailGroup}
          onViewPermissions={handleViewPermissions}
          viewPermissions={viewPermissions}
          permissionsLoading={permissionsLoading}
          onClosePermissions={() => setViewPermissions(null)}
          onScanEmails={handleScanEmails}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          accessToken={accessToken}
          extractVideoId={extractVideoId}
          verifyFile={verifyFile}
        />
      )}
      {apiError && <div className="api-error">{apiError}</div>}
    </div>
  );
};

export default DrivePermission;
