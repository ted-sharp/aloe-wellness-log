import React, { useEffect, useState } from 'react';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    initializeFields();
  }, [initializeFields]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <Router>
      <div className="relative">
        {/* デスクトップ用ナビゲーション */}
        <nav className="hidden md:flex gap-4 mb-4">
          <Link to="/" className="px-3 py-2 hover:bg-gray-100 rounded">記録入力</Link>
          <Link to="/list" className="px-3 py-2 hover:bg-gray-100 rounded">記録一覧</Link>
          <Link to="/graph" className="px-3 py-2 hover:bg-gray-100 rounded">記録グラフ</Link>
          <Link to="/calendar" className="px-3 py-2 hover:bg-gray-100 rounded">記録カレンダー</Link>
          <Link to="/export" className="px-3 py-2 hover:bg-gray-100 rounded">エクスポート</Link>
        </nav>

        {/* モバイル用ハンバーガーボタン */}
        <div className="md:hidden flex justify-end mb-4">
          <button
            onClick={toggleMenu}
            className="p-2 hover:bg-gray-100 rounded"
            aria-label="メニューを開く"
          >
            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
              <div className={`h-0.5 w-6 bg-gray-600 transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
              <div className={`h-0.5 w-6 bg-gray-600 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></div>
              <div className={`h-0.5 w-6 bg-gray-600 transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
            </div>
          </button>
        </div>

        {/* モバイル用メニュー */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mb-4">
            <nav className="flex flex-col">
              <Link to="/" onClick={closeMenu} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100">記録入力</Link>
              <Link to="/list" onClick={closeMenu} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100">記録一覧</Link>
              <Link to="/graph" onClick={closeMenu} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100">記録グラフ</Link>
              <Link to="/calendar" onClick={closeMenu} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100">記録カレンダー</Link>
              <Link to="/export" onClick={closeMenu} className="px-4 py-3 hover:bg-gray-50">エクスポート</Link>
            </nav>
          </div>
        )}

        {/* オーバーレイ（メニューが開いている時） */}
        {isMenuOpen && (
          <div
            className="md:hidden fixed inset-0 bg-gray-500 bg-opacity-10 z-40"
            onClick={closeMenu}
          ></div>
        )}
      </div>

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
