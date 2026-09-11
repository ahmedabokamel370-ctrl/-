'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function StudentPage() {
  const [step, setStep] = useState('login');

  const [pin, setPin] = useState('');
  const [studentName, setStudentName] = useState('');
  const [examData, setExamData] = useState(null);

  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);

  const [result, setResult] = useState({ score: 0, total: 0 });

  const handleSubmitExam = useCallback(
    (forcedByTimer = false) => {
      if (!examData) return;

      let calculatedScore = 0;
      examData.questions.forEach((q, index) => {
        if (userAnswers[index] === q.correctOption) {
          calculatedScore += 1;
        }
      });

      const totalQuestions = examData.questions.length;
      setResult({ score: calculatedScore, total: totalQuestions });

      if (typeof window !== 'undefined') {
        const storedScores = JSON.parse(
          localStorage.getItem('exam_scores') || '[]'
        );
        const newRecord = {
          name: studentName,
          pin: pin,
          score: calculatedScore,
          total: totalQuestions,
          time: new Date().toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        localStorage.setItem(
          'exam_scores',
          JSON.stringify([newRecord, ...storedScores])
        );
      }

      if (forcedByTimer) {
        setIsTimeUp(true);
      }

      setStep('result');
    },
    [examData, userAnswers, studentName, pin]
  );

  useEffect(() => {
    if (step !== 'exam' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, timeLeft, handleSubmitExam]);

  const handleStartExam = (e) => {
    e.preventDefault();
    if (!studentName.trim()) return alert('يرجى كتابة اسمك الثلاثي');
    if (!pin.trim()) return alert('يرجى إدخال رمز PIN الخاص بالامتحان');

    if (typeof window !== 'undefined') {
      const savedExam = localStorage.getItem(`exam_${pin.trim()}`);
      if (!savedExam) {
        return alert('لم يتم العثور على امتحان بهذا الرمز!');
      }

      try {
        const parsedExam = JSON.parse(savedExam);
        if (!parsedExam.questions || parsedExam.questions.length === 0) {
          return alert('هذا الامتحان لا يحتوي على أسئلة بعد!');
        }

        setExamData(parsedExam);
        const durationInMinutes = parsedExam.duration || 10;
        setTimeLeft(durationInMinutes * 60);
        setUserAnswers({});
        setStep('exam');
      } catch {
        alert('حدث خطأ أثناء قراءة بيانات الامتحان.');
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleOptionSelect = (questionIndex, optionIndex) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-between p-4 md:p-8 font-sans" dir="rtl">
      
      {/* 1. شاشة الدخول */}
      {step === 'login' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md bg-[#131B2E] p-8 rounded-2xl border border-gray-800 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto text-3xl border border-blue-500/30">
              🎓
            </div>
            <div>
              <h1 className="text-2xl font-bold">منصة الاختبارات الإلكترونية</h1>
              <p className="text-gray-400 text-xs mt-1">أدخل اسمك ورمز PIN للبدء</p>
            </div>

            <form onSubmit={handleStartExam} className="space-y-4">
              <div>
                <label className="block text-right text-xs text-gray-400 mb-1">اسم الطالب الثلاثي:</label>
                <input
                  type="text"
                  placeholder="مثال: أحمد محمد علي"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full p-3 bg-[#0B0F19] border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-right text-xs text-gray-400 mb-1">رمز PIN للامتحان:</label>
                <input
                  type="text"
                  placeholder="أدخل الرمز (مثال: 1234)"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full p-3 bg-[#0B0F19] border border-gray-700 rounded-xl text-center text-blue-400 font-mono font-bold text-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl text-sm transition shadow-lg shadow-blue-600/30"
              >
                🚀 دخول الامتحان
              </button>
            </form>

            <div className="pt-2 border-t border-gray-800">
              <Link href="/" className="text-xs text-gray-400 hover:text-blue-400 font-semibold transition">
                🏠 الصفحة الرئيسية
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. شاشة تقديم الامتحان */}
      {step === 'exam' && examData && (
        <div className="flex-1 max-w-3xl mx-auto space-y-6 w-full">
          <div className="sticky top-4 z-40 bg-[#131B2E]/90 backdrop-blur-md p-4 rounded-2xl border border-gray-800 flex items-center justify-between shadow-xl">
            <div>
              <h2 className="text-base font-bold text-white">{examData.title}</h2>
              <p className="text-xs text-gray-400">الطالب: {studentName}</p>
            </div>

            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${timeLeft <= 60 ? 'bg-red-600/20 border-red-500 text-red-400 animate-pulse' : 'bg-[#0B0F19] border-gray-700 text-emerald-400'}`}>
              <span className="text-xs text-gray-400">الوقت المتبقي:</span>
              <span className="font-mono font-bold text-lg dir-ltr">⏱️ {formatTime(timeLeft)}</span>
            </div>
          </div>

          <div className="space-y-6">
            {examData.questions.map((q, qIdx) => (
              <div key={qIdx} className="bg-[#131B2E] p-6 rounded-2xl border border-gray-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-lg font-bold">
                    سؤال {qIdx + 1} من {examData.questions.length}
                  </span>
                  {userAnswers[qIdx] !== undefined && (
                    <span className="text-xs text-emerald-400 font-semibold">✓ تم الاختيار</span>
                  )}
                </div>

                <p className="text-sm font-semibold text-white leading-relaxed">{q.text}</p>

                <div className="space-y-2 pt-2">
                  {q.options.map((opt, oIdx) => {
                    const isSelected = userAnswers[qIdx] === oIdx;
                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleOptionSelect(qIdx, oIdx)}
                        className={`w-full text-right p-3.5 rounded-xl border text-xs font-medium transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white font-bold'
                            : 'bg-[#0B0F19] border-gray-800 text-gray-300 hover:border-gray-700'
                        }`}
                      >
                        <span>{opt}</span>
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-blue-400 bg-blue-500' : 'border-gray-600'}`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              if (confirm('هل أنت تأكد من أنك تريد إنهاء وتسليم الإجابات الآن؟')) {
                handleSubmitExam(false);
              }
            }}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm transition shadow-lg shadow-emerald-600/20"
          >
            ✅ تسليم الامتحان الآن
          </button>
        </div>
      )}

      {/* 3. شاشة النتيجة النهائية */}
      {step === 'result' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md bg-[#131B2E] p-8 rounded-2xl border border-gray-800 text-center space-y-6 shadow-2xl">
            {isTimeUp && (
              <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 p-3 rounded-xl text-xs font-semibold">
                ⚠️ انتهى الوقت المخصص للامتحان وتم التسليم تلقائياً!
              </div>
            )}

            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto text-4xl border-2 ${result.score / result.total >= 0.5 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
              {result.score / result.total >= 0.5 ? '🎉' : '😞'}
            </div>

            <div>
              <h1 className="text-xl font-bold">نتيجة الاختبار</h1>
              <p className="text-gray-400 text-xs mt-1">الطالب: <span className="text-white font-bold">{studentName}</span></p>
            </div>

            <div className="bg-[#0B0F19] p-6 rounded-2xl border border-gray-800 space-y-3">
              <div className="text-3xl font-extrabold font-mono text-blue-400">
                {result.score} / {result.total}
              </div>
              <div className="text-xs text-gray-400 font-semibold">
                النسبة المئوية: <span className="font-bold text-emerald-400">{Math.round((result.score / result.total) * 100) || 0}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setStep('login')}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 font-bold rounded-xl text-xs transition"
              >
                🔄 تقديم امتحان آخر
              </button>
              <Link
                href="/"
                className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition text-center"
              >
                🏠 الصفحة الرئيسية
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* التذييل */}
      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-800/50 mt-8 space-y-1">
        <p>تحت إشراف: <span className="text-gray-200 font-bold">مستر أشرف كامل</span></p>
        <p>إعداد وتصميم: <span className="text-blue-400 font-bold">أحمد أشرف كامل</span></p>
      </footer>
    </div>
  );
}