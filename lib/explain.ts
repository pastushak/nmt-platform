// Скільки AI-пояснень доступно на одну спробу (перевіряється на сервері)
export const MAX_EXPLAINS = 3

// Скільки пояснень учень може отримати за 24 години (усі спроби разом).
// Справжній ліміт — у функції reserve_explanation в БД; це число лише для тексту повідомлення.
export const MAX_EXPLAINS_PER_DAY = 15

// Модель можна змінити змінною оточення EXPLAIN_MODEL у Vercel без зміни коду
export const EXPLAIN_MODEL = process.env.EXPLAIN_MODEL || 'claude-sonnet-4-6'
