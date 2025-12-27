
import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Camera, 
  History, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  ArrowLeft,
  MessageSquare,
  Share2,
  Loader2,
  Heart,
  CheckCircle2,
  AlertCircle,
  X,
  Quote,
  ShieldCheck
} from 'lucide-react';
import { AppView, DailyEntry } from './types';
import * as db from './db';
import { generateMonthlySummary } from './geminiService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.CALENDAR);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState<string | null>(null);
  const [tempCaption, setTempCaption] = useState("");
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDataInfo, setShowDataInfo] = useState(false);
  
  const isDeletingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const all = await db.getAllEntries();
        setEntries(all.sort((a, b) => b.date.localeCompare(a.date)));
      } catch (err) {
        showToast("加载数据失败", "error");
      }
    };
    loadEntries();
  }, []);

  useEffect(() => {
    const entry = entries.find(e => e.date === selectedDate);
    setTempCaption(entry?.caption || "");
  }, [selectedDate, entries]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleSavePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const newEntry: DailyEntry = {
          date: selectedDate,
          imageUrl: base64,
          caption: tempCaption
        };
        await db.saveEntry(newEntry);
        updateLocalEntries(newEntry);
        showToast("这一瞬，已成永恒");
      } catch (err) {
        showToast("定格失败", "error");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateCaption = async () => {
    if (isDeletingRef.current) return;
    const existing = entries.find(e => e.date === selectedDate);
    if (!existing && !tempCaption) return;
    
    try {
      const updated: DailyEntry = existing 
        ? { ...existing, caption: tempCaption }
        : { date: selectedDate, imageUrl: "", caption: tempCaption };
      
      if (updated.imageUrl || updated.caption) {
        await db.saveEntry(updated);
        updateLocalEntries(updated);
      }
    } catch (err) {
      console.error("Auto-save failed", err);
    }
  };

  const updateLocalEntries = (entry: DailyEntry) => {
    setEntries(prev => {
      const filtered = prev.filter(item => item.date !== entry.date);
      return [entry, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
    });
  };

  const confirmDelete = async () => {
    isDeletingRef.current = true;
    try {
      await db.deleteEntry(selectedDate);
      setEntries(prev => prev.filter(item => item.date !== selectedDate));
      showToast("回忆已淡去");
      setShowDeleteConfirm(false);
      setCurrentView(AppView.CALENDAR);
    } catch (err) {
      showToast("删除失败", "error");
    } finally {
      setTimeout(() => { isDeletingRef.current = false; }, 500);
    }
  };

  const generateSummary = async () => {
    const monthStr = currentMonth.toISOString().slice(0, 7);
    const monthEntries = entries.filter(e => e.date.startsWith(monthStr) && e.imageUrl);
    
    if (monthEntries.length === 0) {
      showToast("本月尚无记录", "error");
      return;
    }

    setIsSummarizing(true);
    const monthName = currentMonth.toLocaleString('zh-CN', { month: 'long', year: 'numeric' });
    const summary = await generateMonthlySummary(monthEntries, monthName);
    setMonthlySummary(summary ?? "未能生成总结，请稍后再试。");
    setIsSummarizing(false);
    setCurrentView(AppView.SUMMARY);
  };

  const changeMonth = (offset: number) => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(next);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-start-${i}`} className="aspect-[2/3] bg-gray-50/10 rounded-md"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const entry = entries.find(e => e.date === dateStr);
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <div 
          key={dateStr}
          onClick={() => {
            setSelectedDate(dateStr);
            setCurrentView(AppView.TODAY);
          }}
          className={`aspect-[2/3] relative cursor-pointer active:scale-90 transition-all duration-300 rounded-md overflow-hidden shadow-sm ${isToday ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
        >
          {entry?.imageUrl ? (
            <img src={entry.imageUrl} alt={dateStr} className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-500" />
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center ${isToday ? 'bg-indigo-50' : 'bg-white border border-gray-50'}`}>
              <span className={`text-[10px] font-bold ${isToday ? 'text-indigo-600' : 'text-gray-300'}`}>{d}</span>
              {entry?.caption && <div className="w-1 h-1 bg-indigo-200 rounded-full mt-1 animate-pulse"></div>}
            </div>
          )}
          {entry?.imageUrl && (
            <span className="absolute top-1 left-1.5 text-[8px] font-black text-white drop-shadow-md">{d}</span>
          )}
        </div>
      );
    }

    const totalSlots = days.length;
    const remainingSlots = (7 - (totalSlots % 7)) % 7;
    for (let i = 0; i < remainingSlots; i++) {
      days.push(<div key={`empty-end-${i}`} className="aspect-[2/3] bg-gray-50/10 rounded-md"></div>);
    }

    return (
      <div className="grid grid-cols-7 gap-1 animate-in fade-in zoom-in-95 duration-700">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
          <div key={day} className="h-6 flex items-center justify-center text-[9px] font-black text-gray-300 tracking-widest">
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  const currentMonthStr = currentMonth.toISOString().slice(0, 7);
  const monthLoggedCount = entries.filter(e => e.date.startsWith(currentMonthStr) && e.imageUrl).length;
  const daysInThisMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const coverageRatio = monthLoggedCount / daysInThisMonth;
  const dashArray = 150.8; 
  const dashOffset = dashArray * (1 - coverageRatio);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#FCFCFC] overflow-hidden shadow-2xl relative">
      
      {/* Modal: Data Privacy Info */}
      {showDataInfo && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/5 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full bg-white rounded-[3rem] p-10 shadow-deep border border-gray-100 relative">
              <button onClick={() => setShowDataInfo(false)} className="absolute top-6 right-6 p-2 text-gray-300"><X className="w-5 h-5"/></button>
              <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">隐私与存储说明</h3>
              <div className="text-left space-y-4 text-xs text-gray-500 leading-relaxed font-diary">
                <p>• 你的所有照片和文字仅存储在**当前手机本地**，不会上传到任何服务器。</p>
                <p>• 即使开发者也无法查看你的内容。这意味着你的隐私得到了 100% 的保护。</p>
                <p>• ⚠️ 注意：清除浏览器缓存或更换手机会导致数据丢失。建议定期通过“月度总结”导出保存你的珍贵回忆。</p>
              </div>
              <button 
                onClick={() => setShowDataInfo(false)}
                className="w-full mt-8 py-4 bg-gray-900 text-white rounded-full text-xs font-bold active:scale-95 transition-all"
              >
                我知道了
              </button>
           </div>
        </div>
      )}

      {/* Modal: Delete */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/5 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full bg-white rounded-[3rem] p-10 shadow-deep text-center border border-gray-100">
              <div className="w-14 h-14 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">移除回忆？</h3>
              <p className="text-sm text-gray-400 mb-8 px-4 leading-relaxed font-diary">时光无法倒流，移除后的记录将不再归还。</p>
              <div className="flex flex-col gap-3">
                 <button 
                   onClick={confirmDelete}
                   className="w-full py-4 bg-gray-900 text-white rounded-full text-xs font-bold active:scale-95 transition-all"
                 >
                   确认移除
                 </button>
                 <button 
                   onClick={() => setShowDeleteConfirm(false)}
                   className="w-full py-4 text-gray-400 text-xs font-bold active:scale-95 transition-all"
                 >
                   留着吧
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 duration-500">
          <div className={`flex items-center gap-3 px-6 py-2.5 rounded-full shadow-deep text-white text-[10px] font-black tracking-widest uppercase ${toast.type === 'success' ? 'bg-indigo-600' : 'bg-red-500'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {toast.message}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-4 pt-10 pb-4 flex items-center justify-between z-20 sticky top-0 bg-[#FCFCFC]/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
           {(currentView === AppView.TODAY || currentView === AppView.SUMMARY) && (
             <button onClick={() => setCurrentView(AppView.CALENDAR)} className="p-2 -ml-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
               <ArrowLeft className="w-5 h-5" />
             </button>
           )}
           <div onClick={() => setShowDataInfo(true)} className="cursor-help">
            <h1 className="text-xl font-bold tracking-tighter text-gray-900 flex items-center gap-1.5">
              {currentView === AppView.CALENDAR ? 'Lens.' : 
               currentView === AppView.HISTORY ? 'Timeline.' : 
               currentView === AppView.SUMMARY ? 'Reflection.' : 'Today.'}
              {currentView === AppView.CALENDAR && <ShieldCheck className="w-3 h-3 text-indigo-300" />}
            </h1>
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-[0.3em]">Memories in Motion</p>
           </div>
        </div>
        
        {currentView === AppView.CALENDAR && (
          <button 
            onClick={generateSummary}
            disabled={isSummarizing}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest disabled:opacity-20 active:scale-95 transition-all shadow-lg"
          >
            {isSummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Review
          </button>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto hide-scrollbar pb-28">
        {currentView === AppView.CALENDAR && (
          <div className="px-4 space-y-6">
            <div className="flex items-center justify-between py-4">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                {currentMonth.toLocaleString('zh-CN', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-1">
                <button onClick={() => changeMonth(-1)} className="p-2 text-gray-300 hover:text-gray-900 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => changeMonth(1)} className="p-2 text-gray-300 hover:text-gray-900 transition-colors"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
            
            <div className="px-0">
              {renderCalendar()}
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-soft border border-gray-50 flex items-center justify-between group overflow-hidden relative mb-8">
               <div>
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Month Coverage</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {monthLoggedCount}
                    <span className="text-xs font-normal text-gray-300 ml-2 italic">Captured</span>
                  </p>
               </div>
               
               <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg viewBox="0 0 56 56" className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="#f8fafc" strokeWidth="3" />
                    <circle 
                      cx="28" cy="28" r="24" fill="none" 
                      stroke="url(#stats-gradient)" strokeWidth="3" 
                      strokeDasharray={dashArray}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-in-out"
                    />
                    <defs>
                      <linearGradient id="stats-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="relative z-10 flex items-center justify-center w-full h-full transition-all duration-500 group-hover:scale-110">
                    <Heart className={`w-4 h-4 transition-all duration-700 ${monthLoggedCount > 0 ? 'text-indigo-500 fill-indigo-500' : 'text-gray-200'}`} />
                  </div>
               </div>
            </div>

            {/* Hint for Friends */}
            <p className="text-[9px] text-center text-gray-300 font-black uppercase tracking-[0.2em] pb-4">
              Tip: Add to Home Screen for the best experience
            </p>
          </div>
        )}

        {currentView === AppView.TODAY && (
          <div className="px-4 py-4 space-y-10 animate-in slide-in-from-right duration-500">
            <div className="relative aspect-[3/4] bg-white rounded-[2rem] p-4 shadow-deep border border-gray-100">
              {entries.find(e => e.date === selectedDate)?.imageUrl ? (
                <div className="w-full h-full relative rounded-xl overflow-hidden group">
                  <img 
                    src={entries.find(e => e.date === selectedDate)?.imageUrl} 
                    className="w-full h-full object-cover grayscale-[0.1]" 
                    alt="Day"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="absolute top-4 right-4 p-3 bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 duration-300"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-6 left-6 text-white pointer-events-none">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-70">{selectedDate}</p>
                    <p className="text-xl font-bold font-diary">Moment Captured.</p>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center h-full gap-8 p-12 text-center group">
                  <div className="p-10 bg-gray-50 rounded-full text-gray-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all duration-500">
                    <Camera className="w-12 h-12 stroke-[1.5]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">记录这一刻</h3>
                    <p className="text-[10px] text-gray-400 mt-2 font-black uppercase tracking-widest">A blank page for your life</p>
                  </div>
                  <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleSavePhoto} />
                </label>
              )}
            </div>

            <div className="space-y-4 px-2">
               <div className="flex items-center gap-3 text-gray-900 font-black text-[10px] uppercase tracking-widest">
                 <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                 <h3>Journal</h3>
               </div>
               <textarea 
                 value={tempCaption}
                 onChange={(e) => setTempCaption(e.target.value)}
                 onBlur={handleUpdateCaption}
                 placeholder="此刻的心境是怎样的？"
                 className="w-full min-h-[200px] p-8 bg-white rounded-[2rem] border border-gray-100 shadow-soft focus:ring-0 resize-none text-xl leading-[1.7] placeholder:text-gray-200 transition-all font-diary"
               />
            </div>
          </div>
        )}

        {currentView === AppView.HISTORY && (
          <div className="px-4 space-y-12 py-6 animate-in fade-in duration-700">
            {entries.filter(e => e.imageUrl).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <History className="w-6 h-6 text-gray-200" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">岁月静好，暂无足迹</p>
              </div>
            ) : (
              <div className="space-y-16">
                {entries.filter(e => e.imageUrl).map((entry, idx) => (
                  <div key={idx} className="group cursor-pointer" onClick={() => { setSelectedDate(entry.date); setCurrentView(AppView.TODAY); }}>
                    <div className="flex items-end justify-between mb-4">
                        <p className="text-[10px] font-black text-gray-400 tracking-[0.3em] uppercase">{entry.date.replace(/-/g, ' . ')}</p>
                        <ArrowLeft className="w-4 h-4 text-gray-200 rotate-180 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <div className="bg-white p-2 rounded-[2rem] shadow-soft border border-gray-50 overflow-hidden">
                        <img src={entry.imageUrl} className="w-full h-72 object-cover rounded-[1.5rem] grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700" loading="lazy" />
                        {entry.caption && (
                          <div className="p-6">
                            <p className="text-xl text-gray-500 line-clamp-3 leading-[1.7] font-diary">“{entry.caption}”</p>
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === AppView.SUMMARY && (
          <div className="px-4 py-6 space-y-12 animate-in slide-in-from-bottom duration-1000">
            <div className="relative aspect-video rounded-[2.5rem] overflow-hidden flex items-center justify-center shadow-deep">
              <div className="absolute inset-0">
                <img 
                  src={entries.filter(e => e.date.startsWith(currentMonth.toISOString().slice(0, 7)) && e.imageUrl)[0]?.imageUrl} 
                  className="w-full h-full object-cover blur-md scale-110 opacity-60"
                />
                <div className="absolute inset-0 bg-white/20"></div>
              </div>
              <div className="relative text-center">
                <h2 className="text-5xl font-black text-gray-900 tracking-tighter mb-2">
                    {currentMonth.toLocaleString('zh-CN', { month: 'short' })}.
                </h2>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-600">Monthly Reflection</p>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] p-12 shadow-soft border border-gray-50 relative">
              <Quote className="absolute -top-6 -left-2 w-16 h-16 text-indigo-50" />
              <div className="relative">
                 <div className="prose prose-lg prose-indigo">
                    <p className="text-gray-800 text-2xl leading-[1.8] whitespace-pre-wrap font-diary first-letter:text-5xl first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:text-indigo-600">
                      {monthlySummary}
                    </p>
                 </div>
              </div>
            </div>
            
            <button 
              className="w-full py-6 bg-gray-900 text-white rounded-full font-black text-[10px] uppercase tracking-[0.3em] shadow-deep active:scale-95 transition-all flex items-center justify-center gap-4"
            >
              <Share2 className="w-4 h-4" />
              Spread the light
            </button>
          </div>
        )}
      </main>

      {/* Nav Bar */}
      <nav className="px-4 py-4.5 flex items-center justify-center gap-16 glass border-t border-gray-50 absolute bottom-0 left-0 right-0 z-30 pb-[env(safe-area-inset-bottom)]">
        <button 
          onClick={() => setCurrentView(AppView.CALENDAR)}
          className={`flex flex-col items-center gap-1 transition-all ${currentView === AppView.CALENDAR ? 'text-gray-900 scale-110' : 'text-gray-300 hover:text-gray-500'}`}
        >
          <CalendarIcon className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[7px] font-black uppercase tracking-widest">Days</span>
        </button>

        <button 
          onClick={() => {
            setSelectedDate(new Date().toISOString().split('T')[0]);
            setCurrentView(AppView.TODAY);
          }}
          className={`group -top-7 relative w-16 h-16 rounded-full shadow-xl shadow-indigo-100 active:scale-90 transition-all duration-500 overflow-hidden flex items-center justify-center flowing-bg`}
        >
          <Plus className="w-8 h-8 stroke-[3] text-white group-hover:rotate-180 transition-transform duration-700" />
        </button>

        <button 
          onClick={() => setCurrentView(AppView.HISTORY)}
          className={`flex flex-col items-center gap-1 transition-all ${currentView === AppView.HISTORY ? 'text-gray-900 scale-110' : 'text-gray-300 hover:text-gray-500'}`}
        >
          <History className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[7px] font-black uppercase tracking-widest">Film</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
