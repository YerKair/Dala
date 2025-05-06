// Вот простое и радикальное решение проблем с типами в TypeScript
// Создайте этот файл в корне вашего проекта как 'types.ts'

// types.ts - единый файл с типами для всего проекта

export interface Product {
  id: string;
  title: string; // title должно присутствовать
  name?: string; // для совместимости с любыми существующими интерфейсами
  description: string;
  price: string; // цена всегда как строка
  images?: string | null;
  status?: string;
  // добавьте здесь все остальные свойства, которые могут быть у продукта
  restaurant_id?: number | null;
  user_id?: number;
  category_id?: number;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  storeId: string;
  name: string;
  price: string; // цена как строка
  quantity: number;
}

export interface CartTotals {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

// Функция для безопасного преобразования строки в число
export function safeParseFloat(value: string | number): number {
  if (typeof value === "number") return value;
  return parseFloat(value) || 0; // возвращает 0 если преобразование не удалось
}

// Функция для преобразования API продукта в нужный формат
export function normalizeProduct(apiProduct: any): Product {
  return {
    id: String(apiProduct.id),
    title: apiProduct.title || apiProduct.name || "Unknown Product",
    description: apiProduct.description || "",
    price: String(apiProduct.price), // обеспечиваем что цена всегда строка
    images: apiProduct.images,
    status: apiProduct.status || "active",
    // копируем все остальные свойства
    ...apiProduct,
  };
}
