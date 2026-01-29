// Reemplazos web para componentes de React Native
import React from 'react';

// Reemplazo de View
export const View = ({ style, children, className, ...props }: any) => {
  const styles = convertStyleToCSS(style);
  return (
    <div style={styles} className={className} {...props}>
      {children}
    </div>
  );
};

// Reemplazo de Text
export const Text = ({ style, children, className, ...props }: any) => {
  const styles = convertStyleToCSS(style);
  return (
    <p style={styles} className={className} {...props}>
      {children}
    </p>
  );
};

// Reemplazo de ScrollView
export const ScrollView = ({ style, children, className, ...props }: any) => {
  const styles = {
    overflowY: 'auto',
    ...convertStyleToCSS(style)
  };
  return (
    <div style={styles} className={className} {...props}>
      {children}
    </div>
  );
};

// Reemplazo de SafeAreaView
export const SafeAreaView = ({ style, children, className, ...props }: any) => {
  const styles = convertStyleToCSS(style);
  return (
    <div style={styles} className={className} {...props}>
      {children}
    </div>
  );
};

// Reemplazo de TouchableOpacity
export const TouchableOpacity = ({ style, onPress, children, className, ...props }: any) => {
  const styles = {
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    ...convertStyleToCSS(style)
  };
  return (
    <div
      style={styles}
      className={className}
      onClick={onPress}
      onMouseDown={(e) => (e.currentTarget.style.opacity = '0.7')}
      onMouseUp={(e) => (e.currentTarget.style.opacity = '1')}
      {...props}
    >
      {children}
    </div>
  );
};

// Reemplazo de Image
export const Image = ({ source, style, className, ...props }: any) => {
  const styles = convertStyleToCSS(style);
  const uri = source?.uri || source;
  return (
    <img
      src={uri}
      style={styles}
      className={className}
      {...props}
    />
  );
};

// Función helper para convertir estilos de React Native a CSS
function convertStyleToCSS(style: any): React.CSSProperties {
  if (!style) return {};

  const cssStyle: React.CSSProperties = {};

  for (const key in style) {
    const value = style[key];

    if (key === 'flex') {
      cssStyle.flex = value;
    } else if (key === 'justifyContent') {
      cssStyle.justifyContent = value as any;
    } else if (key === 'alignItems') {
      cssStyle.alignItems = value as any;
    } else if (key === 'flexDirection') {
      cssStyle.flexDirection = value as any;
    } else if (key === 'width') {
      cssStyle.width = typeof value === 'number' ? `${value}px` : value;
    } else if (key === 'height') {
      cssStyle.height = typeof value === 'number' ? `${value}px` : value;
    } else if (key === 'padding') {
      cssStyle.padding = typeof value === 'number' ? `${value}px` : value;
    } else if (key === 'paddingHorizontal') {
      cssStyle.paddingLeft = typeof value === 'number' ? `${value}px` : value;
      cssStyle.paddingRight = typeof value === 'number' ? `${value}px` : value;
    } else if (key === 'paddingVertical') {
      cssStyle.paddingTop = typeof value === 'number' ? `${value}px` : value;
      cssStyle.paddingBottom = typeof value === 'number' ? `${value}px` : value;
    } else if (key === 'margin') {
      cssStyle.margin = typeof value === 'number' ? `${value}px` : value;
    } else if (key === 'marginHorizontal') {
      cssStyle.marginLeft = typeof value === 'number' ? `${value}px` : value;
      cssStyle.marginRight = typeof value === 'number' ? `${value}px` : value;
    } else if (key === 'marginVertical') {
      cssStyle.marginTop = typeof value === 'number' ? `${value}px` : value;
      cssStyle.marginBottom = typeof value === 'number' ? `${value}px` : value;
    } else if (key === 'fontSize') {
      cssStyle.fontSize = typeof value === 'number' ? `${value}px` : value;
    } else if (key === 'fontWeight') {
      cssStyle.fontWeight = value as any;
    } else if (key === 'color') {
      cssStyle.color = value;
    } else if (key === 'backgroundColor') {
      cssStyle.backgroundColor = value;
    } else if (key === 'borderRadius') {
      cssStyle.borderRadius = typeof value === 'number' ? `${value}px` : value;
    } else if (key === 'borderBottomWidth') {
      cssStyle.borderBottomWidth = `${value}px`;
    } else if (key === 'borderTopWidth') {
      cssStyle.borderTopWidth = `${value}px`;
    } else if (key === 'borderColor') {
      cssStyle.borderColor = value;
    } else {
      (cssStyle as any)[key] = value;
    }
  }

  return cssStyle;
}

export default {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
};
