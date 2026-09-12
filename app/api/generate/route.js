import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse-fork';

export const runtime = 'nodejs';

const normalizeText = (text) => {
  if (!text) return '';
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractTextFromPdf = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return normalizeText(data.text);
  } catch (err) {
    console.error('PDF Parse Error:', err);
    return '';
  }
};

const extractTextFromImageBuffer = async (buffer) => {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker(['ara', 'eng']);
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    return normalizeText(text);
  } catch (error) {
    console.error('Image OCR Error:', error);
    return '';
  }
};

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const customApiKey = formData.get('apiKey');
    const count = formData.get('count') || '5';
    const promptText = formData.get('prompt') || '';

    let extractedText = '';

    if (file && typeof file === 'object' && file.name) {
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      const fileName = file.name.toLowerCase();
      const fileType = (file.type || '').toLowerCase();

      const isPdf = fileName.endsWith('.pdf') || fileType.includes('pdf');
      const isImage = fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp') || fileType.startsWith('image/');

      if (isPdf) {
        extractedText = await extractTextFromPdf(fileBuffer);
      } else if (isImage) {
        extractedText = await extractTextFromImageBuffer(fileBuffer);
      } else {
        extractedText = normalizeText(fileBuffer.toString('utf-8'));
      }
    }

    if (!extractedText || extractedText.length < 10) {
      return NextResponse.json(
        { success: false, error: 'تعذر استخراج النص من الملف. يرجى التأكد من وضوح المحتوى أو رفع ملف غير محمي.' },
        { status: 400 }
      );
    }

    const apiKey = (customApiKey && customApiKey.trim()) || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال مفتاح API الخاص بك في الحقل المخصص.' },
        { status: 400 }
      );
    }

    // Prompt يحتوي على حقل explanation لطلب الشرح والتعليل
    const systemPrompt = `You are a strict academic evaluator. Generate a multiple-choice quiz with ${count} questions strictly based on the provided text.

LANGUAGE RULE:
- Detect the language of the source text below.
- Generate ALL questions, options, correct answers, and explanations ONLY in the exact same language as the source text.

ACCURACY RULES:
1. Every question must be directly answerable from explicit statements in the text.
2. DO NOT make assumptions or use external knowledge.
3. The "correctAnswer" string MUST exactly match one of the items inside the "options" array.
4. For each question, provide a short "explanation" explaining WHY the correct answer is right according to the text.

User Instructions: ${promptText || 'None'}

SOURCE TEXT:
"""
${extractedText.slice(0, 15000)}
"""

Return JSON ONLY in this format:
{
  "questions": [
    {
      "id": 1,
      "question": "Question string",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Brief explanation of why Option A is correct."
    }
  ]
}`;

    let rawJsonText = '';

    if (apiKey.startsWith('gsk_')) {
      let activeModels = [];
      try {
        const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          if (Array.isArray(modelsData.data)) {
            activeModels = modelsData.data.map(m => m.id);
          }
        }
      } catch (e) {}

      const fallbackModels = [
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'llama3-8b-8192',
        'gemma2-9b-it'
      ];

      const modelsToTry = Array.from(new Set([...activeModels, ...fallbackModels]))
        .filter(m => !m.includes('mixtral') && !m.includes('guard'));

      let lastError = '';
      for (const model of modelsToTry) {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: model,
              messages: [{ role: 'user', content: systemPrompt }],
              temperature: 0.1,
              response_format: { type: 'json_object' }
            })
          });

          const data = await response.json();
          if (response.ok && data.choices?.[0]?.message?.content) {
            rawJsonText = data.choices[0].message.content;
            break;
          } else {
            lastError = data.error?.message || `خطأ في النموذج ${model}`;
          }
        } catch (e) {
          lastError = e.message;
        }
      }

      if (!rawJsonText) throw new Error(lastError || 'يرجى التأكد من صحة مفتاح Groq الخاص بك.');

    } else {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: systemPrompt }],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'مفتاح OpenAI غير صالح أو لا يوجد رصيد');
      rawJsonText = data.choices?.[0]?.message?.content;
    }

    if (!rawJsonText) {
      throw new Error('لم يرجع الذكاء الاصطناعي أي استجابة.');
    }

    let cleanJson = rawJsonText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsedData = JSON.parse(cleanJson);
    let questions = parsedData.questions || (Array.isArray(parsedData) ? parsedData : []);

    questions = questions.map((q) => {
      if (!q.options || q.options.length === 0) return q;

      const exactMatch = q.options.find((opt) => opt.trim() === (q.correctAnswer || '').trim());

      if (exactMatch) {
        q.correctAnswer = exactMatch;
      } else {
        const closeMatch = q.options.find((opt) =>
          opt.trim().toLowerCase().includes((q.correctAnswer || '').trim().toLowerCase()) ||
          (q.correctAnswer || '').trim().toLowerCase().includes(opt.trim().toLowerCase())
        );
        q.correctAnswer = closeMatch || q.options[0];
      }

      if (!q.explanation) {
        q.explanation = 'الإجابة مستخرجة وباشرة من نص الملف.';
      }

      return q;
    });

    if (!questions || questions.length === 0) {
      throw new Error('تعذر استخراج الأسئلة من النص المرفق.');
    }

    return NextResponse.json({
      success: true,
      questions: questions
    });

  } catch (error) {
    console.error('Generation Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'حدث خطأ أثناء معالجة الطلب' },
      { status: 500 }
    );
  }
}