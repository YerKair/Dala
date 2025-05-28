# Интернационализация (i18n) в Dala

Наше приложение поддерживает переводы на 3 языка:

- Английский (en)
- Русский (ru)
- Казахский (kk)

## Структура файлов

- `app/i18n/i18n.ts` - Основной файл конфигурации i18n
- `app/i18n/locales/` - Папка с файлами переводов:
  - `en.ts` - Английский язык
  - `ru.ts` - Русский язык
  - `kk.ts` - Казахский язык
- `app/i18n/LanguageSelector.tsx` - Компонент для выбора языка (полноэкранный)
- `app/i18n/LanguageQuickSelector.tsx` - Компактный компонент для быстрого переключения языка (для шапки)

## Как использовать в компонентах

### 1. Импортируйте хук useTranslation:

```tsx
import { useTranslation } from "react-i18next";
```

### 2. Инициализируйте хук в компоненте:

```tsx
const { t, i18n } = useTranslation();
```

### 3. Используйте функцию `t()` для перевода текста:

```tsx
<Text>{t('home')}</Text>
<Text>{t('delivery')}</Text>
```

### 4. Используйте переводы с параметрами:

```tsx
<Text>{t("hello", { name: "User" })}</Text>
```

### 5. Вложенные переводы:

```tsx
<Text>{t("cartPage.title")}</Text>
```

## Как добавить новые переводы

1. Добавьте новые ключи и их переводы в файлы локализации (`en.ts`, `ru.ts`, `kk.ts`):

```ts
// в en.ts
export default {
  // ... существующие переводы
  newFeature: {
    title: "New Feature",
    description: "This is a new feature",
  },
};

// в ru.ts
export default {
  // ... существующие переводы
  newFeature: {
    title: "Новая функция",
    description: "Это новая функция",
  },
};

// в kk.ts
export default {
  // ... существующие переводы
  newFeature: {
    title: "Жаңа функция",
    description: "Бұл жаңа функция",
  },
};
```

2. Используйте новые переводы в компонентах:

```tsx
<Text>{t('newFeature.title')}</Text>
<Text>{t('newFeature.description')}</Text>
```

## Переключение языка программно

Для программного переключения языка используйте:

```tsx
i18n.changeLanguage("ru"); // переключить на русский
i18n.changeLanguage("kk"); // переключить на казахский
i18n.changeLanguage("en"); // переключить на английский
```

Язык сохраняется в AsyncStorage и автоматически восстанавливается при запуске приложения.

## Компоненты для выбора языка

В проекте есть два компонента для выбора языка:

1. `LanguageSelector` - полноэкранный выбор языка
2. `LanguageQuickSelector` - компактный выбор языка для шапки приложения

```tsx
// Полноэкранный выбор языка
import LanguageSelector from "../i18n/LanguageSelector";

<LanguageSelector />;

// Компактный выбор языка
import LanguageQuickSelector from "../i18n/LanguageQuickSelector";

<LanguageQuickSelector />;
```
