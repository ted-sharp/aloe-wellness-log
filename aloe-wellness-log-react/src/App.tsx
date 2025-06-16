import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import RecordInput from './pages/RecordInput';
import RecordList from './pages/RecordList';
import { useRecordsStore } from './store/records';
import './App.css'

function App() {
  const { initializeFields } = useRecordsStore();
  useEffect(() => {
    initializeFields();
  }, [initializeFields]);

  return (
    <Router>
      <nav className="flex gap-4 p-4 bg-gray-100">
        <Link to="/input" className="text-blue-600 hover:underline">記録入力</Link>
        <Link to="/list" className="text-blue-600 hover:underline">記録一覧</Link>
      </nav>
      <Routes>
        <Route path="/input" element={<RecordInput />} />
        <Route path="/list" element={<RecordList />} />
        <Route path="*" element={<Navigate to="/input" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
