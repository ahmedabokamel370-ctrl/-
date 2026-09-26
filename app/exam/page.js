'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function StudentPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const [myScores, setMyScores] = useState([]);
  const [examPinInput, setExamPinInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [currentExam, setCurrentExam] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examResult, setExamResult] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStudent = localStorage.getItem('current_student_name');
      if (savedStudent) {
        setStudentName(savedStudent);
        setIsLoggedIn(true);
        fetchStudentScores(savedStudent);
      }
    }
  }, []);

  const fetchStudentScores = async (name) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .ilike('student_name', name);

      if (error) throw error;
      setMyScores(data || []);
    } catch (err) {
      console.error('Error fetching student scores:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // التحقق الحقيقي من الحسابات في جدول students في قاعدة البيانات
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!studentName.trim() || !studentPassword.trim()) {
      return alert('يرجى إدخال اسم الطالب وكلمة المرور');
    }

    const cleanName = studentName.trim();
    const cleanPass = studentPassword.trim();

    try {
      if (isRegistering) {
        // 1. التحقق هل الاسم مسجل من قبل؟
        const { data: existing } = await supabase
          .from('students')
          .select('*')
          .eq('name', cleanName)
          .single();

        if (existing) {
          return alert('هذا الاسم مسجل مسبقاً، يرجى تسجيل الدخول مباشرة.');
        }

        // 2. تسجيل طالب جديد في قاعدة البيانات
        const { error: insertError } = await supabase.from('students').insert([
          { name: cleanName, password: cleanPass }
        ]);

        if (insertError) throw insertError;

        localStorage.setItem('current_student_name', cleanName);
        setIsLoggedIn(true);
        fetchStudentScores(cleanName);
        alert('🎉 تم إنشاء الحساب وتسجيل الدخول بنجاح!');
      } else {
        // 3. تسجيل الدخول والتحقق من صحة الاسم وكلمة المرور من قاعدة البيانات
        const { data: studentRecord, error } = await supabase
          .from('students')
          .select('*')
          .eq('name', cleanName)
          .eq('password', cleanPass)
          .single();

        if (error || !studentRecord) {
          return alert('❌ خطأ في اسم الطالب أو كلمة المرور! تأكد من بياناتك أو قم بإنشاء حساب جديد.');
        }

        localStorage.setItem('current_student_name', cleanName);
        setIsLoggedIn(true);
        fetchStudentScores(cleanName);
      }
    } catch (err) {
      console.error('Auth error:', err);
      alert('حدث خطأ أثناء عملية المصادقة، تأكد من اتصالك بقاعدة البيانات.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('current_student_name');
    setIsLoggedIn(false);
    setStudentName('');
    setStudentPassword('');
    setMyScores([]);
    setCurrentExam(null);
  };

  // التحقق من الـ PIN ووجود الامتحان في قاعدة البيانات
  const handleStartExamByPin = async (e) => {
    e.preventDefault();
    if (!examPinInput.trim()) return alert('يرجى إدخال PIN الامتحان');

    const pin = examPinInput.trim();

    try {
      // 1. البحث عن الامتحان في قاعدة البيانات للتأكد أنه ما زال موجوداً ولم يقم المعلم بحذفه
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('pin', pin)
        .single();

      if (examError || !examData) {
        return alert('❌ عذراً، هذا الامتحان غير موجود أو قام المعلم بحذفه من المنصة.');
      }

      // 2. التحقق هل قام الطالب بحل هذا الامتحان من قبل؟
      const alreadySubmitted = myScores.some((s) => String(s.pin || s.exam_pin) === String(pin));
      if (alreadySubmitted) {
        return alert('⚠️ عذراً، لقد قمت بأداء هذا الامتحان مسبقاً ولا يمكنك دخوله سوى مرة واحدة فقط!');
      }

      setCurrentExam(examData);
      setCurrentQuestionIndex(0);
      setStudentAnswers({});
      setTimeLeft((examData.duration || 10) * 60);
      setExamSubmitted(false);
      setExamResult(null);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء التحقق من الامتحان');
    }
  };

  useEffect(() => {
    if (!currentExam || examSubmitted) return;
    if (timeLeft <= 0) {
      handleSubmitExam();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, currentExam, examSubmitted]);

  const handleSubmitExam = async () => {
    if (examSubmitted || !currentExam) return;
    setExamSubmitted(true);

    let score = 0;
    const questions = currentExam.questions || [];
    const wrongAnswersList = [];

    questions.forEach((q, idx) => {
      const studentAns = studentAnswers[idx];
      const qType = q.type || 'mcq';

      if (qType === 'short_answer') {
        const correct = (q.correctAnswer || '').toString().trim().toLowerCase();
        const given = (studentAns || '').toString().trim().toLowerCase();
        if (given && given === correct) {
          score++;
        } else {
          wrongAnswersList.push(idx);
        }
      } else if (qType === 'true_false') {
        const correct = String(q.correctAnswer ?? q.correctOption);
        if (studentAns === correct) {
          score++;
        } else {
          wrongAnswersList.push(idx);
        }
      } else {
        if (studentAns === q.correctOption) {
          score++;
        } else {
          wrongAnswersList.push(idx);
        }
      }
    });

    const resultData = {
      student_name: studentName,
      pin: currentExam.pin,
      exam_pin: currentExam.pin,
      score: score,
      total: questions.length,
      wrong_answers: wrongAnswersList,
      time: new Date().toLocaleString('ar-EG')
    };

    setExamResult(resultData);

    try {
      await supabase.from('submissions').insert([resultData]);
      fetchStudentScores(studentName);
    } catch (err) {
      console.error('Error saving submission:', err);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-between p-4 font-sans" dir="rtl">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md bg-[#131B2E] p-8 rounded-2xl border border-gray-800 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto text-2xl border border-blue-500/30">
              🎓
            </div>
            <div>
              <h1 className="text-2xl font-bold">منصة الطلاب</h1>
              <p className="text-gray-400 text-xs mt-1">
                {isRegistering ? 'أنشئ حسابك الحقيقي الجديد' : 'سجل دخولك بحسابك وكلمة المرور'}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="اسم الطالب الثلاثي"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full p-3 bg-[#0B0F19] border border-gray-700 rounded-xl text-center text-white focus:outline-none focus:border-blue-500 text-sm"
                required
              />
              <input
                type="password"
                placeholder="كلمة المرور"
                value={studentPassword}
                onChange={(e) => setStudentPassword(e.target.value)}
                className="w-full p-3 bg-[#0B0F19] border border-gray-700 rounded-xl text-center text-white focus:outline-none focus:border-blue-500 text-sm font-mono"
                required
              />
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl text-sm transition shadow-lg shadow-blue-600/30"
              >
                {isRegistering ? 'إنشاء الحساب والتسجيل' : 'تسجيل الدخول'}
              </button>
            </form>

            <div className="text-xs text-gray-400 pt-2 border-t border-gray-800 flex justify-between items-center">
              <Link href="/" className="hover:text-blue-400 transition">
                الرئيسية
              </Link>
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-blue-400 hover:underline"
              >
                {isRegistering ? 'لديك حساب بالفعل؟ سجل دخول' : 'ليس لديك حساب؟ إنشاء حساب جديد'}
              </button>
            </div>
          </div>
        </div>
        <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-800/50">
          <p>تحت إشراف: <span className="text-gray-200 font-bold">مستر أشرف كامل</span></p>
        </footer>
      </div>
    );
  }

  if (currentExam && !examSubmitted) {
    const questions = currentExam.questions || [];
    const q = questions[currentQuestionIndex];
    const qType = q?.type || 'mcq';

    return (
      <div className="min-h-screen bg-[#0B0F19] text-white p-4 md:p-8 font-sans max-w-3xl mx-auto flex flex-col justify-between" dir="rtl">
        <div className="space-y-6">
          <div className="bg-[#131B2E] p-4 rounded-2xl border border-gray-800 flex justify-between items-center shadow-lg">
            <div>
              <h2 className="text-sm font-bold text-blue-400">{currentExam.topic || 'امتحان تفاعلي'}</h2>
              <p className="text-[11px] text-gray-400">السؤال {currentQuestionIndex + 1} من {questions.length}</p>
            </div>
            <div className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl font-mono text-xs font-bold">
              ⏱️ {formatTime(timeLeft)}
            </div>
          </div>

          <div className="bg-[#131B2E] p-6 rounded-2xl border border-gray-800 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white leading-relaxed">{q.text}</h3>

            {qType === 'short_answer' ? (
              <input
                type="text"
                placeholder="اكتب إجابتك هنا..."
                value={studentAnswers[currentQuestionIndex] || ''}
                onChange={(e) =>
                  setStudentAnswers({ ...studentAnswers, [currentQuestionIndex]: e.target.value })
                }
                className="w-full p-3 bg-[#0B0F19] border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            ) : qType === 'true_false' ? (
              <div className="grid grid-cols-2 gap-3">
                {['صح', 'خطأ'].map((opt, oIdx) => {
                  const isSelected = studentAnswers[currentQuestionIndex] === opt;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => setStudentAnswers({ ...studentAnswers, [currentQuestionIndex]: opt })}
                      className={`p-3 rounded-xl border text-sm font-bold transition ${
                        isSelected
                          ? 'bg-blue-600/30 border-blue-500 text-blue-400'
                          : 'bg-[#0B0F19] border-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {(q.options || []).map((opt, oIdx) => {
                  const isSelected = studentAnswers[currentQuestionIndex] === oIdx;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => setStudentAnswers({ ...studentAnswers, [currentQuestionIndex]: oIdx })}
                      className={`w-full text-right p-3 rounded-xl border text-xs font-semibold transition flex items-center gap-3 ${
                        isSelected
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                          : 'bg-[#0B0F19] border-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                        {oIdx + 1}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-between gap-4">
            <button
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded-xl disabled:opacity-40 transition"
            >
              السابق
            </button>

            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-xs font-bold rounded-xl transition"
              >
                التالي
              </button>
            ) : (
              <button
                onClick={handleSubmitExam}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/20"
              >
                تسليم الامتحان نهائياً
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (examSubmitted && examResult) {
    const percentage = Math.round((examResult.score / examResult.total) * 100);
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white p-4 md:p-8 font-sans max-w-md mx-auto flex flex-col justify-center items-center text-center" dir="rtl">
        <div className="bg-[#131B2E] p-8 rounded-2xl border border-gray-800 space-y-6 w-full shadow-2xl">
          <div className="w-16 h-16 bg-emerald-600/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-2xl border border-emerald-500/30">
            🏆
          </div>
          <div>
            <h2 className="text-xl font-bold">تم تسليم الامتحان بنجاح!</h2>
            <p className="text-xs text-gray-400 mt-1">تم حفظ درجتك في سجلك الشخصي</p>
          </div>

          <div className="bg-[#0B0F19] p-4 rounded-xl border border-gray-800 space-y-2">
            <p className="text-xs text-gray-400">درجتك النهائية:</p>
            <p className="text-2xl font-bold text-emerald-400">{examResult.score} من {examResult.total}</p>
            <p className="text-xs font-semibold text-blue-400">النسبة المئوية: {percentage}%</p>
          </div>

          <button
            onClick={() => {
              setCurrentExam(null);
              setExamSubmitted(false);
              setExamResult(null);
            }}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl text-xs transition shadow-lg shadow-blue-600/30"
          >
            العودة للوحة التحكم الرئيسية
          </button>
        </div>
      </div>
    );
  }

  const totalExamsSolved = myScores.length;
  const averageScore = totalExamsSolved > 0 
    ? Math.round(myScores.reduce((acc, curr) => acc + (curr.score / curr.total) * 100, 0) / totalExamsSolved) 
    : 0;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-4 md:p-8 font-sans flex flex-col justify-between" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6 w-full">
        <header className="flex flex-wrap items-center justify-between bg-[#131B2E] p-6 rounded-2xl border border-gray-800 gap-4 shadow-xl">
          <div>
            <h1 className="text-xl font-bold">أهلاً بك، <span className="text-blue-400">{studentName}</span> 👋</h1>
            <p className="text-xs text-gray-400 mt-1">لوحة تحكم الطالب ومتابعة المستوى الدراسي</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl border border-gray-700 transition"
            >
              الرئيسية
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-2 bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-semibold rounded-xl hover:bg-red-600/30 transition"
            >
              تسجيل خروج
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#131B2E] p-5 rounded-2xl border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">إجمالي الامتحانات المجتازة</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{totalExamsSolved} امتحانات</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-600/20 text-emerald-400 rounded-xl flex items-center justify-center text-xl border border-emerald-500/30">
              📊
            </div>
          </div>

          <div className="bg-[#131B2E] p-5 rounded-2xl border border-gray-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">متوسط الأداء العام</p>
              <h3 className="text-2xl font-bold text-blue-400 mt-1">{averageScore}%</h3>
            </div>
            <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center text-xl border border-blue-500/30">
              ⭐
            </div>
          </div>
        </div>

        <div className="bg-[#131B2E] p-6 rounded-2xl border border-gray-800 space-y-4 shadow-xl">
          <h2 className="text-base font-bold text-amber-400 flex items-center gap-2">
            <span>🔑</span> الدخول لامتحان جديد عبر الـ PIN
          </h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            قم بإدخال كود الامتحان (PIN) الذي تسلمته من المعلم لدخول الامتحان. <strong className="text-red-400">تنبيه:</strong> يمكنك دخول وحل الامتحان مرة واحدة فقط!
          </p>

          <form onSubmit={handleStartExamByPin} className="flex flex-wrap sm:flex-nowrap gap-3">
            <input
              type="text"
              placeholder="أدخل PIN الامتحان (مثال: 1234)"
              value={examPinInput}
              onChange={(e) => setExamPinInput(e.target.value)}
              className="flex-1 p-3 bg-[#0B0F19] border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-600/20"
            >
              بدء الامتحان الآن
            </button>
          </form>
        </div>

        <div className="bg-[#131B2E] p-6 rounded-2xl border border-gray-800 space-y-4 shadow-xl">
          <h2 className="text-base font-bold text-blue-400">📋 سجلك الدراسي ودرجات الامتحانات</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="pb-3">#</th>
                  <th className="pb-3">كود الامتحان (PIN)</th>
                  <th className="pb-3">الدرجة</th>
                  <th className="pb-3">النسبة</th>
                  <th className="pb-3">وقت التسليم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {loadingHistory ? (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-gray-500">جاري تحميل سجلك...</td>
                  </tr>
                ) : myScores.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-gray-500">لم تقم بأداء أي امتحانات حتى الآن. ابدأ بإدخال الـ PIN بالأعلى!</td>
                  </tr>
                ) : (
                  myScores.map((s, idx) => {
                    const percentage = Math.round((s.score / s.total) * 100);
                    return (
                      <tr key={idx} className="hover:bg-gray-900/40 transition.">
                        <td className="py-3 text-gray-400">{idx + 1}</td>
                        <td className="py-3 font-mono text-blue-400">{s.pin || s.exam_pin}</td>
                        <td className="py-3 font-bold text-emerald-400">{s.score} / {s.total}</td>
                        <td className="py-3 font-semibold text-amber-400">{percentage}%</td>
                        <td className="py-3 text-gray-400 text-[11px]">{s.time}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="py-4 text-center text-xs text-gray-400 border-t border-gray-800/50 mt-8 space-y-1">
        <p>تحت إشراف: <span className="text-gray-200 font-bold">مستر أشرف كامل</span></p>
        <p>جميع الحقوق محفوظة © 2026</p>
      </footer>
    </div>
  );
}