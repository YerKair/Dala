# План локализации Dala

## Переведенные файлы

Следующие файлы уже имеют поддержку i18n:

- [x] `app/(tabs)/index.tsx` - Главный экран
- [x] `app/profile-information-views/profile.tsx` - Экран профиля
- [x] `app/(modals)/CartPage.tsx` - Страница корзины
- [x] `app/(tabs)/delivery/delivery/ChechoutPage.tsx` - Страница оформления заказа
- [x] `app/auth/login.tsx` - Экран авторизации
- [x] `app/auth/register.tsx` - Экран регистрации
- [x] `app/(tabs)/delivery/DeliverPage.tsx` - Страница доставки
- [x] `app/(tabs)/marketplacer/MarketplaceScreen.tsx` - Страница маркетплейса

## Файлы, требующие локализации

### Высокий приоритет

- [ ] `app/(tabs)/taxi-service/taxi.tsx` - Страница такси
- [ ] `app/(tabs)/taxi-service/trip.tsx` - Страница поездки

### Средний приоритет

- [ ] `app/profile-information-views/profile-information.tsx` - Информация профиля
- [ ] `app/profile-information-views/profile-information/settings.tsx` - Настройки
- [ ] `app/profile-information-views/profile-information/change-password.tsx` - Смена пароля
- [ ] `app/profile-information-views/profile-information/change-number.tsx` - Смена номера
- [ ] `app/profile-information-views/profile/OrderHistoryScreen.tsx` - История заказов
- [ ] `app/(modals)/ProductDetailPage.tsx` - Детали продукта
- [ ] `app/(tabs)/delivery/delivery/DeliveryTrackingPage.tsx` - Отслеживание доставки

### Низкий приоритет

- [ ] `app/profile-information-views/payment/EditPaymentMethodScreen.tsx` - Редактирование метода оплаты
- [ ] `app/profile-information-views/work-screens/RequirementsScreen.tsx` - Требования для работы
- [ ] `app/profile-information-views/WorkInDalaScreen.tsx` - Экран работы в Dala
- [ ] `app/(tabs)/delivery/products/ProductsPage.tsx` - Страница продуктов
- [ ] `app/(tabs)/delivery/CategoryStoresPage.tsx` - Категории магазинов
- [ ] `app/(tabs)/delivery/AdminPage.tsx` - Админка доставки

## Инструкции для локализации файлов

1. Добавить импорт хука useTranslation:

```tsx
import { useTranslation } from "react-i18next";
```

2. Инициализировать хук в компоненте:

```tsx
const { t } = useTranslation();
```

3. Заменить жестко закодированные строки на вызовы функции t():

```tsx
// До локализации
<Text>My Cart</Text>

// После локализации
<Text>{t("cartPage.title")}</Text>
```

4. Добавить новые ключи переводов в файлы локализации:

- `app/i18n/locales/en.ts`
- `app/i18n/locales/ru.ts`
- `app/i18n/locales/kk.ts`

5. Проверить работу переводов при переключении языка

## Полезные компоненты для локализации

- `LanguageSelector` - Полноэкранный компонент выбора языка
- `LanguageQuickSelector` - Компактный компонент выбора языка для шапки

Добавляйте эти компоненты на ключевые экраны для обеспечения быстрого переключения языка.
