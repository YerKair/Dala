// utils/helpers.ts

// Format currency
export const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

// Get product image by ID (placeholder implementation)
export const getProductImage = async (
  productId: string
): Promise<string | null> => {
  // In a real app, this would fetch image from API
  const placeholders = [
    "https://via.placeholder.com/300/4A5D23/FFFFFF?text=Product+Image",
    "https://via.placeholder.com/300/6A7D43/FFFFFF?text=Fresh+Produce",
    "https://via.placeholder.com/300/8A9D63/FFFFFF?text=Grocery+Item",
  ];

  // Determine which placeholder to use based on product ID
  const index =
    parseInt(productId.replace(/[^0-9]/g, "")) % placeholders.length;

  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      resolve(placeholders[index || 0]);
    }, 500);
  });
};

// Calculate distance between two coordinates in km
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

// Convert degrees to radians
const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

// Calculate estimated delivery time based on distance
export const calculateEstimatedDeliveryTime = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): string => {
  const distance = calculateDistance(fromLat, fromLng, toLat, toLng);

  // Assume average delivery speed of 20 km/h
  const timeInMinutes = Math.ceil((distance / 20) * 60);

  if (timeInMinutes < 15) {
    return "10-15 min";
  } else if (timeInMinutes < 30) {
    return "15-30 min";
  } else if (timeInMinutes < 45) {
    return "30-45 min";
  } else if (timeInMinutes < 60) {
    return "45-60 min";
  } else {
    const hours = Math.floor(timeInMinutes / 60);
    return `${hours}-${hours + 1} hours`;
  }
};
