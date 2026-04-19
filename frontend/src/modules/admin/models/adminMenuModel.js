import client from '../../../api/client.js';

export const adminMenuModel = {
  // --- PRODUCTOS ---
  getProducts: async () => {
    const response = await client.get('/menu/products');
    return response.data;
  },
  createProduct: async (productData) => {
    const response = await client.post('/menu/products', productData);
    return response.data;
  },
  updateProduct: async (id, productData) => {
    const response = await client.put(`/menu/products/${id}`, productData);
    return response.data;
  },
  deleteProduct: async (id) => {
    const response = await client.delete(`/menu/products/${id}`);
    return response.data;
  },

  // --- CATEGORÍAS (NUEVO) ---
  getCategories: async () => {
    const response = await client.get('/menu/categories');
    return response.data;
  },
  createCategory: async (name) => {
    const response = await client.post('/menu/categories', { name });
    return response.data;
  },
  updateCategory: async (id, name) => { // <-- NUEVA
    const response = await client.put(`/menu/categories/${id}`, { name });
    return response.data;
  },
  deleteCategory: async (id) => {
    const response = await client.delete(`/menu/categories/${id}`);
    return response.data;
  },
  reorderCategories: async (items) => {
    // items debe ser un array: [{ id: 'uuid', order: 0 }, ...]
    const response = await client.put('/menu/categories/reorder', { items });
    return response.data;
  }
};