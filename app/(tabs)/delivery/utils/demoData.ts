/**
 * FALLBACK DEMO DATA
 *
 * This file contains demo data that should only be used:
 * 1. As fallback when the API is unavailable
 * 2. For type definitions that match the backend models
 * 3. For development and testing purposes
 *
 * The actual application should use real API data whenever possible.
 */

// Демонстрационные данные для приложения доставки

export interface DemoCategory {
  id: number;
  name: string;
  image: string;
}

export interface DemoProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  category_id: string;
  images?: string;
}

// Изображения категорий в base64 формате для демонстрации
export const demoCategories: DemoCategory[] = [
  {
    id: 1,
    name: "Vegetables and fruits",
    image: "https://via.placeholder.com/200x200/90EE90/000000?text=Vegetables",
  },
  {
    id: 2,
    name: "Drinks",
    image: "https://via.placeholder.com/200x200/87CEEB/000000?text=Drinks",
  },
  {
    id: 3,
    name: "Bakery products",
    image: "https://via.placeholder.com/200x200/F5DEB3/000000?text=Bakery",
  },
  {
    id: 4,
    name: "Dairy products",
    image: "https://via.placeholder.com/200x200/FFFFF0/000000?text=Dairy",
  },
  {
    id: 5,
    name: "Tea and coffee",
    image: "https://via.placeholder.com/200x200/D2B48C/000000?text=Coffee",
  },
  {
    id: 6,
    name: "Cereals and pasta",
    image: "https://via.placeholder.com/200x200/FFD700/000000?text=Cereals",
  },
  {
    id: 7,
    name: "Snacks",
    image: "https://via.placeholder.com/200x200/FF7F50/000000?text=Snacks",
  },
  {
    id: 8,
    name: "Pet Products",
    image: "https://via.placeholder.com/200x200/4682B4/000000?text=Pet",
  },
];

// Демо-продукты для каждой категории
export const generateDemoProducts = (): Record<string, DemoProduct[]> => {
  const products: Record<string, DemoProduct[]> = {};

  demoCategories.forEach((category) => {
    // Генерируем от 3 до 8 продуктов для каждой категории
    const productsCount = Math.floor(Math.random() * 6) + 3;

    products[category.id] = Array(productsCount)
      .fill(null)
      .map((_, index) => ({
        id: `${category.id}-${index}`,
        title: `Product ${index + 1} in ${category.name}`,
        description: `This is a sample product in the ${category.name} category.`,
        price: `${Math.floor(Math.random() * 5000) + 500}`,
        category_id: category.id.toString(),
        images: `https://via.placeholder.com/200x200/CCCCCC/000000?text=${
          category.name.split(" ")[0]
        }+${index + 1}`,
      }));
  });

  return products;
};

// Демо-данные для магазина
export const demoStore = {
  id: "1",
  name: "SMALL",
  rating: "8.8",
  minOrderAmount: "2,500 ₸",
  openHours: "09:00",
};
