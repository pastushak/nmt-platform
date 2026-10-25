// Скільки AI-пояснень доступно на одну спробу (перевіряється на сервері)
export const MAX_EXPLAINS = 3

// Модель можна змінити змінною оточення EXPLAIN_MODEL у Vercel без зміни коду
export const EXPLAIN_MODEL = process.env.EXPLAIN_MODEL || 'claude-sonnet-4-6'
