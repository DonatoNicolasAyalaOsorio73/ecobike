import { parse } from 'react-native-redash';

export const getPathXCenter = (currentPath: string) => {
  const curves = parse(currentPath).curves;
  if (!curves) {
    // Manejo del caso en que 'curves' es undefined
    return null; // o un valor predeterminado apropiado
  }
  const startPoint = curves[0].to;
  const endPoint = curves[curves.length - 1].to;
  const centerX = (startPoint.x + endPoint.x) / 2;
  return centerX;
};

export const getPathXCenterByIndex = (tabPaths: any[], index: number) => {
  if (tabPaths[index] && tabPaths[index].curves) {
    const curves = tabPaths[index].curves;
    const startPoint = curves[0].to;
    const endPoint = curves[curves.length - 1].to;
    const centerX = (startPoint.x + endPoint.x) / 2;
    return centerX;
  }
  // Manejo del caso en que 'tabPaths[index]' o 'tabPaths[index].curves' es undefined
  return null; // o un valor predeterminado apropiado
};
