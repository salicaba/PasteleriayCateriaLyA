import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// 📍 DICCIONARIO DE RUTAS (Puedes agregar o quitar según necesites)
const routeTitles = {
  '/cafeteria': 'Lya | Cafetería',
  '/pasteleria': 'Lya | Pastelería',
  '/caja': 'Lya | Caja',
  '/admin/menu': 'Lya | Gestor Menú',
  '/admin/inventario': 'Lya | Inventario',
  '/admin/reportes': 'Lya | Reportes',
  '/qr': 'Lya | Menú Digital'
};

export const TitleManager = () => {
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;
    
    // Título por defecto (Fallback Poka-Yoke)
    let newTitle = 'Lya | POS';

    // 1. Buscamos coincidencia exacta primero
    if (routeTitles[currentPath]) {
      newTitle = routeTitles[currentPath];
    } else {
      // 2. Si es una subruta (ej. /cafeteria/mesas), hereda el título padre ("Lya | Cafetería")
      const baseRoute = Object.keys(routeTitles).find(
        route => route !== '/' && currentPath.startsWith(route)
      );
      
      if (baseRoute) {
        newTitle = routeTitles[baseRoute];
      }
    }

    // Inyectamos el título
    document.title = newTitle;
  }, [location]);

  // Es un componente fantasma, no rompe el DOM ni la UI
  return null; 
};