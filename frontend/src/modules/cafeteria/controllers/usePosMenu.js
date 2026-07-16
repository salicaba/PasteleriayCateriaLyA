// src/modules/cafeteria/controllers/usePosMenu.js
import { useState, useEffect, useMemo } from 'react';
import client from '../../../api/client.js';
import { socket } from '../../../api/socket.js'; // ✅ FIX: Importación nombrada destructurada

export const usePosMenu = (isVitrina) => {
  const [dbProducts, setDbProducts] = useState([]); 
  const [dbCategories, setDbCategories] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('todas');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodsRes, catsRes] = await Promise.all([
          client.get('/menu/products'),
          client.get('/menu/categories')
        ]);
        
        const prods = prodsRes.data;
        const cats = catsRes.data;

        const activeProducts = prods.filter(p => {
          const estado = p.isActive !== undefined ? p.isActive : p.disponible;
          if (estado === false || estado === 0 || estado === '0') return false;
          return true;
        }).map(p => ({
          ...p,
          nombre: p.name || p.nombre || 'Sin Nombre',
          precio: parseFloat(p.basePrice || p.precio || 0),
          imagen: p.imageUrl || p.imagen || p.image || null,
          categoria: p.categoryId || p.categoria,
          stock: p.stockQuantity || p.stock || 0
        }));
        
        setDbProducts(activeProducts); 

        const hasTodas = cats.some(c => c.id === 'todas' || c.name.trim().toLowerCase() === 'todas');
        const finalCats = hasTodas ? cats : [{ id: 'todas', name: 'Todas' }, ...cats];
        
        setDbCategories(finalCats);
      } catch (error) {
        console.error("Error al cargar menú en POS", error);
      }
    };
    loadData();
  }, []);

  // 🚀 ESCUCHADOR DE STOCK EN TIEMPO REAL
  useEffect(() => {
    const handleStockUpdate = (updates) => {
      setDbProducts(prevProducts => prevProducts.map(p => {
        const update = updates.find(u => u.id === p.id);
        if (update) {
          return { ...p, stock: update.stock, isAgotado: update.isAgotado };
        }
        return p;
      }));
    };

    socket.on('stock:update', handleStockUpdate);
    return () => socket.off('stock:update', handleStockUpdate);
  }, []);

  const filteredProducts = useMemo(() => {
    return dbProducts.filter(p => {
       const productName = p.nombre || p.name || '';
       const matchText = productName.toLowerCase().includes((filtroTexto || '').toLowerCase());
       const matchCat = categoriaActiva === 'todas' || p.categoria === categoriaActiva || p.categoryId === categoriaActiva;
       
       if (isVitrina) return matchText && matchCat && p.requiereCocina === false;
       return matchText && matchCat;
    });
  }, [filtroTexto, categoriaActiva, dbProducts, isVitrina]);

  return {
    dbProducts, dbCategories,
    filtroTexto, setFiltroTexto,
    categoriaActiva, setCategoriaActiva,
    filteredProducts
  };
};