// src/modules/cafeteria/controllers/usePosMenu.js
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
          console.error("⚠️ Error exacto al pedir promociones (¿La ruta es /promotions o /menu/promotions?):", err);
          return { data: [] };
        })
      ]);
      
      // 🔍 DEBUG LOG INYECTADO PARA DIAGNÓSTICO
      console.log("🔍 PROMO DEBUG - Datos crudos recibidos del backend:", promoRes.data);

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

      // EXTRACCIÓN SEGURA ASEGURANDO QUE SEA UN ARREGLO
      const rawPromoData = promoRes.data;
      const promosList = Array.isArray(rawPromoData) 
        ? rawPromoData 
        : (rawPromoData?.data || rawPromoData?.promotions || []);
      
      console.log("🔍 PROMO DEBUG - Promociones procesadas para el estado:", promosList);
      setActivePromotions(promosList);

      const hasTodas = cats.some(c => c.id === 'todas' || c.name.trim().toLowerCase() === 'todas');
      const finalCats = hasTodas ? cats : [{ id: 'todas', name: 'Todas' }, ...cats];
      
      setDbCategories(finalCats);
    } catch (error) {
      console.error("Error al cargar menú y promociones en POS", error);
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
          return { ...p, stock: update.stock, isAgotado: update.isAgotado };
        }
        return p;
      }));
    };

    const handlePromoChange = async () => {
      try {
        const res = await client.get('/promotions');
        console.log("🔍 PROMO DEBUG (Socket) - Promos actualizadas:", res.data);
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : (raw?.data || raw?.promotions || []);
        setActivePromotions(list);
      } catch (err) {
        console.error('Error sincronizando promos vía socket:', err);
      }
    };

    socket.on('stock:update', handleStockUpdate);
    socket.on('promotion_created', handlePromoChange);
    socket.on('promotion_updated', handlePromoChange);
    socket.on('promotion_deleted', handlePromoChange);

    return () => {
      socket.off('stock:update', handleStockUpdate);
      socket.off('promotion_created', handlePromoChange);
      socket.off('promotion_updated', handlePromoChange);
      socket.off('promotion_deleted', handlePromoChange);
    };
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