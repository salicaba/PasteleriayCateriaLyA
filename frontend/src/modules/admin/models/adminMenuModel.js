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
  updateCategory: async (id, name) => {
    const response = await client.put(`/menu/categories/${id}`, { name });
    return response.data;
  },
  deleteCategory: async (id) => {
    const response = await client.delete(`/menu/categories/${id}`);
    return response.data;
  },
  reorderCategories: async (items) => {
    const response = await client.put('/menu/categories/reorder', { items });
    return response.data;
  },

  // --- OPCIONES GLOBALES (NUEVO) ---
  getGlobalOptions: async () => {
    const response = await client.get('/menu/options');
    return response.data;
  },
  createGlobalOption: async (data) => {
    // data espera { tipo, nombre, precioAdicional }
    const response = await client.post('/menu/options', data);
    return response.data;
  },
  deleteGlobalOption: async (id) => {
    const response = await client.delete(`/menu/options/${id}`);
    return response.data;
  }
};