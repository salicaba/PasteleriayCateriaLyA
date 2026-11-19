// frontend/src/components/SystemVisuals.jsx
import React from 'react';

/**
 * Ilustración ambiental fija para el fondo del Sidebar izquierdo.
 * Usa pointer-events-none para no interferir con los clics ni el scroll del menú.
 */
export const SidebarArtwork = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
    >
      {/* Brillo ambiental suave en la esquina inferior izquierda */}
      <div
        className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full blur-3xl transition-colors duration-500"
        style={{ background: 'radial-gradient(circle, var(--sidebar-glow) 0%, transparent 70%)' }}
      />

      {/* Textura de puntitos muy sutil desvanecida hacia arriba */}
      <div
        className="absolute inset-x-0 bottom-0 h-72 opacity-60 transition-colors duration-500"
        style={{
          backgroundImage: 'radial-gradient(var(--sidebar-dot-color) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.9) 10%, transparent 100%)',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,0.9) 10%, transparent 100%)',
        }}
      />

      {/* Ilustración minimalista de línea fina (Cafetería & Pastelería) */}
      <div className="absolute inset-x-0 bottom-20 flex flex-col items-center justify-end px-5">
        <svg
          viewBox="0 0 200 150"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-44 h-auto text-gray-900/[0.07] dark:text-orange-100/[0.06] lya:text-lya-text/[0.11] transition-colors duration-300"
        >
          {/* Arco decorativo de fondo */}
          <path
            d="M24 128 C 24 64, 176 64, 176 128"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="3 5"
            strokeLinecap="round"
          />

          {/* Línea base / mesita */}
          <line
            x1="20"
            y1="128"
            x2="180"
            y2="128"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />

          {/* Taza de café (izquierda) */}
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {/* Cuerpo de la taza */}
            <path d="M46 92 H86 V109 C86 119 77 125 66 125 C55 125 46 119 46 109 Z" />
            {/* Asa */}
            <path d="M86 96 H92 C97 96 100 99 100 104 C100 109 97 112 92 112 H86" />
            {/* Platito */}
            <path d="M40 128 H92" />
            {/* Detalle curvo dentro de la taza */}
            <path d="M52 100 C54 112 60 118 68 119" strokeWidth="1.1" opacity="0.6" />
            {/* Vapor aromático */}
            <path d="M58 84 C55 78, 61 73, 58 67" strokeWidth="1.3" />
            <path d="M67 82 C64 75, 70 70, 67 62" strokeWidth="1.3" />
            <path d="M76 84 C73 78, 79 73, 76 67" strokeWidth="1.3" />
          </g>

          {/* Rebanada de pastel (derecha) */}
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {/* Base del pastel */}
            <path d="M110 104 H158 V128 H110 Z" />
            {/* Capa de relleno intermedia */}
            <path d="M110 115 C118 118, 126 112, 134 115 C142 118, 150 112, 158 115" strokeWidth="1.2" />
            {/* Perspectiva superior */}
            <path d="M110 104 L138 86 L158 104" />
            {/* Betún ondulado superior */}
            <path d="M114 104 C118 108, 124 108, 128 104 C132 108, 138 108, 142 104 C146 108, 152 108, 156 104" strokeWidth="1.2" />
            {/* Cereza arriba */}
            <circle cx="137" cy="82" r="4.5" />
            <path d="M138 78 C140 73, 144 71, 147 72" strokeWidth="1.2" />
          </g>

          {/* Granos de café y destellos decorativos */}
          <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            {/* Destello superior izquierdo */}
            <path d="M40 52 V60 M36 56 H44" />
            {/* Destello superior derecho */}
            <path d="M156 58 V68 M151 63 H161" />
            {/* Destello central */}
            <circle cx="104" cy="48" r="2" />
            <circle cx="164" cy="82" r="1.5" />
            <circle cx="34" cy="88" r="1.5" />
          </g>
        </svg>

        {/* Marca de agua discreta justo encima del botón de Cerrar Sesión */}
        <div className="mt-1 flex items-center gap-2 text-gray-900/[0.14] dark:text-gray-100/[0.12] lya:text-lya-text/[0.22] transition-colors duration-300">
          <span className="h-px w-4 bg-current" />
          <span className="text-[9px] font-bold uppercase tracking-[0.22em]">
            𝓛𝔂α · POS
          </span>
          <span className="h-px w-4 bg-current" />
        </div>
      </div>
    </div>
  );
};

/**
 * Fondo global adaptativo del área principal derecha (detrás de todas las tarjetas, tablas y vistas).
 * Se adapta automáticamente a Modo Claro, Modo Oscuro y Tema LyA mediante variables CSS.
 */
export const WorkspaceBackdrop = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
    >
      {/* 1. Halos de luz ambiental (Ambient Mesh Glows) */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          backgroundImage: `
            radial-gradient(620px circle at 92% 6%, var(--canvas-glow-1), transparent 62%),
            radial-gradient(540px circle at 8% 96%, var(--canvas-glow-2), transparent 62%)
          `,
        }}
      />

      {/* 2. Patrón temático de cafetería y pastelería (toma el color del tema vía mask-image) */}
      <div className="lya-canvas-pattern absolute inset-0 transition-colors duration-500" />
    </div>
  );
};