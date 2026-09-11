'use client';
import { useState, useEffect, useRef } from 'react';
import { 
    Clock, CheckCircle2, XCircle, Trophy, Sparkles, 
    ArrowRight, Send, User, Key, HelpCircle, RotateCcw, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';

export default function StudentExamPage() {
    // 1. حالات التناقل بين مراحل الامتحان (login -> taking -> result)
    const [step, setStep] = useState('login'); // 'login' | 'taking' | 'result'

    // 2. مدخلات الطالب والدخول
    const [pin, setPin] = useState('');
    const [studentName, setStudentName] = useState('');
    const [error, setError] = useState('');

    // 3. بيانات الامتحان النشط والإجابات
    const [exam, setExam] = useState(null);
    const [userAnswers, setUserAnswers] = useState({}); // { 0: 2, 1: 0, ... }
    
    // 4. العداد الزمني بالثواني
    const [timeLeft, setTimeLeft] = useState(0);
    const [timeSpent, setTimeSpent] = useState(0);
    const timerRef = useRef(null);

    // 5. النتيجة والتقدير النهائي
    const [score, setScore] = useState(0);

    // إدارة العداد التنازلي عند بدء الامتحان
    useEffect(() => {
        if (step === 'taking' && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prevTime) => {
                    if (prevTime <= 1) {
                        clearInterval(timerRef.current);
                        handleSubmitExam(); // إنهاء تلقائي عند انتهاء الوقت
                        return 0;
                    }
                    return prevTime - 1;
                });
                setTimeSpent((prevSpent) => prevSpent + 1);
            }, 1000);
        }

        return () => clearInterval(timerRef.current);
    }, [step, timeLeft]);

    // تسجيل دخول الطالب وبدء الامتحان
    const handleStartExam = (e) => {
        e.preventDefault();
        setError('');

        if (!studentName.trim()) {
            setError('يرجى إدخال اسمك الثلاثي للبدء.');
            return;
        }

        if (!pin.trim()) {
            setError('يرجى إدخال كود الـ PIN الخا بالامتحان.');
            return;
        }

        // جلب الامتحانات المتاحة من الذاكرة المحلية
        const savedExams = JSON.parse(localStorage.getItem('my_edu_exams') || '[]');
        const foundExam = savedExams.find((ex) => ex.pin.toUpperCase() === pin.trim().toUpperCase());

        if (!foundExam) {
            setError('كود الـ PIN غير صحيح أو أن الامتحان غير موجود.');
            return;
        }

        // تهيئة بيانات الامتحان
        setExam(foundExam);
        setTimeLeft((foundExam.durationMinutes || 15) * 60);
        setTimeSpent(0);
        setUserAnswers({});
        setStep('taking');
    };

    // اختيار إجابة لكل سؤال
    const handleSelectOption = (qIndex, optionIndex) => {
        setUserAnswers({
            ...userAnswers,
            [qIndex]: optionIndex,
        });
    };

    // إنهاء الامتحان والتصحيح وتسجيل النتيجة
    const handleSubmitExam = () => {
        if (step === 'result') return; // منع التكرار

        clearInterval(timerRef.current);

        if (!exam) return;

        // حساب الدرجة النهائية
        let calculatedScore = 0;
        exam.questions.forEach((q, index) => {
            if (userAnswers[index] === q.correctOption) {
                calculatedScore += 1;
            }
        });

        setScore(calculatedScore);

        // حفظ النتيجة في الذاكرة المحلية لتحديث لوحة الأوائل
        const newResultRecord = {
            studentName: studentName.trim(),
            score: calculatedScore,
            totalQuestions: exam.questions.length,
            timeSpentSeconds: timeSpent,
            submittedAt: new Date().toISOString(),
        };

        const savedExams = JSON.parse(localStorage.getItem('my_edu_exams') || '[]');
        const updatedExams = savedExams.map((ex) => {
            if (ex.pin === exam.pin) {
                const existingResults = ex.results || [];
                return {
                    ...ex,
                    results: [...existingResults, newResultRecord],
                };
            }
            return ex;
        });

        localStorage.setItem('my_edu_exams', JSON.stringify(updatedExams));
        setStep('result');
    };

    // تنسيق الوقت المتبقي (دقيقة : ثانية)
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6" dir="rtl">
            {/* الهيدر العلوي */}
            <header className="max-w-4xl w-full mx-auto flex justify-between items-center py-4 mb-6 border-b border-slate-800">
                <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                    <ArrowRight size={18} />
                    <span>الرئيسية</span>
                </Link>
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
                    <Sparkles size={22} />
                    <span>منظومة الاختبار التفاعلية</span>
                </div>
            </header>

            <main className="max-w-3xl mx-auto">
                {/* ----------------- الشاشة الأولى: دخول الطالب ----------------- */}
                {step === 'login' && (
                    <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 max-w-md mx-auto">
                        <div className="text-center space-y-2">
                            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
                                <Key size={28} />
                            </div>
                            <h1 className="text-xl font-bold text-white">دخول الامتحان بالـ PIN</h1>
                            <p className="text-xs text-gray-400">أدخل اسمك وكود الامتحان المزود من المعلم للبدء</p>
                        </div>

                        <form onSubmit={handleStartExam} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                                    <User size={14} className="text-emerald-400" />
                                    <span>اسم الطالب الثلاثي</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="مثال: أحمد محمد علي"
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                                    <Key size={14} className="text-emerald-400" />
                                    <span>كود الـ PIN الخاص بالامتحان</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="EXAM-1234"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-xs tracking-wider uppercase font-mono"
                                />
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] text-xs flex items-center justify-center gap-2 mt-2"
                            >
                                <span>بدء الاختبار الآن</span>
                                <ArrowRight size={16} className="rotate-180" />
                            </button>
                        </form>
                    </div>
                )}

                {/* ----------------- الشاشة الثانية: أداء الامتحان والعداد ----------------- */}
                {step === 'taking' && exam && (
                    <div className="space-y-6">
                        {/* شريط معلومات الامتحان والعداد */}
                        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 flex justify-between items-center sticky top-4 z-10 shadow-xl backdrop-blur-md">
                            <div>
                                <h2 className="font-bold text-sm text-white">{exam.topic}</h2>
                                <p className="text-[11px] text-gray-400">الطالب: {studentName}</p>
                            </div>

                            {/* العداد التنازلي */}
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold font-mono ${
                                timeLeft < 180 
                                    ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse' 
                                    : 'bg-slate-900 border-slate-700 text-emerald-400'
                            }`}>
                                <Clock size={18} />
                                <span>{formatTime(timeLeft)}</span>
                            </div>
                        </div>

                        {/* أسئلة الامتحان */}
                        <div className="space-y-5">
                            {exam.questions.map((q, qIndex) => (
                                <div key={q.id || qIndex} className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-4 shadow-lg">
                                    <div className="flex items-start gap-3">
                                        <span className="bg-emerald-500/20 text-emerald-400 font-bold text-xs px-3 py-1 rounded-lg shrink-0">
                                            س {qIndex + 1}
                                        </span>
                                        <h3 className="font-semibold text-sm text-white leading-relaxed pt-0.5">
                                            {q.questionText}
                                        </h3>
                                    </div>

                                    {/* الخيارات */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                        {q.options.map((option, oIndex) => {
                                            const isSelected = userAnswers[qIndex] === oIndex;
                                            return (
                                                <button
                                                    key={oIndex}
                                                    type="button"
                                                    onClick={() => handleSelectOption(qIndex, oIndex)}
                                                    className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between text-xs ${
                                                        isSelected
                                                            ? 'bg-emerald-600/20 border-emerald-500 text-white font-semibold shadow-md'
                                                            : 'bg-slate-900/60 border-slate-700/60 text-gray-300 hover:bg-slate-700/50'
                                                    }`}
                                                >
                                                    <span>{option}</span>
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                        isSelected ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                                                    }`}>
                                                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* زر التسليم */}
                        <div className="pt-4">
                            <button
                                type="button"
                                onClick={handleSubmitExam}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-emerald-600/20 active:scale-[0.98] text-sm flex items-center justify-center gap-2"
                            >
                                <Send size={18} />
                                <span>تسليم وتصحيح الامتحان النهائي</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* ----------------- الشاشة الثالثة: النتيجة ومراجعة الأخطاء ----------------- */}
                {step === 'result' && exam && (
                    <div className="space-y-6 animate-fade-in">
                        {/* كارت النتيجة العلوية */}
                        <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-8 text-center space-y-4 shadow-2xl relative overflow-hidden">
                            <div className="w-20 h-20 bg-amber-500/10 text-amber-400 rounded-3xl flex items-center justify-center mx-auto border border-amber-500/20">
                                <Trophy size={40} />
                            </div>

                            <div className="space-y-1">
                                <span className="text-xs text-gray-400">نتيجة الطالب: {studentName}</span>
                                <h2 className="text-2xl font-bold text-white">{exam.topic}</h2>
                            </div>

                            <div className="flex justify-center items-baseline gap-2 pt-2">
                                <span className="text-5xl font-black text-emerald-400">{score}</span>
                                <span className="text-xl text-gray-400 font-bold">/ {exam.questions.length}</span>
                            </div>

                            <p className="text-xs text-gray-400">
                                الوقت المستغرق: <strong className="text-white">{Math.floor(timeSpent / 60)} دقيقة و {timeSpent % 60} ثانية</strong>
                            </p>

                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 max-w-sm mx-auto">
                                <ShieldCheck size={18} />
                                <span>تم تسجيل منطقتك في لوحة أوائل المعلم بنجاح!</span>
                            </div>
                        </div>

                        {/* مراجعة الأسئلة وتبيان الخطأ والصواب */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-sm text-white px-2 flex items-center gap-2">
                                <HelpCircle size={18} className="text-blue-400" />
                                <span>مراجعة الإجابات ونموذج الشرح</span>
                            </h3>

                            {exam.questions.map((q, qIndex) => {
                                const studentAns = userAnswers[qIndex];
                                const isCorrect = studentAns === q.correctOption;

                                return (
                                    <div
                                        key={qIndex}
                                        className={`border rounded-3xl p-6 space-y-4 shadow-lg ${
                                            isCorrect
                                                ? 'bg-slate-800/80 border-emerald-500/30'
                                                : 'bg-slate-800/80 border-red-500/30'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                <span className={`font-bold text-xs px-3 py-1 rounded-lg shrink-0 ${
                                                    isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                    س {qIndex + 1}
                                                </span>
                                                <h4 className="font-semibold text-sm text-white leading-relaxed pt-0.5">
                                                    {q.questionText}
                                                </h4>
                                            </div>
                                            {isCorrect ? (
                                                <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold shrink-0 bg-emerald-500/10 px-3 py-1 rounded-full">
                                                    <CheckCircle2 size={16} /> صحيح
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-xs text-red-400 font-bold shrink-0 bg-red-500/10 px-3 py-1 rounded-full">
                                                    <XCircle size={16} /> خاطئ
                                                </span>
                                            )}
                                        </div>

                                        {/* الخيارات والتحديد */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                            {q.options.map((opt, oIndex) => {
                                                const isUserChoice = studentAns === oIndex;
                                                const isCorrectChoice = q.correctOption === oIndex;

                                                let style = 'bg-slate-900/40 border-slate-700/50 text-gray-400';
                                                if (isCorrectChoice) {
                                                    style = 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 font-bold';
                                                } else if (isUserChoice && !isCorrect) {
                                                    style = 'bg-red-500/20 border-red-500/60 text-red-300 font-bold';
                                                }

                                                return (
                                                    <div key={oIndex} className={`p-3 rounded-xl border text-xs flex justify-between items-center ${style}`}>
                                                        <span>{opt}</span>
                                                        {isCorrectChoice && <span className="text-[10px] bg-emerald-500/30 px-2 py-0.5 rounded text-emerald-200">الإجابة الصحيحة</span>}
                                                        {isUserChoice && !isCorrectChoice && <span className="text-[10px] bg-red-500/30 px-2 py-0.5 rounded text-red-200">إجابتك</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* الشرح والتبسيط */}
                                        {q.explanation && (
                                            <div className="p-3.5 bg-slate-900/80 border border-slate-700/60 rounded-2xl text-xs text-gray-300 space-y-1">
                                                <span className="text-blue-400 font-bold block text-[11px]">💡 التوضيح الشارح:</span>
                                                <p className="leading-relaxed">{q.explanation}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* العودة وإعادة المحاولة */}
                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={() => setStep('login')}
                                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3.5 rounded-2xl transition-all text-xs flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={16} />
                                <span>أداء امتحان آخر</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}