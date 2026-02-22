import { motion } from 'framer-motion';

export const SplitText = ({ text, className = "" }) => {
  // Dividimos el texto en caracteres
  const letters = Array.from(text);

  // Variantes para el contenedor (el padre controla el retraso de los hijos)
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: 0.04 * i },
    }),
  };

  // Variantes para cada letra
  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.div
      style={{ display: "flex", overflow: "hidden", flexWrap: "wrap", justifyContent: "center" }}
      variants={container}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {letters.map((letter, index) => (
        <motion.span
          variants={child}
          key={index}
          style={{ marginRight: letter === " " ? "0.25em" : "0px" }}
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </motion.div>
  );
};