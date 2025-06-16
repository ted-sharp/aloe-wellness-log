import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import RecordInput from './pages/RecordInput';
import RecordList from './pages/RecordList';
import RecordGraph from './pages/RecordGraph';
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
      </nav>
      <Routes>
        <Route path="/" element={<RecordInput />} />
        <Route path="/list" element={<RecordList />} />
        <Route path="/graph" element={<RecordGraph />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
