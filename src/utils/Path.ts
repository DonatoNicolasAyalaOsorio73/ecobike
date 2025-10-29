import { SCREEN_WIDTH } from '../constants/Screen';

const NUM_TABS = 4;

export const getPathXCenter = (currentPath: string) => {
  // Extraer todas las coordenadas X del path SVG
  const matches = currentPath.match(/[-+]?[0-9]*\.?[0-9]+/g);
  if (!matches || matches.length < 2) return 0;
  
  // Tomar coordenadas X (posiciones impares en el array)
  const xCoordinates = matches.filter((_, i) => i % 2 === 0).map(parseFloat);
  
  if (xCoordinates.length === 0) return 0;
  
  const minX = Math.min(...xCoordinates);
  const maxX = Math.max(...xCoordinates);
  
  return (minX + maxX) / 2;
};

export const getPathXCenterByIndex = (tabPaths: string[], index: number) => {
  // Calcular centro directamente desde el índice (más eficiente)
  const tabWidth = SCREEN_WIDTH / NUM_TABS;
  return tabWidth * (index + 0.5); // +0.5 para centrar
};
