'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// إعداد اتصال Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function HomePage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [scores, setScores] = useState([]);
  const [isTeacherLoggedIn, setIsTeacherLoggedIn] = useState(false);
  const router = useRouter();

  // التحقق من تسجيل دخول المعلم وجلب لوحة الأوائل تلقائياً
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authStatus = sessionStorage.getItem('teacher_authenticated');
      if (authStatus === 'true') {
        setIsTeacherLoggedIn(true);
      }
      fetchLeaderboard();
    }
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('submissions')
        .select('*')
        .order('score', { ascending: false });

      if (fetchError) {
        console.error('Error fetching leaderboard:', fetchError);
      } else {
        const formatted = (data || []).map((s) => ({
          id: s.id,
          name: s.student_name,
          pin: s.exam_pin || s.pin,
          score: s.score,
          total: s.total_questions || s.total,
          time: s.time || '',
        }));
        setScores(formatted);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleDeleteScore = async (scoreId, studentName) => {
    if (confirm(`هل أنت متأكد من حذف نتيجة الطالب (${studentName}) من لوحة الأوائل؟`)) {
      try {
        const { error: deleteError } = await supabase
          .from('submissions')
          .delete()
          .eq('id', scoreId);

        if (deleteError) throw deleteError;

        setScores(scores.filter((s) => s.id !== scoreId));
        alert('تم حذف الطالب بنجاح.');
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء محاولة الحذف.');
      }
    }
  };

  const handleStartExam = (e) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('يرجى إدخال رمز الـ PIN');
      return;
    }
    router.push(`/exam?pin=${encodeURIComponent(pin.trim())}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#131B2E] p-8 rounded-2xl shadow-2xl border border-gray-800 text-center space-y-6">
        <div>
          <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30 text-2xl font-bold">
            🎓
          </div>

          <h1 className="text-2xl font-bold mb-2 text-white">منصة الاختبارات الذكية</h1>
          <p className="text-gray-400 text-sm">أدخل رمز الـ PIN لبدء الاختبار</p>
        </div>

        <form onSubmit={handleStartExam} className="flex flex-col gap-4">
          <div>
            <input
              type="text"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              placeholder="رمز PIN (جرب: 1234 أو 9999)"
              className="w-full px-4 py-3 bg-[#0B0F19] border border-gray-700 rounded-xl text-white text-center text-lg focus:outline-none focus:border-blue-500 font-mono"
            />
            {error && <p className="text-red-400 text-sm mt-2 text-right">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl transition cursor-pointer text-white"
          >
            بدء الاختبار
          </button>
        </form>

        {/* لوحة أوائل الطلاب المدمجة مع خاصية الحذف للمعلم */}
        <div className="pt-6 border-t border-gray-800 text-right space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              🏆 لوحة أوائل الطلاب
            </h2>
            <span className="text-[11px] text-gray-400">إجمالي النتائج: {scores.length}</span>
          </div>

          <div className="overflow-x-auto max-h-56 overflow-y-auto rounded-xl border border-gray-800 bg-[#0B0F19] p-2">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="pb-2 px-2">#</th>
                  <th className="pb-2 px-2">اسم الطالب</th>
                  <th className="pb-2 px-2">الدرجة</th>
                  {isTeacherLoggedIn && <th className="pb-2 px-2 text-center">إدارة</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {scores.length === 0 ? (
                  <tr>
                    <td colSpan={isTeacherLoggedIn ? 4 : 3} className="text-center py-4 text-gray-500">
                      لا توجد نتائج مسجلة حتى الآن.
                    </td>
                  </tr>
                ) : (
                  scores.map((s, idx) => (
                    <tr key={s.id || idx} className="hover:bg-gray-900/40 transition">
                      <td className="py-2.5 px-2 text-gray-400 font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-2 font-bold text-white truncate max-w-[130px]">{s.name || 'طالب'}</td>
                      <td className="py-2.5 px-2 font-bold text-emerald-400">
                        {s.score} / {s.total}
                      </td>
                      {isTeacherLoggedIn && (
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteScore(s.id, s.name)}
                            className="px-2 py-0.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-bold transition"
                            title="حذف النتيجة"
                          >
                            🗑️ حذف
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {isTeacherLoggedIn && (
            <p className="text-[10px] text-emerald-400 text-center">
              ✓ تم تفعيل وضع المعلم: تظهر أزرار الحذف في الصفحة الرئيسية.
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-gray-800 flex justify-between text-xs font-medium">
          <Link href="/analytics" className="text-amber-400 hover:underline">
            🏆 لوحة الأوائل الكاملة
          </Link>
          <Link href="/teacher" className="text-blue-400 hover:underline">
            ⚙️ لوحة المعلم
          </Link>
        </div>
      </div>

      {/* التذييل الثابت */}
      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-800/50 mt-8 space-y-1 w-full max-w-xl">
        <p>تحت إشراف: <span className="text-gray-200 font-bold">مستر أشرف كامل</span></p>
        <p>إعداد وتصميم: <span className="text-blue-400 font-bold">أحمد أشرف كامل</span></p>
      </footer>
    </div>
  );
}