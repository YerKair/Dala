// Order interface definition matching the order history screen requirements
export interface Order {
  id: string; // Order ID (e.g., "19" as shown in screenshots)
  date: string; // Formatted date (e.g., "October 18, 2024")
  storeName: string; // Name of the store/restaurant
  items: {
    name: string; // Product name
    quantity: number; // Quantity ordered
    price: string; // Price per item
  }[];
  total: string; // Total price as string
  status: "completed" | "cancelled" | "active"; // Order status
  address: string; // Delivery address or pickup location
  paymentMethod: string; // Payment method used
}
