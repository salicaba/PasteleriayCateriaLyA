// frontend/src/components/SystemVisuals.jsx
import React from 'react';

/**
 * Decoración ambiental de altura completa para el Sidebar izquierdo.
 * Llena con armonía todo el espacio vacío desde "Sistema" hasta "Cerrar Sesión"
 * y se atenúa suavemente cuando se despliega algún submenú.
 */
export const SidebarArtwork = ({ hasExpandedMenu = false }) => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
    >
      {/* 1. Halos suaves de ambiente */}
      <div
        className="absolute -bottom-20 -left-16 w-72 h-72 rounded-full blur-3xl transition-all duration-500"
        style={{ background: 'radial-gradient(circle, var(--sidebar-glow) 0%, transparent 72%)' }}
      />
      <div
        className="absolute top-[46%] -right-16 w-56 h-56 rounded-full blur-3xl transition-all duration-500"
        style={{ background: 'radial-gradient(circle, var(--sidebar-glow-2) 0%, transparent 72%)' }}
      />

      {/* 2. Patrón sutil de fondo en todo el sidebar (más presente de la mitad hacia abajo) */}
      <svg
        className="absolute inset-0 w-full h-full transition-opacity duration-500"
        style={{
          opacity: hasExpandedMenu ? 0.25 : 0.9,
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 42%, rgba(0,0,0,0.35) 75%, rgba(0,0,0,0.08) 100%)',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 42%, rgba(0,0,0,0.35) 75%, rgba(0,0,0,0.08) 100%)',
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="lya-sidebar-pattern" width="64" height="64" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="12" r="1.2" className="fill-gray-400/35 dark:fill-gray-400/20 lya:fill-lya-border/55" />
            <circle cx="42" cy="28" r="1.2" className="fill-orange-400/35 dark:fill-orange-400/25 lya:fill-lya-primary/50" />
            <circle cx="24" cy="52" r="1.1" className="fill-gray-400/30 dark:fill-gray-400/20 lya:fill-lya-secondary/50" />
            {/* Mini destello */}
            <path
              d="M52 10 V16 M49 13 H55"
              className="stroke-orange-400/35 dark:stroke-orange-400/25 lya:stroke-lya-primary/55"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
            {/* Mini grano de café */}
            <g
              transform="translate(14 32) rotate(25)"
              className="stroke-gray-400/30 dark:stroke-gray-400/20 lya:stroke-lya-text/25"
              fill="none"
              strokeWidth="1.1"
              strokeLinecap="round"
            >
              <ellipse cx="0" cy="0" rx="3" ry="4.5" />
              <path d="M0 -4.5 C1 -1.5, -1 1.5, 0 4.5" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lya-sidebar-pattern)" />
      </svg>

      {/* 3. Composición vertical completa (cubre desde debajo de "Sistema" hasta "Cerrar Sesión") */}
      <div
        className={`absolute inset-x-0 bottom-[74px] flex flex-col items-center justify-end px-3 transition-all duration-500 ${
          hasExpandedMenu ? 'opacity-15 scale-95 translate-y-2' : 'opacity-100 scale-100 translate-y-0'
        }`}
      >
        <svg
          viewBox="0 0 220 330"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[208px] h-auto transition-colors duration-300"
        >
          {/* ===== ZONA SUPERIOR (llena el espacio vacío debajo de "Sistema") ===== */}
          {/* Marco arqueado superior fino */}
          <path
            d="M28 115 C 28 38, 192 38, 192 115"
            className="stroke-gray-900/[0.08] dark:stroke-gray-100/[0.08] lya:stroke-lya-border/40"
            strokeWidth="1.1"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />

          {/* Lámpara colgante de cafetería con cono de luz cálida */}
          <g strokeLinecap="round" strokeLinejoin="round">
            {/* Cono de luz suave */}
            <path
              d="M96 68 L62 155 H158 L124 68 Z"
              className="fill-orange-500/[0.045] dark:fill-orange-400/[0.055] lya:fill-lya-primary/[0.11]"
            />
            {/* Cable */}
            <line
              x1="110"
              y1="14"
              x2="110"
              y2="52"
              className="stroke-gray-700/25 dark:stroke-gray-200/20 lya:stroke-lya-text/35"
              strokeWidth="1.4"
            />
            {/* Base del foco */}
            <rect
              x="105"
              y="48"
              width="10"
              height="6"
              rx="2"
              className="stroke-gray-700/30 dark:stroke-gray-200/25 lya:stroke-lya-text/40 fill-white/60 dark:fill-gray-900/50 lya:fill-lya-surface/80"
              strokeWidth="1.3"
            />
            {/* Pantalla de la lámpara */}
            <path
              d="M92 68 C94 56, 126 56, 128 68 Z"
              className="stroke-gray-700/30 dark:stroke-gray-200/25 lya:stroke-lya-text/45 fill-orange-500/[0.10] dark:fill-orange-400/[0.12] lya:fill-lya-secondary/[0.25]"
              strokeWidth="1.5"
            />
            {/* Bombillita */}
            <path
              d="M105 68 A5 5 0 0 0 115 68"
              className="stroke-orange-500/55 dark:stroke-orange-400/55 lya:stroke-lya-primary/80 fill-orange-400/25 lya:fill-lya-primary/40"
              strokeWidth="1.3"
            />
            {/* Rayitos de la lámpara */}
            <g className="stroke-orange-500/40 dark:stroke-orange-400/40 lya:stroke-lya-primary/65" strokeWidth="1.2">
              <line x1="110" y1="77" x2="110" y2="83" />
              <line x1="99" y1="75" x2="95" y2="80" />
              <line x1="121" y1="75" x2="125" y2="80" />
            </g>
          </g>

          {/* ===== ZONA MEDIA (croissant, macaron, granos y hojas flotantes) ===== */}
          {/* Croissant flotando a la izquierda */}
          <g
            transform="translate(46 112) rotate(-14)"
            className="stroke-gray-700/25 dark:stroke-orange-100/22 lya:stroke-lya-text/35"
            strokeWidth="1.45"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M-20 4 C-14 -12, 14 -12, 20 4 C14 9, 8 7, 0 7 C-8 7, -14 9, -20 4 Z"
              className="fill-orange-500/[0.08] dark:fill-orange-400/[0.09] lya:fill-lya-border/[0.22]"
            />
            <path d="M-9 -6 L-6 7 M9 -6 L6 7" strokeWidth="1.2" />
            <path d="M0 -8 V7" strokeWidth="1.1" opacity="0.7" />
          </g>

          {/* Macaron flotando a la derecha */}
          <g
            transform="translate(174 114) rotate(12)"
            className="stroke-gray-700/25 dark:stroke-orange-100/22 lya:stroke-lya-text/35"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Tapa superior */}
            <path
              d="M-14 -2 C-14 -10, 14 -10, 14 -2 Z"
              className="fill-orange-500/[0.09] dark:fill-orange-400/[0.10] lya:fill-lya-primary/[0.28]"
            />
            {/* Relleno cremoso */}
            <path
              d="M-15 1 C-11 -1, -7 3, -3 1 C1 -1, 5 3, 9 1 C12 0, 14 2, 15 1"
              className="stroke-orange-500/50 dark:stroke-orange-400/50 lya:stroke-lya-secondary/80"
              strokeWidth="1.6"
            />
            {/* Base inferior */}
            <path
              d="M-14 4 C-14 11, 14 11, 14 4 Z"
              className="fill-orange-500/[0.09] dark:fill-orange-400/[0.10] lya:fill-lya-primary/[0.28]"
            />
          </g>

          {/* Granos de café flotando en el medio */}
          <g
            transform="translate(64 156) rotate(32)"
            className="stroke-gray-700/25 dark:stroke-gray-200/22 lya:stroke-lya-text/35 fill-white/40 dark:fill-gray-900/40 lya:fill-lya-surface/50"
            strokeWidth="1.35"
          >
            <ellipse cx="0" cy="0" rx="5.5" ry="8" />
            <path d="M0 -8 C2 -3, -2 3, 0 8" fill="none" />
          </g>
          <g
            transform="translate(154 158) rotate(-26)"
            className="stroke-gray-700/25 dark:stroke-gray-200/22 lya:stroke-lya-text/35 fill-white/40 dark:fill-gray-900/40 lya:fill-lya-surface/50"
            strokeWidth="1.35"
          >
            <ellipse cx="0" cy="0" rx="5" ry="7.2" />
            <path d="M0 -7.2 C1.8 -2.5, -1.8 2.5, 0 7.2" fill="none" />
          </g>

          {/* Estrellitas y destellos repartidos arriba y en medio */}
          <g className="stroke-orange-500/45 dark:stroke-orange-400/45 lya:stroke-lya-secondary/80" strokeWidth="1.4" strokeLinecap="round">
            <path d="M44 58 V68 M39 63 H49" />
            <path d="M174 52 V62 M169 57 H179" />
            <path d="M110 120 V128 M106 124 H114" />
            <path d="M30 166 V174 M26 170 H34" />
            <path d="M190 164 V172 M186 168 H194" />
          </g>
          <g className="fill-orange-500/25 dark:fill-orange-400/25 lya:fill-lya-primary/50">
            <circle cx="76" cy="46" r="2.2" />
            <circle cx="146" cy="42" r="2" />
            <circle cx="88" cy="144" r="1.8" />
            <circle cx="134" cy="140" r="2.2" />
            <circle cx="26" cy="134" r="1.6" />
            <circle cx="194" cy="136" r="1.6" />
          </g>

          {/* ===== ZONA INFERIOR PROTAGONISTA (Mostrador Cafetería & Pastelería) ===== */}
          <g transform="translate(0, 152)">
            {/* Halo circular suave */}
            <circle
              cx="110"
              cy="104"
              r="66"
              className="fill-orange-500/[0.07] dark:fill-orange-400/[0.08] lya:fill-lya-primary/[0.17]"
            />

            {/* Arco punteado */}
            <path
              d="M20 146 C 20 64, 200 64, 200 146"
              className="stroke-gray-900/15 dark:stroke-gray-100/15 lya:stroke-lya-text/25"
              strokeWidth="1.2"
              strokeDasharray="3 6"
              strokeLinecap="round"
            />

            {/* Repisa / mostrador */}
            <line
              x1="14"
              y1="146"
              x2="206"
              y2="146"
              className="stroke-gray-900/22 dark:stroke-gray-100/22 lya:stroke-lya-text/35"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <line
              x1="42"
              y1="152"
              x2="178"
              y2="152"
              className="stroke-gray-900/12 dark:stroke-gray-100/12 lya:stroke-lya-text/22"
              strokeWidth="1.1"
              strokeLinecap="round"
            />

            {/* Cupcake (izquierda) */}
            <g
              className="stroke-gray-800/30 dark:stroke-gray-200/25 lya:stroke-lya-text/40"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M30 128 L34 146 H54 L58 128 Z" />
              <path d="M40 128 L41 146 M48 128 L47 146" strokeWidth="1" opacity="0.6" />
              <path
                d="M28 128 C28 120, 33 117, 36 113 C38 108, 50 108, 52 113 C55 117, 60 120, 60 128 Z"
                className="fill-orange-500/[0.10] dark:fill-orange-400/[0.12] lya:fill-lya-primary/[0.26]"
              />
              <circle
                cx="44"
                cy="106"
                r="2.8"
                className="stroke-orange-500/55 dark:stroke-orange-400/55 lya:stroke-lya-primary/80 fill-orange-500/25 lya:fill-lya-primary/40"
              />
            </g>

            {/* Taza de café protagonista (centro) */}
            <g
              className="stroke-gray-800/35 dark:stroke-orange-100/30 lya:stroke-lya-text/45"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M72 104 H118 V124 C118 136 108 143 95 143 C82 143 72 136 72 124 Z"
                className="fill-white/55 dark:fill-gray-900/45 lya:fill-lya-surface/75"
              />
              <path d="M118 109 H125 C130 109 134 113 134 118 C134 123 130 127 125 127 H118" />
              <path d="M66 146 H124" />
              {/* Corazón arte latte */}
              <path
                d="M95 128 C95 128 87 123 87 118.5 C87 116 89 114.5 91.5 114.5 C93.2 114.5 94.4 115.5 95 116.8 C95.6 115.5 96.8 114.5 98.5 114.5 C101 114.5 103 116 103 118.5 C103 123 95 128 95 128 Z"
                className="stroke-orange-500/60 dark:stroke-orange-400/60 lya:stroke-lya-primary/85 fill-orange-500/20 dark:fill-orange-400/20 lya:fill-lya-primary/35"
                strokeWidth="1.3"
              />
              {/* Vapor aromático */}
              <g className="stroke-orange-500/50 dark:stroke-orange-400/50 lya:stroke-lya-secondary/80" strokeWidth="1.45">
                <path d="M84 95 C80 86, 88 80, 84 71" />
                <path d="M95 92 C91 82, 99 76, 95 65" />
                <path d="M106 95 C102 86, 110 80, 106 71" />
              </g>
            </g>

            {/* Rebanada de pastel (derecha) */}
            <g
              className="stroke-gray-800/35 dark:stroke-orange-100/30 lya:stroke-lya-text/45"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M140 118 H192 V146 H140 Z"
                className="fill-white/55 dark:fill-gray-900/45 lya:fill-lya-surface/75"
              />
              <path
                d="M140 132 C148 135, 156 129, 166 132 C176 135, 184 129, 192 132"
                className="stroke-orange-500/55 dark:stroke-orange-400/55 lya:stroke-lya-secondary/80"
                strokeWidth="1.5"
              />
              <path
                d="M140 118 L170 98 L192 118"
                className="fill-orange-500/[0.10] dark:fill-orange-400/[0.12] lya:fill-lya-primary/[0.26]"
              />
              <path
                d="M144 118 C148 123, 154 123, 158 118 C162 123, 168 123, 172 118 C176 123, 182 123, 188 118"
                strokeWidth="1.3"
              />
              <circle
                cx="169"
                cy="93"
                r="5"
                className="stroke-orange-500/60 dark:stroke-orange-400/60 lya:stroke-lya-primary/85 fill-orange-500/25 dark:fill-orange-400/25 lya:fill-lya-primary/45"
                strokeWidth="1.4"
              />
              <path d="M170 88 C172 82, 177 80, 181 81" strokeWidth="1.3" />
            </g>
          </g>
        </svg>

        {/* Sello editorial elegante justo encima de Cerrar Sesión */}
        <div className="-mt-1 flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-2 text-gray-800/40 dark:text-gray-200/35 lya:text-lya-text/55 transition-colors duration-300">
            <span className="h-px w-5 bg-current opacity-60" />
            <span className="text-[11px] font-bold tracking-[0.16em]">𝓛𝔂α</span>
            <span className="h-px w-5 bg-current opacity-60" />
          </div>
          <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-gray-500/50 dark:text-gray-400/40 lya:text-lya-text/50">
            Cafetería · Pastelería
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Fondo global adaptativo del área principal derecha (detrás de todas las tarjetas, tablas y vistas).
 * Viste los bordes y espacios vacíos con halos de luz, un mosaico temático SVG bicolor
 * e ilustraciones grandes asomándose en las esquinas.
 */
export const WorkspaceBackdrop = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
    >
      {/* 1. Halos de luz ambiental en las esquinas (adaptables a Claro / Oscuro / LyA) */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          backgroundImage: `
            radial-gradient(760px circle at 96% 4%, var(--canvas-glow-1), transparent 58%),
            radial-gradient(700px circle at 4% 96%, var(--canvas-glow-2), transparent 58%),
            radial-gradient(560px circle at 50% 50%, var(--canvas-glow-3), transparent 65%)
          `,
        }}
      />

      {/* 2. Mosaico temático SVG inline (infalible y bicolor: neutral + color de acento del tema) */}
      <svg
        className="absolute inset-0 w-full h-full transition-colors duration-500"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="lya-workspace-pattern" width="220" height="220" patternUnits="userSpaceOnUse">
            {/* Puntitos de malla sutiles */}
            <circle cx="12" cy="12" r="1.1" className="fill-gray-400/30 dark:fill-white/10 lya:fill-lya-text/15" />
            <circle cx="122" cy="12" r="1.1" className="fill-gray-400/30 dark:fill-white/10 lya:fill-lya-text/15" />
            <circle cx="12" cy="122" r="1.1" className="fill-gray-400/30 dark:fill-white/10 lya:fill-lya-text/15" />
            <circle cx="122" cy="122" r="1.1" className="fill-gray-400/30 dark:fill-white/10 lya:fill-lya-text/15" />

            {/* Taza de café */}
            <g
              transform="translate(46 46) rotate(-10)"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-gray-500/[0.16] dark:stroke-gray-300/[0.09] lya:stroke-lya-text/[0.15]"
            >
              <path d="M-12 -4 H12 V8 A12 12 0 0 1 -12 8 Z" />
              <path d="M12 0 H16 A4.5 4.5 0 0 1 16 9 H12" />
              <path d="M-16 14 H16" />
              <path
                d="M-4 -10 Q-2 -14 -4 -18 M4 -11 Q6 -15 4 -19"
                className="stroke-orange-500/[0.24] dark:stroke-orange-400/[0.15] lya:stroke-lya-secondary/[0.32]"
              />
            </g>

            {/* Rebanada de pastel */}
            <g
              transform="translate(164 52) rotate(9)"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-gray-500/[0.16] dark:stroke-gray-300/[0.09] lya:stroke-lya-text/[0.15]"
            >
              <path d="M-16 0 H16 V16 H-16 Z" />
              <path
                d="M-16 8 H16"
                className="stroke-orange-500/[0.24] dark:stroke-orange-400/[0.15] lya:stroke-lya-primary/[0.34]"
              />
              <path d="M-16 0 L3 -13 L16 0" />
              <circle
                cx="3"
                cy="-16"
                r="3"
                className="stroke-orange-500/[0.28] dark:stroke-orange-400/[0.18] lya:stroke-lya-primary/[0.38]"
              />
            </g>

            {/* Grano de café central */}
            <g
              transform="translate(110 108) rotate(28)"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="stroke-orange-500/[0.22] dark:stroke-orange-400/[0.13] lya:stroke-lya-border/[0.35]"
            >
              <ellipse cx="0" cy="0" rx="7.5" ry="11.5" />
              <path d="M0 -11.5 C2.5 -4, -2.5 4, 0 11.5" />
            </g>

            {/* Cupcake */}
            <g
              transform="translate(54 166) rotate(-8)"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-gray-500/[0.16] dark:stroke-gray-300/[0.09] lya:stroke-lya-text/[0.15]"
            >
              <path d="M-12 2 L-8 16 H8 L12 2 Z" />
              <path d="M-14 2 C-14 -4, -9 -6, -7 -10 C-5 -14, 5 -14, 7 -10 C9 -6, 14 -4, 14 2 Z" />
              <circle
                cx="0"
                cy="-15"
                r="2.5"
                className="stroke-orange-500/[0.26] dark:stroke-orange-400/[0.16] lya:stroke-lya-primary/[0.36]"
              />
            </g>

            {/* Croissant */}
            <g
              transform="translate(168 170) rotate(-7)"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="stroke-gray-500/[0.16] dark:stroke-gray-300/[0.09] lya:stroke-lya-text/[0.15]"
            >
              <path d="M-18 4 C-12 -10, 12 -10, 18 4 C12 8, 7 6, 0 6 C-7 6, -12 8, -18 4 Z" />
              <path d="M-8 -5 L-5 6 M8 -5 L5 6" />
            </g>

            {/* Destellos y estrellitas repartidas */}
            <g
              className="stroke-orange-500/[0.24] dark:stroke-orange-400/[0.15] lya:stroke-lya-secondary/[0.34]"
              strokeWidth="1.4"
              strokeLinecap="round"
            >
              <path d="M110 24 V34 M105 29 H115" />
              <path d="M22 106 V114 M18 110 H26" />
              <path d="M198 108 V116 M194 112 H202" />
              <path d="M110 186 V196 M105 191 H115" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lya-workspace-pattern)" />
      </svg>

      {/* 3. Ilustración decorativa esquina SUPERIOR DERECHA (enmarca el borde superior) */}
      <svg
        viewBox="0 0 260 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute -top-6 -right-6 w-56 sm:w-72 h-auto transition-colors duration-500"
      >
        <circle
          cx="210"
          cy="40"
          r="118"
          className="stroke-orange-500/[0.15] dark:stroke-orange-400/[0.12] lya:stroke-lya-primary/[0.32]"
          strokeWidth="1.4"
          strokeDasharray="6 8"
        />
        <circle
          cx="210"
          cy="40"
          r="86"
          className="stroke-gray-500/[0.12] dark:stroke-white/[0.08] lya:stroke-lya-secondary/[0.32]"
          strokeWidth="1.2"
        />
        {/* Destellos */}
        <g className="stroke-orange-500/35 dark:stroke-orange-400/30 lya:stroke-lya-primary/55" strokeWidth="1.6" strokeLinecap="round">
          <path d="M112 72 V86 M105 79 H119" />
          <path d="M152 134 V144 M147 139 H157" />
        </g>
        <circle cx="94" cy="112" r="3" className="fill-orange-500/25 dark:fill-orange-400/20 lya:fill-lya-secondary/45" />
      </svg>

      {/* 4. Ilustración decorativa esquina INFERIOR IZQUIERDA (adorna el borde izquierdo vacío) */}
      <svg
        viewBox="0 0 260 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute -bottom-8 -left-6 w-56 sm:w-72 h-auto transition-colors duration-500"
      >
        {/* Halo de apoyo */}
        <circle
          cx="58"
          cy="202"
          r="98"
          className="fill-indigo-500/[0.045] dark:fill-indigo-400/[0.06] lya:fill-lya-secondary/[0.14]"
        />
        {/* Arco decorativo */}
        <path
          d="M12 78 C 118 82, 186 150, 190 250"
          className="stroke-gray-500/[0.16] dark:stroke-gray-300/[0.10] lya:stroke-lya-text/[0.18]"
          strokeWidth="1.3"
          strokeDasharray="5 7"
          strokeLinecap="round"
        />
        {/* Rama de cafeto estilizada */}
        <g
          className="stroke-gray-600/[0.22] dark:stroke-gray-300/[0.14] lya:stroke-lya-text/[0.24]"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 248 C48 194, 88 156, 148 124" />
          {/* Hojitas */}
          <path
            d="M52 198 C34 176, 40 150, 62 146 C68 166, 66 184, 52 198 Z"
            className="fill-orange-500/[0.07] dark:fill-orange-400/[0.08] lya:fill-lya-secondary/[0.22]"
          />
          <path
            d="M84 168 C102 184, 128 182, 138 164 C118 154, 98 156, 84 168 Z"
            className="fill-orange-500/[0.07] dark:fill-orange-400/[0.08] lya:fill-lya-secondary/[0.22]"
          />
          <path
            d="M112 144 C102 122, 114 102, 134 102 C136 120, 126 134, 112 144 Z"
            className="fill-orange-500/[0.07] dark:fill-orange-400/[0.08] lya:fill-lya-primary/[0.22]"
          />
          {/* Granos / cerezas de café */}
          <g className="stroke-orange-500/35 dark:stroke-orange-400/30 lya:stroke-lya-primary/60 fill-orange-500/15 dark:fill-orange-400/15 lya:fill-lya-primary/30">
            <circle cx="72" cy="184" r="6" />
            <circle cx="84" cy="192" r="5" />
            <circle cx="102" cy="152" r="5.5" />
          </g>
        </g>
        {/* Destellos */}
        <g className="stroke-orange-500/35 dark:stroke-orange-400/30 lya:stroke-lya-primary/55" strokeWidth="1.5" strokeLinecap="round">
          <path d="M36 118 V130 M30 124 H42" />
          <path d="M160 198 V210 M154 204 H166" />
        </g>
      </svg>

      {/* 5. Ilustración decorativa esquina INFERIOR DERECHA (pastel en base + monograma LyA) */}
      <div className="absolute bottom-3 right-5 flex flex-col items-end">
        <svg
          viewBox="0 0 280 210"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-60 sm:w-80 h-auto transition-colors duration-500"
        >
          {/* Halo cálido */}
          <circle
            cx="200"
            cy="145"
            r="96"
            className="fill-orange-500/[0.06] dark:fill-orange-400/[0.07] lya:fill-lya-primary/[0.16]"
          />
          {/* Campana / exhibidor de pastelería minimalista */}
          <g
            className="stroke-gray-600/[0.20] dark:stroke-gray-300/[0.13] lya:stroke-lya-text/[0.24]"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Cúpula de cristal */}
            <path d="M110 162 C110 92, 250 92, 250 162" strokeDasharray="5 6" />
            <circle
              cx="180"
              cy="94"
              r="7"
              className="stroke-orange-500/40 dark:stroke-orange-400/35 lya:stroke-lya-primary/65 fill-orange-500/15 lya:fill-lya-primary/30"
            />
            {/* Base / pedestal */}
            <line x1="94" y1="162" x2="266" y2="162" strokeWidth="2" />
            <path d="M158 162 L152 184 H208 L202 162" />
            <line x1="138" y1="184" x2="222" y2="184" strokeWidth="2" />

            {/* Pastel de dos pisos adentro */}
            <rect
              x="136"
              y="134"
              width="88"
              height="28"
              rx="4"
              className="fill-white/40 dark:fill-gray-900/30 lya:fill-lya-surface/50"
            />
            <rect
              x="152"
              y="114"
              width="56"
              height="20"
              rx="4"
              className="fill-orange-500/[0.08] dark:fill-orange-400/[0.10] lya:fill-lya-primary/[0.22]"
            />
            {/* Ondas de betún */}
            <path
              d="M136 144 C144 149, 152 140, 162 144 C172 149, 180 140, 190 144 C200 149, 212 140, 224 144"
              className="stroke-orange-500/40 dark:stroke-orange-400/35 lya:stroke-lya-secondary/70"
              strokeWidth="1.5"
            />
            {/* Corazón / cereza en la cima */}
            <circle
              cx="180"
              cy="108"
              r="4.5"
              className="stroke-orange-500/50 dark:stroke-orange-400/45 lya:stroke-lya-primary/75 fill-orange-500/20 lya:fill-lya-primary/40"
            />
          </g>

          {/* Destellos flotando alrededor */}
          <g className="stroke-orange-500/40 dark:stroke-orange-400/35 lya:stroke-lya-secondary/70" strokeWidth="1.6" strokeLinecap="round">
            <path d="M88 120 V132 M82 126 H94" />
            <path d="M244 82 V94 M238 88 H250" />
            <path d="M126 76 V84 M122 80 H130" />
          </g>
        </svg>

        {/* Monograma discreto */}
        <span className="-mt-8 mr-3 font-bold text-5xl sm:text-6xl leading-none tracking-[-0.12em] text-gray-900/[0.06] dark:text-white/[0.05] lya:text-lya-text/[0.10] transition-colors duration-300">
          𝓛𝔂α
        </span>
      </div>
    </div>
  );
};