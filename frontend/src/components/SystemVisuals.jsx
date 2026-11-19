// frontend/src/components/SystemVisuals.jsx
import React from 'react';

/**
 * Decoración ambiental para el Sidebar izquierdo.
 * Luce con claridad cuando el menú está contraído y se atenúa suavemente
 * cuando se despliega algún submenú para nunca estorbar la lectura.
 */
export const SidebarArtwork = ({ hasExpandedMenu = false }) => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
    >
      {/* 1. Brillo ambiental cálido en la zona baja del sidebar */}
      <div
        className="absolute -bottom-20 -left-16 w-72 h-72 rounded-full blur-3xl transition-all duration-500"
        style={{ background: 'radial-gradient(circle, var(--sidebar-glow) 0%, transparent 72%)' }}
      />
      <div
        className="absolute bottom-24 -right-16 w-48 h-48 rounded-full blur-3xl transition-all duration-500 opacity-75"
        style={{ background: 'radial-gradient(circle, var(--sidebar-glow-2) 0%, transparent 72%)' }}
      />

      {/* 2. Textura de puntitos desvanecida hacia arriba */}
      <div
        className="absolute inset-x-0 bottom-0 h-80 transition-opacity duration-500"
        style={{
          opacity: hasExpandedMenu ? 0.25 : 0.85,
          backgroundImage: 'radial-gradient(var(--sidebar-dot-color) 1.15px, transparent 1.15px)',
          backgroundSize: '14px 14px',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.95) 18%, transparent 100%)',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,0.95) 18%, transparent 100%)',
        }}
      />

      {/* 3. Escena ilustrada de Cafetería & Pastelería (se atenúa al abrir submenús) */}
      <div
        className={`absolute inset-x-0 bottom-[76px] flex flex-col items-center justify-end px-4 transition-all duration-500 ${
          hasExpandedMenu ? 'opacity-20 scale-95 translate-y-2' : 'opacity-100 scale-100 translate-y-0'
        }`}
      >
        <svg
          viewBox="0 0 220 175"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-52 h-auto transition-colors duration-300"
        >
          {/* Halo circular suave detrás de la escena */}
          <circle
            cx="110"
            cy="104"
            r="64"
            className="fill-orange-500/[0.06] dark:fill-orange-400/[0.07] lya:fill-lya-primary/[0.16]"
          />

          {/* Arco punteado decorativo */}
          <path
            d="M22 146 C 22 66, 198 66, 198 146"
            className="stroke-gray-900/15 dark:stroke-gray-100/15 lya:stroke-lya-text/25"
            strokeWidth="1.2"
            strokeDasharray="3 6"
            strokeLinecap="round"
          />

          {/* Repisa / barra */}
          <line
            x1="16"
            y1="146"
            x2="204"
            y2="146"
            className="stroke-gray-900/20 dark:stroke-gray-100/20 lya:stroke-lya-text/30"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <line
            x1="44"
            y1="152"
            x2="176"
            y2="152"
            className="stroke-gray-900/10 dark:stroke-gray-100/10 lya:stroke-lya-text/20"
            strokeWidth="1.1"
            strokeLinecap="round"
          />

          {/* Cupcake pequeño (izquierda) */}
          <g
            className="stroke-gray-800/25 dark:stroke-gray-200/20 lya:stroke-lya-text/35"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M32 128 L36 146 H54 L58 128 Z" />
            <path d="M41 128 L42 146 M49 128 L48 146" strokeWidth="1" opacity="0.6" />
            <path
              d="M30 128 C30 120, 35 117, 38 113 C40 108, 50 108, 52 113 C55 117, 60 120, 60 128 Z"
              className="fill-orange-500/[0.08] dark:fill-orange-400/[0.10] lya:fill-lya-primary/[0.22]"
            />
            <circle
              cx="45"
              cy="106"
              r="2.8"
              className="stroke-orange-500/45 dark:stroke-orange-400/45 lya:stroke-lya-primary/70 fill-orange-500/20 lya:fill-lya-primary/35"
            />
          </g>

          {/* Taza de café protagonista (centro-izquierda) */}
          <g
            className="stroke-gray-800/30 dark:stroke-orange-100/25 lya:stroke-lya-text/40"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Cuerpo de la taza */}
            <path
              d="M72 104 H118 V124 C118 136 108 143 95 143 C82 143 72 136 72 124 Z"
              className="fill-white/40 dark:fill-gray-900/40 lya:fill-lya-surface/60"
            />
            {/* Asa */}
            <path d="M118 109 H125 C130 109 134 113 134 118 C134 123 130 127 125 127 H118" />
            {/* Platito */}
            <path d="M66 146 H124" />
            {/* Corazón de arte latte / detalle frontal */}
            <path
              d="M95 128 C95 128 87 123 87 118.5 C87 116 89 114.5 91.5 114.5 C93.2 114.5 94.4 115.5 95 116.8 C95.6 115.5 96.8 114.5 98.5 114.5 C101 114.5 103 116 103 118.5 C103 123 95 128 95 128 Z"
              className="stroke-orange-500/50 dark:stroke-orange-400/50 lya:stroke-lya-primary/75 fill-orange-500/15 dark:fill-orange-400/15 lya:fill-lya-primary/30"
              strokeWidth="1.3"
            />
            {/* Vapor aromático con color de acento */}
            <g className="stroke-orange-500/45 dark:stroke-orange-400/45 lya:stroke-lya-secondary/75" strokeWidth="1.4">
              <path d="M84 95 C80 87, 88 81, 84 73" />
              <path d="M95 92 C91 83, 99 77, 95 67" />
              <path d="M106 95 C102 87, 110 81, 106 73" />
            </g>
          </g>

          {/* Rebanada de pastel (derecha) */}
          <g
            className="stroke-gray-800/30 dark:stroke-orange-100/25 lya:stroke-lya-text/40"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Cuerpo del pastel */}
            <path
              d="M140 118 H192 V146 H140 Z"
              className="fill-white/40 dark:fill-gray-900/40 lya:fill-lya-surface/60"
            />
            {/* Relleno ondulado */}
            <path
              d="M140 132 C148 135, 156 129, 166 132 C176 135, 184 129, 192 132"
              className="stroke-orange-500/45 dark:stroke-orange-400/45 lya:stroke-lya-secondary/70"
              strokeWidth="1.4"
            />
            {/* Tapa en perspectiva */}
            <path
              d="M140 118 L170 98 L192 118"
              className="fill-orange-500/[0.08] dark:fill-orange-400/[0.10] lya:fill-lya-primary/[0.22]"
            />
            {/* Betún ondulado */}
            <path
              d="M144 118 C148 123, 154 123, 158 118 C162 123, 168 123, 172 118 C176 123, 182 123, 188 118"
              strokeWidth="1.3"
            />
            {/* Cereza arriba */}
            <circle
              cx="169"
              cy="93"
              r="5"
              className="stroke-orange-500/55 dark:stroke-orange-400/55 lya:stroke-lya-primary/80 fill-orange-500/20 dark:fill-orange-400/20 lya:fill-lya-primary/40"
              strokeWidth="1.4"
            />
            <path d="M170 88 C172 82, 177 80, 181 81" strokeWidth="1.3" />
          </g>

          {/* Estrellitas, destellos y granos de café flotando */}
          <g className="stroke-orange-500/40 dark:stroke-orange-400/40 lya:stroke-lya-secondary/70" strokeWidth="1.4" strokeLinecap="round">
            <path d="M46 68 V78 M41 73 H51" />
            <path d="M174 62 V72 M169 67 H179" />
            <path d="M132 52 V58 M129 55 H135" />
          </g>
          <g className="fill-gray-700/20 dark:fill-gray-200/20 lya:fill-lya-primary/45">
            <circle cx="64" cy="86" r="2" />
            <circle cx="144" cy="78" r="2.2" />
            <circle cx="192" cy="92" r="1.8" />
            <circle cx="28" cy="102" r="1.8" />
          </g>
        </svg>

        {/* Sello editorial elegante justo encima del botón de Cerrar Sesión */}
        <div className="mt-1.5 flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-2 text-gray-800/35 dark:text-gray-200/30 lya:text-lya-text/50 transition-colors duration-300">
            <span className="h-px w-5 bg-current opacity-60" />
            <span className="text-[11px] font-bold tracking-[0.16em]">
              𝓛𝔂α
            </span>
            <span className="h-px w-5 bg-current opacity-60" />
          </div>
          <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-gray-500/45 dark:text-gray-400/35 lya:text-lya-text/45">
            Cafetería · Pastelería
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Fondo global adaptativo del área principal derecha (detrás de todas las tarjetas, tablas y vistas).
 * Combina halos de luz ambiental, micro-malla de puntos, patrón temático de cafetería/pastelería
 * y una marca de agua sutil de LyA.
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
            radial-gradient(720px circle at 92% 4%, var(--canvas-glow-1), transparent 60%),
            radial-gradient(640px circle at 6% 94%, var(--canvas-glow-2), transparent 60%),
            radial-gradient(520px circle at 52% 48%, var(--canvas-glow-3), transparent 65%)
          `,
        }}
      />

      {/* 2. Micro-malla de puntos muy limpia para darle textura profesional */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          backgroundImage: 'radial-gradient(var(--canvas-dot-color) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* 3. Patrón temático de cafetería y pastelería (cambia de color automáticamente por tema) */}
      <div className="lya-canvas-pattern absolute inset-0 transition-colors duration-500" />

      {/* 4. Monograma gigante muy sutil en la esquina inferior derecha */}
      <div className="absolute -bottom-6 right-6 font-bold text-[10rem] sm:text-[13rem] leading-none tracking-[-0.12em] text-gray-900/[0.03] dark:text-white/[0.025] lya:text-lya-text/[0.05] transition-colors duration-300">
        𝓛𝔂α
      </div>
    </div>
  );
};