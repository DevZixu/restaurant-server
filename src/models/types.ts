export type UserRole = 'manager' | 'staff';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  available: boolean;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  customerName: string;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
}

export interface RestaurantStore {
  users: User[];
  categories: Category[];
  menuItems: MenuItem[];
  orders: Order[];
}

export interface OrderItemInput {
  menuItemId: string;
  quantity: number;
}