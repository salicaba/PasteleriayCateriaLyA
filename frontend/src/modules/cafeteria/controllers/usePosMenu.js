// frontend/src/modules/cafeteria/controllers/usePosMenu.js
import { useState, useEffect, useMemo, useCallback } from 'react';
import client from '../../../api/client.js';
import { socket } from '../../../api/socket.js';

export const usePosMenu = (isVitrina) => {
  const [dbProducts, setDbProducts] = useState([]); 
  const [dbCategories, setDbCategories] = useState([]);
  const [activePromotions, setActivePromotions] = useState([]); 
  const [filtroTexto, setFiltroTexto] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('todas');

  const loadData = useCallback(async () => {
    try {
      const [prodsRes, catsRes, promoRes] = await Promise.all([
        client.get('/menu/products'),
        client.get('/menu/categories'),
        client.get('/promotions').catch((err) => {
          console.error("⚠️ Error exacto al pedir promociones:", err);
          return { data: [] };
        })
      ]);
      
      const prods = prodsRes.data;
      const cats = catsRes.data;

      const activeProducts = prods.filter(p => {
        const estado = p.isActive !== undefined ? p.isActive : p.disponible;
        if (estado === false || estado === 0 || estado === '0') return false;
        return true;
      }).map(p => {
        const baseVal = parseFloat(p.basePrice || p.precioBase || p.precio || 0);
        return {
          ...p,
          nombre: p.name || p.nombre || 'Sin Nombre',
          precio: baseVal,
          precioBase: baseVal, 
          imagen: p.imageUrl || p.imagen || p.image || null,
          categoria: p.categoryId || p.categoria,
          stock: p.stockQuantity || p.stock || 0
        };
      });
      
      setDbProducts(activeProducts); 

      const rawPromoData = promoRes.data;
      const promosList = Array.isArray(rawPromoData) 
        ? rawPromoData 
        : (rawPromoData?.data || rawPromoData?.promotions || []);
      
      setActivePromotions(promosList);

      const hasTodas = cats.some(c => c.id === 'todas' || c.name.trim().toLowerCase() === 'todas');
      const finalCats = hasTodas ? cats : [{ id: 'todas', name: 'Todas' }, ...cats];
      
      setDbCategories(finalCats);
    } catch (error) {
      console.error("🔥 Error al cargar menú y promociones en POS", error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleStockUpdate = (updates) => {
      setDbProducts(prevProducts => prevProducts.map(p => {
        const update = updates.find(u => u.id === p.id);
        if (update) {
          return { 
            ...p, 
            stock: update.stock, 
            // Blindaje: Solo sobreescribir isAgotado si viene en el payload
            isAgotado: update.isAgotado !== undefined ? update.isAgotado : p.isAgotado 
          };
        }
        return p;
      }));
    };

    const handlePromoChange = async () => {
      try {
        const res = await client.get('/promotions');
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : (raw?.data || raw?.promotions || []);
        setActivePromotions(list);
      } catch (err) {
        console.error('🔥 Error sincronizando promos vía socket:', err);
      }
    };

    // 🔥 FIX: Suscripciones correctas alineadas con el backend
    socket.on('stock:update', handleStockUpdate);
    socket.on('menu:promotions_updated', handlePromoChange);
    socket.on('pos:update', loadData); // Soporte nativo para refresco global forzado

    return () => {
      socket.off('stock:update', handleStockUpdate);
      socket.off('menu:promotions_updated', handlePromoChange);
      socket.off('pos:update', loadData);
    };
  }, [loadData]);

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
    dbProducts, 
    dbCategories,
    activePromotions, 
    filtroTexto, 
    setFiltroTexto,
    categoriaActiva, 
    setCategoriaActiva,
    filteredProducts
  };
};