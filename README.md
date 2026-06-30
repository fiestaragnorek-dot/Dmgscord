# Dmgscord

**Dmgscord** — мощный переводчик сообщений для Discord на iOS (Kettu).

## Функции
- Кнопка перевода сообщения (в меню) → на русский
- Кнопка возле отправки (`🌐 EN`) → переводит текст на английский + американский сленг
- Полная поддержка **AI** (OpenAI-совместимые API)
- Оффлайн переводчик
- Американский сленг (lit, no cap, sus, y'all, bussin', goated и т.д.)

## Установка

1. Установи **Kettu** (https://codeberg.org/cocobo1/Kettu)
2. В Discord → Настройки → Плагины → **Добавить плагин по URL**
3. Вставь эту ссылку:

```
https://raw.githubusercontent.com/fiestaragnorek-dot/Dmgscord/main/dist/Dmgscord.js
```

4. Включи плагин и настрой его в настройках.

## Настройка AI

В настройках плагина укажи:
- **API Key**
- **Base URL** (например `https://api.groq.com/openai/v1`)
- **Model** (например `llama-3.3-70b-versatile`)

## Сборка

```bash
bun install
bun run build
```

## GitHub Actions

Автоматически собирает плагин при каждом пуше.

---

Создано автоматически. Используй на свой страх и риск.
