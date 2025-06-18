import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import RecordInput from './pages/RecordInput';
import RecordList from './pages/RecordList';
import RecordGraph from './pages/RecordGraph';
import RecordCalendar from './pages/RecordCalendar';
import RecordExport from './pages/RecordExport';
import { useRecordsStore } from './store/records';
import './App.css'

function App() {
  const { initializeFields } = useRecordsStore();
  useEffect(() => {
    initializeFields();
  }, [initializeFields]);

  return (
    <Router>
      <nav className="flex gap-4 mb-4">
        <Link to="/">記録入力</Link>
        <Link to="/list">記録一覧</Link>
        <Link to="/graph">記録グラフ</Link>
        <Link to="/calendar">記録カレンダー</Link>
        <Link to="/export">エクスポート</Link>
      </nav>
      <Routes>
        <Route path="/" element={<RecordInput />} />
        <Route path="/list" element={<RecordList />} />
        <Route path="/graph" element={<RecordGraph />} />
        <Route path="/calendar" element={<RecordCalendar />} />
        <Route path="/export" element={<RecordExport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
