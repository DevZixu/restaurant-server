export type UserRole = 'admin' | 'manager' | 'staff';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderItemInput {
  menuItemId: number;
  quantity: number;
}