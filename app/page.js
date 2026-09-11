'use client';
import Link from 'next/link';
import { Sparkles, UserCheck, GraduationCap, Heart } from 'lucide-react';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6" dir="rtl">
            
            {/* الهيدر والمحتوى الرئيسي */}
            <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center space-y-8 py-12">
                
                {/* شارة الترحيب */}
                <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full border border-blue-500/20 text-xs sm:text-sm font-semibold">
                    <Sparkles size={18} />
                    <span>منظومة الاختبارات والتقييم الذكي</span>
                </div>

                {/* العنوان الرئيسي */}
                <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                    أهلاً بك في المنصة التعليمية الذكية
                </h1>

                <p className="text-gray-400 text-sm sm:text-base max-w-xl leading-relaxed">
                    توليد امتحانات بالذكاء الاصطناعي، حماية لوحة المعلم بكلمة مرور، وتحليل الأخطاء الشائعة لدى الطلاب بسهولة ودقة.
                </p>

                {/* أزرار الدخول */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md pt-4">
                    <Link
                        href="/teacher"
                        className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold p-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-sm"
                    >
                        <UserCheck size={20} />
                        <span>لوحة التحكم للمعلم</span>
                    </Link>

                    <Link
                        href="/exam"
                        className="flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-white font-bold p-4 rounded-2xl border border-slate-700 transition-all active:scale-95 text-sm"
                    >
                        <GraduationCap size={20} />
                        <span>صفحة أداء الامتحان للطالب</span>
                    </Link>
                </div>
            </div>

            {/* أسفل الصفحة (Footer) - حقوق إعداد والتصميم والإشراف */}
            <footer className="max-w-4xl mx-auto w-full border-t border-slate-800/80 pt-6 pb-3 text-center space-y-1.5">
                <p className="text-xs sm:text-sm text-gray-300 font-semibold">
                    إعداد وتصميم: <span className="text-blue-400 font-bold">أحمد أشرف كامل</span>
                </p>
                <p className="text-xs text-gray-400">
                    تحت إشراف: <span className="text-amber-400 font-bold">مستر أشرف كامل</span>
                </p>
            </footer>

        </div>
    );
}