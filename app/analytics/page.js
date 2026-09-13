'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// إعداد اتصال Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AnalyticsPage() {
  const router = useRouter();
  const [scores, setScores] = useState([]);
  const [isTeacherLoggedIn, setIsTeacherLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authStatus = sessionStorage.getItem('teacher_authenticated');
      if (authStatus === 'true') {
        setIsTeacherLoggedIn(true);
      }
      fetchScores();
    }
  }, []);

  // جلب النتائج من Supabase مرتبة تنازلياً حسب الدرجة
  const fetchScores = async () => {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('score', { ascending: false });

      if (error) {
        console.error('Error fetching scores:', error);
      } else {
        const formatted = (data || []).map((s) => ({
          id: s.id,
          name: s.student_name,
          score: s.score,
          total: s.total_questions || s.total,
          time: s.time || '',
          date: s.date || '-',
        }));
        setScores(formatted);
      }
    } catch (err) {
      console.error('Error connecting to Supabase:', err);
    }
  };

  // 🗑️ دالة حذف النتيجة من Supabase
  const handleDeleteScore = async (scoreId, studentName) => {
    if (confirm(`هل أنت متأكد من حذف نتيجة الطالب (${studentName || 'بدون اسم'})؟`)) {
      try {
        const { error } = await supabase
          .from('submissions')
          .delete()
          .eq('id', scoreId);

        if (error) throw error;

        // تحديث القائمة المحلية بعد الحذف
        setScores(scores.filter((s) => s.id !== scoreId));
        alert('تم حذف النتيجة بنجاح.');
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء محاولة الحذف.');
      }
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto space-y-6" dir="rtl">
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">🏆 لوحة الأوائل والنتائج</h1>
          <p className="text-gray-400 text-sm">عرض درجات الطلاب وأدائهم في الاختبارات من قاعدة البيانات</p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-white transition cursor-pointer"
        >
          الرئيسية
        </button>
      </div>

      <div className="bg-[#131B2E] p-6 rounded-2xl border border-gray-800 space-y-4">
        {isTeacherLoggedIn && (
          <p className="text-xs text-emerald-400 font-bold">
            ✓ وضع المعلم مفعل: يمكنك حذف أي نتيجة غير مرغوبة من الجدول أدناه مباشرة.
          </p>
        )}

        {scores.length === 0 ? (
          <p className="text-center text-gray-400 py-8">لا توجد نتائج مسجلة حتى الآن.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm text-gray-300">
              <thead className="bg-[#0B0F19] text-gray-400 uppercase text-xs">
                <tr>
                  <th className="p-3 rounded-r-xl">#</th>
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3">الدرجة</th>
                  <th className="p-3">الزمن المستغرق</th>
                  <th className={`p-3 ${!isTeacherLoggedIn ? 'rounded-l-xl' : ''}`}>التاريخ</th>
                  {isTeacherLoggedIn && <th className="p-3 rounded-l-xl text-center">إدارة</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {scores.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-[#0B0F19]/50 transition">
                    <td className="p-3 font-bold text-amber-400">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </td>
                    <td className="p-3 font-semibold text-white">{item.name}</td>
                    <td className="p-3 text-emerald-400 font-bold">
                      {item.score} / {item.total}
                    </td>
                    <td className="p-3 font-mono text-gray-400">{item.time}</td>
                    <td className="p-3 text-xs text-gray-500">{item.date || '-'}</td>
                    {isTeacherLoggedIn && (
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteScore(item.id, item.name)}
                          className="px-2.5 py-1 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition cursor-pointer"
                          title="حذف هذه النتيجة"
                        >
                          🗑️ حذف
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// دالة تحليل الأخطاء الشائعة (تم الاحتفاظ بها كما طلبت)
export function calculateCommonMistakes(questions, submissions) {
  if (!questions || !submissions || submissions.length === 0) return [];

  const questionStats = {};

  questions.forEach((q) => {
    questionStats[q.id] = {
      id: q.id,
      questionText: q.question,
      correctAnswer: q.correctAnswer,
      totalAttempts: 0,
      totalWrong: 0,
      wrongChoicesCount: {},
    };
  });

  submissions.forEach((sub) => {
    const studentAnswers = sub.answers || {};

    Object.entries(studentAnswers).forEach(([qId, selectedOption]) => {
      const qStat = questionStats[qId];
      if (qStat) {
        qStat.totalAttempts += 1;

        if (selectedOption !== qStat.correctAnswer) {
          qStat.totalWrong += 1;
          qStat.wrongChoicesCount[selectedOption] = (qStat.wrongChoicesCount[selectedOption] || 0) + 1;
        }
      }
    });
  });

  const result = Object.values(questionStats).map((q) => {
    const errorPercentage = q.totalAttempts > 0 
      ? Math.round((q.totalWrong / q.totalAttempts) * 100) 
      : 0;

    let mostCommonWrongOption = 'لا يوجد';
    let maxCount = 0;

    Object.entries(q.wrongChoicesCount).forEach(([option, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonWrongOption = option;
      }
    });

    return {
      id: q.id,
      questionText: q.questionText,
      correctAnswer: q.correctAnswer,
      errorPercentage,
      totalWrong: q.totalWrong,
      totalAttempts: q.totalAttempts,
      mostCommonWrongOption,
      mostCommonWrongCount: maxCount,
    };
  });

  return result.sort((a, b) => b.errorPercentage - a.errorPercentage);
}