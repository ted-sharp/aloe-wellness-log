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
    <div className="bg-gray-50 min-h-screen">
      <Router>
        <div className="relative">
          {/* デスクトップ用ナビゲーション */}
          <nav className="hidden md:flex gap-6 mb-12 p-6 bg-white rounded-lg shadow-lg mx-4 mt-4">
            <Link to="/" className="bg-slate-800 !text-white px-6 py-3 rounded-lg shadow-lg hover:bg-slate-900 transition-colors duration-200 font-bold text-lg border-2 border-slate-800 hover:border-slate-900 hover:!text-white visited:!text-white active:!text-white">記録入力</Link>
            <Link to="/list" className="bg-slate-700 !text-white px-6 py-3 rounded-lg shadow-lg hover:bg-slate-800 transition-colors duration-200 font-bold text-lg border-2 border-slate-700 hover:border-slate-800 hover:!text-white visited:!text-white active:!text-white">記録一覧</Link>
            <Link to="/graph" className="bg-slate-700 !text-white px-6 py-3 rounded-lg shadow-lg hover:bg-slate-800 transition-colors duration-200 font-bold text-lg border-2 border-slate-700 hover:border-slate-800 hover:!text-white visited:!text-white active:!text-white">記録グラフ</Link>
            <Link to="/calendar" className="bg-slate-700 !text-white px-6 py-3 rounded-lg shadow-lg hover:bg-slate-800 transition-colors duration-200 font-bold text-lg border-2 border-slate-700 hover:border-slate-800 hover:!text-white visited:!text-white active:!text-white">記録カレンダー</Link>
            <Link to="/export" className="bg-orange-600 !text-white px-6 py-3 rounded-lg shadow-lg hover:bg-orange-700 transition-colors duration-200 font-bold text-lg border-2 border-orange-600 hover:border-orange-700 hover:!text-white visited:!text-white active:!text-white">管理</Link>
          </nav>

          {/* モバイル用ハンバーガーボタン */}
          <div className="md:hidden flex justify-end mb-4 p-4">
            <button
              onClick={toggleMenu}
              className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              aria-label="メニューを開く"
            >
              <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                <div className={`h-0.5 w-6 bg-gray-800 transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                <div className={`h-0.5 w-6 bg-gray-800 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></div>
                <div className={`h-0.5 w-6 bg-gray-800 transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
              </div>
            </button>
          </div>

          {/* モバイル用メニュー */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-4 right-4 bg-white rounded-lg shadow-lg z-50 mb-4">
              <nav className="flex flex-col">
                <Link to="/" onClick={closeMenu} className="px-6 py-4 !text-slate-800 font-bold text-lg hover:bg-slate-50 border-b border-gray-100 transition-colors duration-200 hover:!text-slate-800 visited:!text-slate-800 active:!text-slate-800">記録入力</Link>
                <Link to="/list" onClick={closeMenu} className="px-6 py-4 !text-slate-700 font-bold text-lg hover:bg-slate-50 border-b border-gray-100 transition-colors duration-200 hover:!text-slate-700 visited:!text-slate-700 active:!text-slate-700">記録一覧</Link>
                <Link to="/graph" onClick={closeMenu} className="px-6 py-4 !text-slate-700 font-bold text-lg hover:bg-slate-50 border-b border-gray-100 transition-colors duration-200 hover:!text-slate-700 visited:!text-slate-700 active:!text-slate-700">記録グラフ</Link>
                <Link to="/calendar" onClick={closeMenu} className="px-6 py-4 !text-slate-700 font-bold text-lg hover:bg-slate-50 border-b border-gray-100 transition-colors duration-200 hover:!text-slate-700 visited:!text-slate-700 active:!text-slate-700">記録カレンダー</Link>
                <Link to="/export" onClick={closeMenu} className="px-6 py-4 !text-orange-600 font-bold text-lg hover:bg-orange-50 transition-colors duration-200 hover:!text-orange-600 visited:!text-orange-600 active:!text-orange-600">管理</Link>
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

        <div className="px-4">
          <Routes>
            <Route path="/" element={<RecordInput />} />
            <Route path="/list" element={<RecordList />} />
            <Route path="/graph" element={<RecordGraph />} />
            <Route path="/calendar" element={<RecordCalendar />} />
            <Route path="/export" element={<RecordExport />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </div>
  );
}

export default App;
