import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { questionText, questionType, userAnswer, correctAnswer } = await req.json()

  const prompt = `Ти вчитель математики. Учень відповідав на питання НМТ з математики і помилився.

Питання: ${questionText}
Тип питання: ${questionType === 'single' ? 'вибір однієї відповіді' : questionType === 'matching' ? 'встановити відповідність' : 'вписати відповідь'}
Відповідь учня: ${userAnswer}
Правильна відповідь: ${correctAnswer}

Поясни коротко (3-5 речень):
1. Чому відповідь учня неправильна
2. Як правильно розв'язати це завдання
3. Яке правило або формулу треба застосувати

Відповідай українською мовою. Будь конкретним і зрозумілим для учня 11 класу.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()
  console.log('Anthropic response:', JSON.stringify(data))
  const text = data.content?.[0]?.text ?? 'Не вдалося отримати пояснення.'

  return NextResponse.json({ explanation: text })
}