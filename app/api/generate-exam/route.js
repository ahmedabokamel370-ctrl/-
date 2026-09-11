import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const body = await req.json();
        const { topic, questionCount, customPrompt, fileContent, customApiKey } = body;

        // 1. تحديد مفتاح API (إما المفتاح المخصص من الواجهة أو الافتراضي)
        const apiKey = customApiKey?.trim() || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "لم يتم العثور على مفتاح API. يرجى إدخال مفتاح مخصص أو ضبط GEMINI_API_KEY في البيئة." },
                { status: 400 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

        // 2. صياغة الـ Prompt المطور الشامل للتعليمات والملفات المرفقة
        let promptText = `أنت معلم خبير ومتخصص في بناء التقييمات التعليمية.
قم بإنشاء امتحان مكون من ${questionCount || 5} أسئلة في موضوع "${topic || "موضوع عام"}".\n\n`;

        if (customPrompt && customPrompt.trim()) {
            promptText += `تعليمات وملاحظات إضافية من المعلم:\n"${customPrompt.trim()}"\n\n`;
        }

        if (fileContent && fileContent.trim()) {
            promptText += `النص المرجعي/محتوى الملف المرفق:\n"""\n${fileContent.trim()}\n"""\nيرجى اعتماد هذا المحتوى بشكل أساسي لصياغة الأسئلة.\n\n`;
        }

        promptText += `المطلوب:
إرجاع النتيجة بصيغة JSON فقط دون أي نص إضافي أو علامات تنصيص Markdown، متطابقة تماماً مع الهيكل التالي:

{
  "questions": [
    {
      "id": "q1",
      "questionText": "نص السؤال هنا",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctOption": 0,
      "explanation": "شرح تبسيطي وسبب اختيار الإجابة الصحيحة"
    }
  ]
}

ملاحظات هامة:
1. الإجابة الصحيحة (correctOption) يجب أن تكون الرقم الدليلي (index) للخيارات (من 0 إلى 3).
2. يجب إضافة شرح سريع (explanation) يوضح سبب صحة الإجابة.
3. التزم باللغة العربية الفصحى ووضوح الأسئلة.`;

        // 3. التوليد عبر Gemini API
        const result = await model.generateContent(promptText);
        const responseText = await result.response.text();

        // 4. تنظيف ومعالجة استجابة الـ JSON
        const cleanJson = responseText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        const parsedData = JSON.parse(cleanJson);

        return NextResponse.json(parsedData);

    } catch (error) {
        console.error("خطأ في خادم توليد الامتحانات (Gemini API Error):", error);
        return NextResponse.json(
            { 
                error: "فشل في توليد الأسئلة بواسطة الذكاء الاصطناعي", 
                details: error.message || "تأكد من صحة مفتاح API والمحتوى المدخل."
            }, 
            { status: 500 }
        );
    }
}