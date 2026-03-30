export interface User {
  id: string | number;
  name: string;
  phone: string;
  email?: string;
  role?: 'user' | 'admin' | 'super_admin' | 'courier';
  points: number;
  org_id?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  commission_rate?: number;
  is_super_admin?: boolean;
  avatar_url?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  ingredients: string;
  category: 'churrasco' | 'ready';
  image_url?: string;
  promotional_price?: number | null;
  available?: boolean;
  org_id?: string;
}

export interface ExtraIngredient {
  id: number;
  name: string;
  price: number;
  org_id?: string;
}

export interface OrderItem {
  id: number;
  name: string;
  basePrice: number;
  extraIngredients?: ExtraIngredient[];
}

export interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid';
  total_price: number;
  created_at: string;
  queuePosition?: number;
  estimatedMinutes?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  org_id?: string;
  rating?: number;
  feedback_comment?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string | null;
  };
  has_mp_token?: boolean;
  subscription_status?: 'active' | 'past_due' | 'trialing' | 'canceled';
  next_billing_date?: string;
  is_exempt?: boolean;
  plan_id?: string;
  billing_due_date?: string;
  operating_hours?: Record<string, { open: string; close: string; closed: boolean }>;
}

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

export interface InventoryItem {
  id: string;
  org_id: string;
  name: string;
  category?: string;
  unit: 'kg' | 'un' | 'ml';
  current_avg_cost: number;
  last_purchase_price: number;
  price_history?: number[];
  created_at: string;
  updated_at: string;
}

export interface ProductIngredient {
  id: string;
  product_id: number;
  inventory_item_id: string;
  quantity: number;
  inventory_item?: InventoryItem;
}
