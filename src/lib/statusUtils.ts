/**
 * Utilitários para tradução de status e termos internos para Português (Brasil)
 */

export const translateStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': 'Pendente',
    'preparing': 'Em Preparo',
    'ready': 'Pronto',
    'shipped': 'Em Rota',
    'delivered': 'Entregue',
    'cancelled': 'Cancelado',
    // Courier specific
    'active': 'Ativo',
    'offline': 'Offline'
  };
  return statusMap[status.toLowerCase()] || status;
};

export const translatePaymentMethod = (method: string): string => {
  const methodMap: Record<string, string> = {
    'pix': 'PIX',
    'card': 'Cartão',
    'credit_card': 'Cartão de Crédito',
    'debit_card': 'Cartão de Débito',
    'cash': 'Dinheiro',
    'delivery': 'Na Entrega',
    'delivery_cash': 'Dinheiro (Entrega)',
    'delivery_pix': 'PIX (Entrega)',
    'paid_pix': 'PIX (Pago)',
    'paid_card': 'Cartão (Pago)'
  };
  return methodMap[method.toLowerCase()] || method;
};

export const translateRole = (role: string): string => {
  const roleMap: Record<string, string> = {
    'admin': 'Administrador',
    'courier': 'Entregador',
    'super_admin': 'Super Admin',
    'user': 'Cliente'
  };
  return roleMap[role.toLowerCase()] || role;
};

export const translateCategory = (cat: string): string => {
  const catMap: Record<string, string> = {
    'churrasco': 'Churrasco',
    'ready': 'Bebida/Pronto',
    'carne': 'Carne',
    'queijo': 'Queijo',
    'hortifruti': 'Hortifruti',
    'embalagem': 'Embalagem',
    'insumo': 'Insumo Geral',
    'acompanhamento': 'Acompanhamento'
  };
  return catMap[cat.toLowerCase()] || cat;
};
