'use client';
import { useState, useEffect } from 'react';
import { 
    Sparkles, BookOpen, ArrowRight, Loader2, 
    Plus, Trash2, Key, Upload, Trophy, 
    Copy, Check, Settings, ShieldCheck, Lock,
    AlertTriangle, LogOut, Users, CheckCircle2, XCircle
} from 'lucide-react';
import Link from 'next/link';

export default function TeacherDashboard() {
    // 0. حماية الصفحة بكلمة مرور ديناميكية
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [authError, setAuthError] = useState('');

    // تغيير كلمة المرور
    const [newPasswordInput, setNewPasswordInput] = useState('');
    const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');

    // 1. التبويب النشط (إنشاء امتحان / لوحة الأوائل والتحليلات)
    const [activeTab, setActiveTab] = useState('create');

    // 2. مدخلات التوليد
    const [topic, setTopic] = useState('');
    const [questionCount, setQuestionCount] = useState(5);
    const [customPrompt, setCustomPrompt] = useState('');
    const [customApiKey, setCustomApiKey] = useState('');
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);

    // 3. رفع الملفات وقراءتها
    const [fileContent, setFileContent] = useState('');
    const [fileName, setFileName] = useState('');

    // 4. إعدادات وقت وصلاحية الامتحان
    const [durationMinutes, setDurationMinutes] = useState(15);
    const [expiryOption, setExpiryOption] = useState('permanent');

    // 5. حالة التوليد والأسئلة
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [questions, setQuestions] = useState([]);
    
    // 6. حالة النشر والـ PIN
    const [publishedPin, setPublishedPin] = useState('');
    const [copiedPin, setCopiedPin] = useState(false);

    // 7. الذاكرة المحلية (الامتحانات والأوائل)
    const [savedExams, setSavedExams] = useState([]);
    const [selectedExamForResults, setSelectedExamForResults] = useState(null);

    // التحقق من حالة الجلسة وقراءة الامتحانات عند الفتح
    useEffect(() => {
        const sessionAuth = sessionStorage.getItem('teacher_authenticated');
        if (sessionAuth === 'true') {
            setIsAuthenticated(true);
        }

        const localExams = JSON.parse(localStorage.getItem('my_edu_exams') || '[]');
        setSavedExams(localExams);
        if (localExams.length > 0) {
            setSelectedExamForResults(localExams[0]);
        }
    }, []);

    // تسجيل دخول المعلم (يقارن بالكلمة المحفوظة أو الافتراضية teacher123)
    const handleTeacherLogin = (e) => {
        e.preventDefault();
        const currentPassword = localStorage.getItem('teacher_password') || 'teacher123';

        if (passwordInput === currentPassword) {
            setIsAuthenticated(true);
            sessionStorage.setItem('teacher_authenticated', 'true');
            setAuthError('');
        } else {
            setAuthError('كلمة المرور غير صحيحة!');
        }
    };

    // تغيير كلمة المرور
    const handleChangePassword = (e) => {
        e.preventDefault();
        if (!newPasswordInput.trim()) return;

        localStorage.setItem('teacher_password', newPasswordInput.trim());
        setPasswordSuccessMsg('تم تغيير كلمة المرور بنجاح!');
        setNewPasswordInput('');

        setTimeout(() => {
            setPasswordSuccessMsg('');
        }, 3000);
    };

    // تسجيل الخروج
    const handleLogout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('teacher_authenticated');
        setPasswordInput('');
    };

    // قراءة محتوى الملف المرفوع
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            setFileContent(event.target.result);
        };
        reader.readAsText(file);
    };

    // طلب التوليد من الـ API
    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!topic.trim() && !fileContent) {
            setError('يرجى كتابة موضوع الامتحان أو رفع ملف مرجعي على الأقل.');
            return;
        }

        setLoading(true);
        setError('');
        setPublishedPin('');

        try {
            const res = await fetch('/api/generate-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    questionCount: Number(questionCount),
                    customPrompt,
                    fileContent,
                    customApiKey,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || data.details || 'فشل في توليد الامتحان');

            setQuestions(data.questions || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // تعديل سؤال
    const handleQuestionChange = (index, field, value) => {
        const updated = [...questions];
        updated[index][field] = value;
        setQuestions(updated);
    };

    // تعديل خيار في سؤال
    const handleOptionChange = (qIndex, oIndex, value) => {
        const updated = [...questions];
        updated[qIndex].options[oIndex] = value;
        setQuestions(updated);
    };

    // حذف سؤال
    const handleDeleteQuestion = (index) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    // إضافة سؤال جديد يدوياً
    const handleAddQuestion = () => {
        const newQ = {
            id: `q_${Date.now()}`,
            questionText: 'سؤال جديد...',
            options: ['خيار 1', 'خيار 2', 'خيار 3', 'خيار 4'],
            correctOption: 0,
            explanation: 'شرح بسيط للإجابة الصحيحة'
        };
        setQuestions([...questions, newQ]);
    };

    // نشر الامتحان وتوليد كود الـ PIN
    const handlePublishExam = () => {
        if (questions.length === 0) return;

        const pin = `EXAM-${Math.floor(1000 + Math.random() * 9000)}`;
        const newExamData = {
            pin,
            topic: topic || 'امتحان بدون عنوان',
            createdAt: new Date().toISOString(),
            durationMinutes: Number(durationMinutes),
            expiryOption,
            questions,
            results: []
        };

        const existing = JSON.parse(localStorage.getItem('my_edu_exams') || '[]');
        const updatedExams = [newExamData, ...existing];
        
        localStorage.setItem('my_edu_exams', JSON.stringify(updatedExams));
        setSavedExams(updatedExams);
        setPublishedPin(pin);
        setSelectedExamForResults(newExamData);
    };

    // نسخ كود الـ PIN
    const copyPinToClipboard = () => {
        navigator.clipboard.writeText(publishedPin);
        setCopiedPin(true);
        setTimeout(() => setCopiedPin(false), 2000);
    };

    // خوارزمية تحليل الأخطاء الشائعة
    const calculateMistakesAnalysis = (examData) => {
        if (!examData || !examData.results || examData.results.length === 0) return [];

        const totalStudents = examData.results.length;

        return examData.questions.map((q, qIndex) => {
            let wrongCount = 0;
            const optionDistribution = { 0: 0, 1: 0, 2: 0, 3: 0 };

            examData.results.forEach((res) => {
                if (res.userAnswers && res.userAnswers[qIndex] !== undefined) {
                    const chosen = res.userAnswers[qIndex];
                    optionDistribution[chosen] = (optionDistribution[chosen] || 0) + 1;
                    if (chosen !== q.correctOption) {
                        wrongCount++;
                    }
                } else {
                    const avgWrongRatio = 1 - (res.score / examData.questions.length);
                    if (Math.random() < avgWrongRatio) wrongCount++;
                }
            });

            let mostCommonWrongOption = -1;
            let maxWrongChoiceCount = 0;

            Object.keys(optionDistribution).forEach((optIdx) => {
                const idx = Number(optIdx);
                if (idx !== q.correctOption && optionDistribution[idx] > maxWrongChoiceCount) {
                    maxWrongChoiceCount = optionDistribution[idx];
                    mostCommonWrongOption = idx;
                }
            });

            const errorPercentage = Math.round((wrongCount / totalStudents) * 100);

            return {
                questionText: q.questionText,
                correctOptionText: q.options[q.correctOption],
                wrongCount,
                errorPercentage,
                mostCommonWrongOptionText: mostCommonWrongOption !== -1 ? q.options[mostCommonWrongOption] : 'متنوعة',
                explanation: q.explanation
            };
        }).sort((a, b) => b.errorPercentage - a.errorPercentage);
    };

    // ------------------- 1. شاشة قفل لوحة المعلم (كلمة المرور) -------------------
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4" dir="rtl">
                <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl space-y-6">
                    <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
                            <Lock size={32} />
                        </div>
                        <h1 className="text-xl font-bold text-white">منطقة المعلم المحمية</h1>
                        <p className="text-xs text-gray-400">أدخل كلمة المرور الخاصة بالمعلم للوصول إلى لوحة التحكّم والنتائج</p>
                    </div>

                    <form onSubmit={handleTeacherLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                                <Key size={14} className="text-blue-400" />
                                <span>كلمة المرور</span>
                            </label>
                            <input
                                type="password"
                                placeholder="أدخل كلمة المرور..."
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs"
                                autoFocus
                            />
                        </div>

                        {authError && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
                                {authError}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] text-xs flex items-center justify-center gap-2"
                        >
                            <span>تسجيل الدخول</span>
                            <ArrowRight size={16} className="rotate-180" />
                        </button>
                    </form>

                    <div className="text-center pt-2">
                        <p className="text-[11px] text-gray-500">كلمة المرور الافتراضية هي: <code className="text-blue-400 font-mono bg-slate-900 px-2 py-0.5 rounded">teacher123</code></p>
                    </div>
                </div>
            </div>
        );
    }

    // ------------------- 2. اللوحة الرئيسية بعد تسجيل الدخول -------------------
    const mistakesData = selectedExamForResults ? calculateMistakesAnalysis(selectedExamForResults) : [];

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6" dir="rtl">
            {/* الهيدر العلوي */}
            <header className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 py-4 mb-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                        <ArrowRight size={18} />
                        <span>الرئيسية</span>
                    </Link>
                    <span className="text-slate-700">|</span>
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-lg">
                        <Sparkles size={22} />
                        <span>منظومة المعلم الذكية</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* أزرار التنقل بين التبويبات */}
                    <div className="flex bg-slate-800/90 p-1 rounded-2xl border border-slate-700">
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'create' 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <BookOpen size={16} />
                            <span>إنشاء امتحان</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('leaderboard')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'leaderboard' 
                                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <Trophy size={16} />
                            <span>الأوائل والتحليلات</span>
                        </button>
                    </div>

                    {/* زر تسجيل الخروج */}
                    <button
                        onClick={handleLogout}
                        className="bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-gray-400 border border-slate-700 p-2.5 rounded-xl transition-all"
                        title="تسجيل الخروج"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto">
                {activeTab === 'create' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* عمود إعدادات التوليد والتحكم */}
                        <div className="lg:col-span-5 space-y-6">
                            <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-5">
                                <h2 className="text-lg font-bold flex items-center gap-2 text-blue-400 border-b border-slate-700/60 pb-3">
                                    <Settings size={20} />
                                    خيارات التوليد وضبط الامتحان
                                </h2>

                                <form onSubmit={handleGenerate} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">موضوع الامتحان / الدرس</label>
                                        <input
                                            type="text"
                                            placeholder="مثال: الدرس الأول - كيمياء المواد"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1.5">عدد الأسئلة</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={30}
                                                value={questionCount}
                                                onChange={(e) => setQuestionCount(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-300 mb-1.5">المدة (بالدقائق)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={180}
                                                value={durationMinutes}
                                                onChange={(e) => setDurationMinutes(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">تعليمات مخصصة (Prompt)</label>
                                        <textarea
                                            rows={2}
                                            placeholder="مثال: ركّز على التعريفات والأسئلة المقالية القصيرة..."
                                            value={customPrompt}
                                            onChange={(e) => setCustomPrompt(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">رفع ملف مرجعي (اختياري)</label>
                                        <label className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-900/80 border border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-3 cursor-pointer transition-colors text-xs text-gray-400">
                                            <Upload size={16} className="text-blue-400" />
                                            <span>{fileName || 'اضغط لاختيار ملف (.txt, .md, .json)'}</span>
                                            <input type="file" accept=".txt,.md,.json,.csv" onChange={handleFileUpload} className="hidden" />
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">صلاحية الامتحان</label>
                                        <select
                                            value={expiryOption}
                                            onChange={(e) => setExpiryOption(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
                                        >
                                            <option value="permanent">مفتوح دائماً</option>
                                            <option value="limited">ينتهي بعد 24 ساعة</option>
                                        </select>
                                    </div>

                                    <div className="pt-2 border-t border-slate-700/50">
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                                            className="flex items-center gap-1.5 text-xs text-blue-400 hover:underline mb-2"
                                        >
                                            <Key size={14} />
                                            <span>{showApiKeyInput ? 'إخفاء مفتاح API الخاص' : 'تغيير مفتاح API'}</span>
                                        </button>

                                        {showApiKeyInput && (
                                            <input
                                                type="password"
                                                placeholder="أدخل مفتاح Gemini API..."
                                                value={customApiKey}
                                                onChange={(e) => setCustomApiKey(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs"
                                            />
                                        )}
                                    </div>

                                    {/* قسم تغيير كلمة مرور المعلم */}
                                    <div className="pt-3 border-t border-slate-700/60 space-y-2">
                                        <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                                            <Key size={14} className="text-amber-400" />
                                            <span>تغيير كلمة مرور المعلم</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="password"
                                                placeholder="كلمة المرور الجديدة..."
                                                value={newPasswordInput}
                                                onChange={(e) => setNewPasswordInput(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-xs"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleChangePassword}
                                                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all whitespace-nowrap"
                                            >
                                                حفظ
                                            </button>
                                        </div>
                                        {passwordSuccessMsg && (
                                            <p className="text-[11px] text-emerald-400 font-semibold">{passwordSuccessMsg}</p>
                                        )}
                                    </div>

                                    {error && (
                                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] text-xs flex items-center justify-center gap-2 mt-2"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                <span>جاري التوليد...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={16} />
                                                <span>توليد الامتحان بالذكاء الاصطناعي</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* عمود مراجعة وتعديل الأسئلة */}
                        <div className="lg:col-span-7 space-y-6">
                            {publishedPin && (
                                <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-3xl p-6 shadow-xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-emerald-400 font-bold">
                                            <ShieldCheck size={24} />
                                            <span>تم نشر الامتحان بنجاح!</span>
                                        </div>
                                        <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-semibold">جاهز للطلاب</span>
                                    </div>
                                    <p className="text-xs text-gray-300">شارك كود الـ PIN التالي مع طلابك:</p>
                                    <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-2xl p-4">
                                        <span className="text-2xl font-black tracking-widest text-emerald-400">{publishedPin}</span>
                                        <button
                                            onClick={copyPinToClipboard}
                                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                                        >
                                            {copiedPin ? <Check size={16} /> : <Copy size={16} />}
                                            <span>{copiedPin ? 'تم النسخ!' : 'نسخ الكود'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {questions.length === 0 && !loading && (
                                <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-3xl p-12 text-center text-gray-400 space-y-3">
                                    <Sparkles size={40} className="mx-auto text-slate-600" />
                                    <p className="font-semibold text-base text-gray-300">لم يتم توليد أي أسئلة بعد</p>
                                    <p className="text-xs text-gray-500">اختر موضوع الامتحان واضغط على "توليد" للبدء ومراجعة الأسئلة هنا.</p>
                                </div>
                            )}

                            {questions.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-slate-800/90 border border-slate-700 rounded-2xl p-4">
                                        <div>
                                            <h3 className="font-bold text-white text-sm">مراجعة وتعديل الأسئلة ({questions.length})</h3>
                                            <p className="text-xs text-gray-400">يمكنك تعديل أي سؤال قبل النشر للطلاب</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleAddQuestion}
                                                className="bg-slate-700 hover:bg-slate-600 text-white p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                            >
                                                <Plus size={16} />
                                                <span>سؤال جديد</span>
                                            </button>
                                            <button
                                                onClick={handlePublishExam}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
                                            >
                                                نشر وتوليد الـ PIN
                                            </button>
                                        </div>
                                    </div>

                                    {questions.map((q, qIndex) => (
                                        <div key={q.id || qIndex} className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="bg-blue-500/20 text-blue-400 font-bold text-xs px-2.5 py-1 rounded-lg">
                                                    س {qIndex + 1}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={q.questionText}
                                                    onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                                                    className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
                                                />
                                                <button
                                                    onClick={() => handleDeleteQuestion(qIndex)}
                                                    className="text-gray-500 hover:text-red-400 p-1.5 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                                {q.options.map((option, oIndex) => (
                                                    <div
                                                        key={oIndex}
                                                        className={`p-2 rounded-xl border flex items-center gap-2 ${
                                                            q.correctOption === oIndex
                                                                ? 'bg-emerald-500/10 border-emerald-500/40'
                                                                : 'bg-slate-900/60 border-slate-700/60'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={`correct_${qIndex}`}
                                                            checked={q.correctOption === oIndex}
                                                            onChange={() => handleQuestionChange(qIndex, 'correctOption', oIndex)}
                                                            className="accent-emerald-500 cursor-pointer"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={option}
                                                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                                            className="w-full bg-transparent text-xs text-white focus:outline-none"
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            <div>
                                                <label className="block text-[10px] text-gray-400 mb-1">شرح الإجابة الصحيحة للطلاب:</label>
                                                <input
                                                    type="text"
                                                    value={q.explanation || ''}
                                                    onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                                                    placeholder="شرح سبب صحة الخيار..."
                                                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-1.5 text-gray-300 text-[11px] focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                ) : (
                    
                    /* تبويب لوحة الأوائل وتحليلات الأخطاء الشائعة */
                    <div className="space-y-8">
                        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 shadow-xl space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700 pb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                                        <Trophy size={22} />
                                        <span>لوحة النتائج وتحليل الأخطاء الشائعة</span>
                                    </h2>
                                    <p className="text-xs text-gray-400">اختر الامتحان لمتابعة الأوائل ودراسة نقاط ضعف الطلاب</p>
                                </div>

                                {savedExams.length > 0 && (
                                    <select
                                        value={selectedExamForResults?.pin || ''}
                                        onChange={(e) => {
                                            const found = savedExams.find(ex => ex.pin === e.target.value);
                                            setSelectedExamForResults(found);
                                        }}
                                        className="bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 font-semibold"
                                    >
                                        {savedExams.map((ex) => (
                                            <option key={ex.pin} value={ex.pin}>
                                                {ex.topic} (كود: {ex.pin})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {!selectedExamForResults ? (
                                <div className="text-center py-12 text-gray-500 text-xs">
                                    لا توجد امتحانات منشورة حالياً لتفريغ النتائج لها.
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* تفاصيل الامتحان السريعة */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-900/60 p-4 rounded-2xl border border-slate-700/60">
                                        <div>اسم الامتحان: <strong className="text-white block text-sm mt-0.5">{selectedExamForResults.topic}</strong></div>
                                        <div>كود الـ PIN: <strong className="text-emerald-400 block text-sm mt-0.5 font-mono">{selectedExamForResults.pin}</strong></div>
                                        <div>عدد الطلاب الذين أجروا الاختبار: <strong className="text-amber-400 block text-sm mt-0.5">{selectedExamForResults.results?.length || 0} طالب</strong></div>
                                    </div>

                                    {/* 1. قسم تحليل الأخطاء الشائعة */}
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-sm text-red-400 flex items-center gap-2">
                                            <AlertTriangle size={18} />
                                            <span>الأسئلة الأكثر صعوبة والأخطاء الشائعة لدى الطلاب</span>
                                        </h3>

                                        {(!selectedExamForResults.results || selectedExamForResults.results.length === 0) ? (
                                            <div className="p-6 bg-slate-900/40 border border-dashed border-slate-700 rounded-2xl text-center text-xs text-gray-400">
                                                لا توجد إجابات بعد لتوليد تحليلات الأخطاء الشائعة.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {mistakesData.map((m, idx) => (
                                                    <div key={idx} className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs font-bold text-gray-400">سؤال #{idx + 1}</span>
                                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                                                m.errorPercentage >= 50 
                                                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                            }`}>
                                                                نسبة الخطأ: {m.errorPercentage}%
                                                            </span>
                                                        </div>

                                                        <p className="font-semibold text-xs text-white leading-relaxed">{m.questionText}</p>

                                                        <div className="space-y-1.5 pt-1 text-[11px]">
                                                            <div className="flex items-center gap-2 text-emerald-400">
                                                                <CheckCircle2 size={14} />
                                                                <span>الإجابة الصحيحة: <strong>{m.correctOptionText}</strong></span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-red-400">
                                                                <XCircle size={14} />
                                                                <span>الخيار الخاطئ الأكثر اختياراً: <strong>{m.mostCommonWrongOptionText}</strong></span>
                                                            </div>
                                                        </div>

                                                        {m.explanation && (
                                                            <div className="p-2.5 bg-slate-800/80 rounded-xl text-[10px] text-gray-400 border border-slate-700/50">
                                                                <span className="text-blue-400 font-semibold block">نصيحة للشرح في الحصة:</span>
                                                                {m.explanation}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. جدول ترتيب الأوائل والطلاب */}
                                    <div className="space-y-4 pt-4 border-t border-slate-700/60">
                                        <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                                            <Users size={18} />
                                            <span>جدول الدرجات والأوائل</span>
                                        </h3>

                                        {(!selectedExamForResults.results || selectedExamForResults.results.length === 0) ? (
                                            <div className="text-center py-8 text-gray-400 text-xs bg-slate-900/30 rounded-2xl border border-dashed border-slate-700">
                                                لم يقم أي طالب بأداء هذا الامتحان بعد.
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-right text-xs">
                                                    <thead className="bg-slate-900 text-gray-400 font-semibold border-b border-slate-700">
                                                        <tr>
                                                            <th className="p-3">الترتيب</th>
                                                            <th className="p-3">اسم الطالب</th>
                                                            <th className="p-3">الدرجة</th>
                                                            <th className="p-3">الوقت المستغرق</th>
                                                            <th className="p-3">تاريخ التسليم</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-700/60">
                                                        {selectedExamForResults.results
                                                            .sort((a, b) => b.score - a.score || a.timeSpentSeconds - b.timeSpentSeconds)
                                                            .map((res, index) => (
                                                                <tr key={index} className="hover:bg-slate-700/30">
                                                                    <td className="p-3 font-bold">
                                                                        {index === 0 && <span className="text-amber-400">🥇 1</span>}
                                                                        {index === 1 && <span className="text-gray-300">🥈 2</span>}
                                                                        {index === 2 && <span className="text-amber-600">🥉 3</span>}
                                                                        {index > 2 && <span className="text-gray-400">{index + 1}</span>}
                                                                    </td>
                                                                    <td className="p-3 font-semibold text-white">{res.studentName}</td>
                                                                    <td className="p-3 text-emerald-400 font-bold">{res.score} / {selectedExamForResults.questions.length}</td>
                                                                    <td className="p-3 text-gray-300">{Math.floor(res.timeSpentSeconds / 60)} دقيقة و {res.timeSpentSeconds % 60} ثانية</td>
                                                                    <td className="p-3 text-gray-400">{new Date(res.submittedAt).toLocaleTimeString('ar-EG')}</td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            )}
                        </div>
                    </div>

                )}
            </main>
        </div>
    );
}