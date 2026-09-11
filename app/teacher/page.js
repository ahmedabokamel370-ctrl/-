'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TeacherPage() {
  const DEFAULT_PASSWORD = '123456';
  const [currentPassword, setCurrentPassword] = useState(DEFAULT_PASSWORD);
  const [inputPassword, setInputPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showChangePass, setShowChangePass] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [savedExams, setSavedExams] = useState([]);
  const [selectedPin, setSelectedPin] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');

  // إعدادات الامتحان والأسئلة
  const [pin, setPin] = useState('1234');
  const [title, setTitle] = useState('اختبار جديد');
  const [duration, setDuration] = useState(10);
  const [questionCount, setQuestionCount] = useState(5);
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [scores, setScores] = useState([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPass = localStorage.getItem('teacher_password');
      setCurrentPassword(savedPass || DEFAULT_PASSWORD);
      const savedApiKey = localStorage.getItem('user_gemini_api_key');
      if (savedApiKey) setCustomApiKey(savedApiKey);
    }
  }, []);

  const handleApiKeyChange = (e) => {
    const val = e.target.value;
    setCustomApiKey(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_gemini_api_key', val);
    }
  };

  const refreshData = () => {
    if (typeof window === 'undefined') return;
    const examsList = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('exam_') && key !== 'exam_scores') {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          const examPin = key.replace('exam_', '');
          examsList.push({ pin: examPin, ...data });
        } catch (e) {
          console.error(e);
        }
      }
    }
    setSavedExams(examsList);
    const storedScores = JSON.parse(localStorage.getItem('exam_scores') || '[]');
    setScores(storedScores);
  };

  useEffect(() => {
    if (isAuthenticated) refreshData();
  }, [isAuthenticated, activeTab]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (inputPassword.trim() === currentPassword.trim()) {
      setIsAuthenticated(true);
      setInputPassword('');
    } else {
      alert('كلمة المرور غير صحيحة!');
    }
  };

  const handleResetPassword = () => {
    if (confirm('هل تريد إعادة ضبط كلمة المرور للوضع الافتراضي؟')) {
      localStorage.removeItem('teacher_password');
      setCurrentPassword(DEFAULT_PASSWORD);
      alert('تمت إعادة الضبط بنجاح');
    }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!newPasswordInput.trim()) return alert('أدخل كلمة مرور صالحة');
    const cleanPass = newPasswordInput.trim();
    localStorage.setItem('teacher_password', cleanPass);
    setCurrentPassword(cleanPass);
    setNewPasswordInput('');
    setShowChangePass(false);
    alert('تم حفظ كلمة المرور الجديدة بنجاح');
  };

  const handleResetScores = () => {
    if (confirm('هل أنت تأكد من إعادة ضبط ومسح جميع نتائج الطلاب والأوائل؟')) {
      localStorage.removeItem('exam_scores');
      setScores([]);
      alert('تم مسح وإعادة ضبط قائمة الأوائل بنجاح');
    }
  };

  const handleSelectExam = (selectedExamPin) => {
    setSelectedPin(selectedExamPin);
    if (!selectedExamPin) return;
    const found = savedExams.find((e) => e.pin === selectedExamPin);
    if (found) {
      setPin(found.pin);
      setTitle(found.title || 'بدون عنوان');
      setDuration(found.duration || 10);
      setQuestions(found.questions || []);
    }
  };

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !file) {
      return alert('يرجى كتابة نص أو إرفاق ملف أولاً');
    }
    setLoading(true);
    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      formData.append('prompt', prompt.trim());
      formData.append('count', questionCount);
      if (customApiKey.trim()) formData.append('customApiKey', customApiKey.trim());

      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      const resText = await res.text();
      let data = {};
      try {
        data = JSON.parse(resText);
      } catch (e) {
        throw new Error('فشل معالجة استجابة الخادم. يرجى التأكد من الكود أو المفتاح المستخدم.');
      }

      if (res.ok && data.questions) {
        const formattedQuestions = data.questions.map((q) => ({
          text: q.question || q.text || '',
          options: q.options || ['', '', '', ''],
          correctOption:
            typeof q.correctAnswer === 'number'
              ? q.correctAnswer
              : q.correctOption || 0,
        }));
        setQuestions(formattedQuestions);
        if (data.title && (!title || title === 'اختبار جديد')) {
          setTitle(data.title);
        }
        if (data.usingCustomKey) {
          alert('🔑 تم التوليد بنجاح باستخدام مفتاح API الخاص بك!');
        } else {
          alert('🌐 تم التوليد بنجاح بالذكاء الاصطناعي!');
        }
      } else {
        alert(data.error || 'حدث خطأ أثناء التوليد');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: 'سؤال جديد...',
        options: ['خيار 1', 'خيار 2', 'خيار 3', 'خيار 4'],
        correctOption: 0,
      },
    ]);
  };

  const handleDeleteQuestion = (idx) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handlePublish = () => {
    if (questions.length === 0) return alert('لا توجد أسئلة لنشرها!');
    if (!pin.trim()) return alert('يرجى تحديد PIN للامتحان');
    const examData = { title, duration: Number(duration), questions };
    localStorage.setItem(`exam_${pin.trim()}`, JSON.stringify(examData));
    refreshData();
    setSelectedPin(pin.trim());
    alert(`تم حفظ ونشر الامتحان بنجاح تحت الـ PIN: ${pin.trim()}`);
  };

  const handleDeleteExam = (targetPin = pin) => {
    if (confirm(`هل تريد حذف الامتحان PIN: ${targetPin}؟`)) {
      localStorage.removeItem(`exam_${targetPin}`);
      refreshData();
      if (selectedPin === targetPin) {
        setSelectedPin('');
        setQuestions([]);
      }
      alert('تم حذف الامتحان.');
    }
  };

  const filteredScores = selectedPin
    ? scores.filter((s) => String(s.pin) === String(selectedPin))
    : scores;

  // استخراج وحساب الأخطاء الشائعة للطلاب في الامتحان المحدد
  const getCommonMistakes = () => {
    const currentExam = savedExams.find((e) => String(e.pin) === String(selectedPin));
    const examQuestions = currentExam?.questions || questions;

    if (!examQuestions || examQuestions.length === 0) return [];

    const errorCounts = {};

    filteredScores.forEach((score) => {
      const wrongList = score.wrongQuestions || score.wrongIndices || score.incorrectAnswers || [];
      wrongList.forEach((qIdx) => {
        if (typeof qIdx === 'number') {
          errorCounts[qIdx] = (errorCounts[qIdx] || 0) + 1;
        } else if (typeof qIdx === 'object' && qIdx.index !== undefined) {
          errorCounts[qIdx.index] = (errorCounts[qIdx.index] || 0) + 1;
        }
      });
    });

    const totalStudents = filteredScores.length;

    return examQuestions
      .map((q, idx) => {
        const count = errorCounts[idx] || 0;
        const percentage = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
        return {
          questionText: q.text || `سؤال #${idx + 1}`,
          wrongCount: count,
          percentage: percentage,
          correctAnswer: q.options ? q.options[q.correctOption] : '',
        };
      })
      .filter((item) => item.wrongCount > 0)
      .sort((a, b) => b.wrongCount - a.wrongCount);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-between p-4 font-sans" dir="rtl">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md bg-[#131B2E] p-8 rounded-2xl border border-gray-800 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto text-2xl border border-blue-500/30">
              🔒
            </div>
            <div>
              <h1 className="text-2xl font-bold">تسجيل دخول المعلم</h1>
              <p className="text-gray-400 text-xs mt-1">يرجى إدخال كلمة المرور للمتابعة</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                placeholder="أدخل كلمة المرور"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                className="w-full p-3 bg-[#0B0F19] border border-gray-700 rounded-xl text-center text-white focus:outline-none font-mono"
                required
              />
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl text-sm transition shadow-lg shadow-blue-600/30"
              >
                دخول اللوحة
              </button>
            </form>
            <div className="flex justify-between items-center text-xs text-gray-400 pt-2 border-t border-gray-800">
              <Link href="/" className="hover:text-blue-400 font-semibold transition">
                🏠 الصفحة الرئيسية
              </Link>
              <button onClick={handleResetPassword} className="hover:text-amber-400 underline">
                🔄 إعادة ضبط كلمة المرور
              </button>
            </div>
          </div>
        </div>
        <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-800/50 mt-6 space-y-1">
          <p>تحت إشراف: <span className="text-gray-200 font-bold">مستر أشرف كامل</span></p>
          <p>إعداد وتصميم: <span className="text-blue-400 font-bold">أحمد أشرف كامل</span></p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-4 md:p-8 font-sans flex flex-col justify-between" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6 w-full">
        {/* الهيدر الرئيسي */}
        <header className="flex flex-wrap items-center justify-between bg-[#131B2E] p-4 md:p-6 rounded-2xl border border-gray-800 gap-4 shadow-xl">
          <div>
            <h1 className="text-xl font-bold">⚙️ لوحة المعلم المركزية</h1>
            <p className="text-xs text-gray-400 mt-1">إعداد الأسئلة ومتابعة النتائج</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 relative">
            <Link
              href="/"
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl border border-gray-700 transition"
            >
              🏠 الصفحة الرئيسية
            </Link>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3 py-2 rounded-xl text-xs font-bold ${
                activeTab === 'create' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              📝 الامتحانات
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-2 rounded-xl text-xs font-bold ${
                activeTab === 'analytics' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              🏆 الأوائل
            </button>
            <button
              onClick={() => setShowChangePass(!showChangePass)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-gray-200 text-xs font-semibold rounded-xl"
            >
              🔑 تغيير الباسوورد
            </button>
            {showChangePass && (
              <div className="absolute top-12 left-0 w-72 bg-[#131B2E] border border-gray-700 p-4 rounded-2xl shadow-2xl z-50 space-y-3">
                <h3 className="text-xs font-bold">تغيير كلمة المرور</h3>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <input
                    type="password"
                    placeholder="كلمة المرور الجديدة"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full p-2 bg-[#0B0F19] border border-gray-700 rounded-xl text-xs text-white"
                    required
                  />
                  <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold rounded-xl">
                    حفظ
                  </button>
                </form>
              </div>
            )}
            <button
              onClick={() => setIsAuthenticated(false)}
              className="px-3 py-2 bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-semibold rounded-xl"
            >
              خروج
            </button>
          </div>
        </header>

        {/* شريط اختيار الامتحانات السابقة */}
        <div className="bg-[#131B2E] p-4 rounded-2xl border border-gray-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[280px]">
            <label className="block text-xs text-gray-400 mb-1 font-bold">اختر امتحاناً سابقاً لعرضه أو تعديله:</label>
            <select
              value={selectedPin}
              onChange={(e) => handleSelectExam(e.target.value)}
              className="w-full p-2.5 bg-[#0B0F19] border border-blue-500/40 rounded-xl text-white text-sm font-bold focus:outline-none"
            >
              <option value="">-- اختر امتحاناً ({savedExams.length} امتحانات) --</option>
              {savedExams.map((exam) => (
                <option key={exam.pin} value={exam.pin}>
                  📌 {exam.title} (PIN: {exam.pin}) - {exam.questions?.length || 0} سؤال - {exam.duration || 10} دقيقة
                </option>
              ))}
            </select>
          </div>
          {selectedPin && (
            <button
              onClick={() => handleDeleteExam(selectedPin)}
              className="px-4 py-2.5 bg-red-600/20 text-red-400 border border-red-500/30 font-bold rounded-xl text-xs"
            >
              🗑️ حذف الامتحان
            </button>
          )}
        </div>

        {activeTab === 'create' ? (
          <>
            {/* مولد الأسئلة الذكي والإعدادات */}
            <div className="bg-[#131B2E] p-6 rounded-2xl border border-gray-800 space-y-4">
              <h2 className="text-lg font-bold text-blue-400">🤖 مولد الأسئلة والإعدادات السريعة</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0B0F19] p-4 rounded-xl border border-gray-800">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-bold">🔢 عدد الأسئلة المطلوبة (AI)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value)}
                    className="w-full p-2.5 bg-[#131B2E] border border-gray-700 rounded-xl text-emerald-400 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-bold">⏱️ وقت الامتحان بالدقائق</label>
                  <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full p-2.5 bg-[#131B2E] border border-gray-700 rounded-xl text-amber-400 font-bold text-sm"
                  />
                </div>
              </div>

              {/* مفتاح API مخصص */}
              <div className="bg-[#0B0F19] p-4 rounded-xl border border-gray-800 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-300">🔑 مفتاح API خاص (Gemini / Groq)</label>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      customApiKey.trim()
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}
                  >
                    {customApiKey.trim() ? '✓ مفتاح مخصص مفعل' : '🌐 المفتاح الافتراضي'}
                  </span>
                </div>
                <input
                  type="password"
                  placeholder="أدخل مفتاح API الخاص بك (اختياري)"
                  value={customApiKey}
                  onChange={handleApiKeyChange}
                  className="w-full p-2.5 bg-[#131B2E] border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">📁 رفع ملف PDF / TXT</label>
                  <input
                    type="file"
                    accept=".txt,.pdf"
                    onChange={handleFileUpload}
                    className="w-full p-2 bg-[#0B0F19] border border-gray-700 rounded-xl text-xs text-gray-300"
                  />
                  {fileName && <p className="text-xs text-emerald-400 mt-1">تم إرفاق: {fileName}</p>}
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">✍️ البرومبت (Prompt)</label>
                  <input
                    type="text"
                    placeholder="مثال: أسئلة اختيار من متعدد عن قواعد اللغة الإنجليزية"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full p-2.5 bg-[#0B0F19] border border-gray-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 font-bold rounded-xl transition text-sm disabled:opacity-50"
              >
                {loading ? 'جاري توليد الأسئلة...' : '✨ توليد الأسئلة بالذكاء الاصطناعي'}
              </button>
            </div>

            {/* إعدادات وتعديل الأسئلة */}
            <div className="bg-[#131B2E] p-6 rounded-2xl border border-gray-800 space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-4 border-b border-gray-800 pb-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-gray-400 mb-1">عنوان الامتحان:</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2 bg-[#0B0F19] border border-gray-700 rounded-xl font-bold text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">PIN الامتحان:</label>
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="p-2 bg-[#0B0F19] border border-gray-700 rounded-xl text-center w-28 font-bold text-blue-400"
                  />
                </div>
                <div className="bg-[#0B0F19] px-4 py-2 rounded-xl border border-gray-700 text-center">
                  <span className="block text-xs text-gray-400">إجمالي الأسئلة</span>
                  <span className="text-lg font-bold text-emerald-400">{questions.length} أسئلة</span>
                </div>
              </div>

              {/* قائمة الأسئلة */}
              <div className="space-y-4">
                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-4 bg-[#0B0F19] rounded-xl border border-gray-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-blue-400 font-bold">سؤال #{qIdx + 1}</span>
                      <button
                        onClick={() => handleDeleteQuestion(qIdx)}
                        className="text-xs bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-lg"
                      >
                        🗑️ حذف
                      </button>
                    </div>
                    <input
                      type="text"
                      value={q.text}
                      onChange={(e) => {
                        const newQ = [...questions];
                        newQ[qIdx] = { ...newQ[qIdx], text: e.target.value };
                        setQuestions(newQ);
                      }}
                      className="w-full p-2 bg-[#131B2E] border border-gray-700 rounded-lg text-sm text-white font-semibold"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={q.correctOption === oIdx}
                            onChange={() => {
                              const newQ = [...questions];
                              newQ[qIdx] = { ...newQ[qIdx], correctOption: oIdx };
                              setQuestions(newQ);
                            }}
                            className="accent-green-500"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newQ = [...questions];
                              const newOptions = [...newQ[qIdx].options];
                              newOptions[oIdx] = e.target.value;
                              newQ[qIdx] = { ...newQ[qIdx], options: newOptions };
                              setQuestions(newQ);
                            }}
                            className="w-full p-2 bg-[#131B2E] border border-gray-700 rounded-lg text-xs text-gray-300"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleAddQuestion}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 font-bold rounded-xl text-sm border border-gray-700"
                >
                  ➕ إضافة سؤال يدوي
                </button>
                <button
                  onClick={handlePublish}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 font-bold rounded-xl text-sm"
                >
                  💾 حفظ ونشر الامتحان
                </button>
              </div>
            </div>
          </>
        ) : (
          /* تبويب قائمة الأوائل والنتائج والأخطاء الشائعة */
          <div className="bg-[#131B2E] p-6 rounded-2xl border border-gray-800 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-3">
              <h2 className="text-lg font-bold text-amber-400">🏆 نتائج وأوائل الطلاب</h2>
              <button
                onClick={handleResetScores}
                className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold rounded-xl text-xs transition"
              >
                🔄 مسح النتائج / ريزيت للأوائل
              </button>
            </div>

            {/* قسم تحليل الأخطاء الشائعة */}
            <div className="bg-[#0B0F19] p-4 rounded-xl border border-gray-800 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <h3 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                  ⚠️ الأخطاء الشائعة للطلاب {selectedPin ? `(PIN: ${selectedPin})` : ''}
                </h3>
                <span className="text-[11px] text-gray-400">
                  إجمالي الاختبارات المقدمة: {filteredScores.length}
                </span>
              </div>

              {(() => {
                const mistakes = getCommonMistakes();
                if (filteredScores.length === 0) {
                  return <p className="text-xs text-gray-500 text-center py-2">لا توجد نتائج طلاب لعرض الأخطاء الشائعة.</p>;
                }
                if (mistakes.length === 0) {
                  return (
                    <p className="text-xs text-emerald-400 text-center py-2 font-semibold">
                      🎉 ممتاز! لا توجد أخطاء شائعة متكررة مسجلة لهذا الامتحان حتى الآن.
                    </p>
                  );
                }
                return (
                  <div className="space-y-2.5">
                    {mistakes.map((m, idx) => (
                      <div key={idx} className="p-3 bg-[#131B2E] rounded-xl border border-red-500/20 space-y-1.5">
                        <div className="flex justify-between items-center text-xs gap-2">
                          <span className="font-semibold text-white">❓ {m.questionText}</span>
                          <span className="text-red-400 font-bold bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/30 text-[11px] shrink-0">
                            أخطأ فيه {m.wrongCount} طلاب ({m.percentage}%)
                          </span>
                        </div>
                        {m.correctAnswer && (
                          <p className="text-[11px] text-emerald-400 font-medium">
                            ✓ الإجابة الصحيحة: {m.correctAnswer}
                          </p>
                        )}
                        <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-red-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${m.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* جدول النتائج */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm text-gray-300">
                <thead className="bg-[#0B0F19] text-gray-400 text-xs">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">اسم الطالب</th>
                    <th className="p-3">الرمز PIN</th>
                    <th className="p-3">الدرجة</th>
                    <th className="p-3">الوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredScores.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-4 text-center text-gray-500">
                        لا توجد نتائج مسجلة حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    filteredScores.map((s, i) => (
                      <tr key={i}>
                        <td className="p-3 font-bold text-amber-400">{i + 1}</td>
                        <td className="p-3 text-white font-semibold">{s.name}</td>
                        <td className="p-3 font-mono text-blue-400">{s.pin || '-'}</td>
                        <td className="p-3 text-emerald-400 font-bold">
                          {s.score} / {s.total}
                        </td>
                        <td className="p-3 font-mono text-gray-400">{s.time}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-800/50 mt-8 space-y-1">
        <p>تحت إشراف: <span className="text-gray-200 font-bold">مستر أشرف كامل</span></p>
        <p>إعداد وتصميم: <span className="text-blue-400 font-bold">أحمد أشرف كامل</span></p>
      </footer>
    </div>
  );
}