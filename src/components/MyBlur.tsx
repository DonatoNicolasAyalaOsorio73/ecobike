import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { 
  useSharedValue,
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  withDelay,
  Easing,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';

const { height } = Dimensions.get('window');

export default function MyBlur({ children, ...props }: any) {
  // Base grande que siempre está visible
  const baseProgress = useSharedValue(0);
  
  // Burbujas pequeñas que suben
  const bubble1 = useSharedValue(0);
  const bubble2 = useSharedValue(0);
  const bubble3 = useSharedValue(0);
  const bubble4 = useSharedValue(0);
  const bubble5 = useSharedValue(0);
  const bubble6 = useSharedValue(0);
  const bubble7 = useSharedValue(0);
  const bubble8 = useSharedValue(0);
  const bubble9 = useSharedValue(0);
  const bubble10 = useSharedValue(0);

  useEffect(() => {
    // Base - Movimiento horizontal ondulante como lava
    baseProgress.value = withRepeat(
      withTiming(1, { 
        duration: 8000, 
        easing: Easing.bezier(0.45, 0.05, 0.55, 0.95)
      }),
      -1,
      true
    );

    // Burbujas con easing suave y más rápidas
    const smoothEasing = Easing.bezier(0.4, 0.0, 0.2, 1.0);

    // Burbuja 1
    bubble1.value = withRepeat(
      withTiming(1, { 
        duration: 5000, 
        easing: smoothEasing
      }),
      -1,
      false
    );

    // Burbuja 2
    bubble2.value = withDelay(
      500,
      withRepeat(
        withTiming(1, { 
          duration: 5500, 
          easing: smoothEasing
        }),
        -1,
        false
      )
    );

    // Burbuja 3
    bubble3.value = withDelay(
      1000,
      withRepeat(
        withTiming(1, { 
          duration: 4800, 
          easing: smoothEasing
        }),
        -1,
        false
      )
    );

    // Burbuja 4
    bubble4.value = withDelay(
      1500,
      withRepeat(
        withTiming(1, { 
          duration: 5200, 
          easing: smoothEasing
        }),
        -1,
        false
      )
    );

    // Burbuja 5
    bubble5.value = withDelay(
      2000,
      withRepeat(
        withTiming(1, { 
          duration: 5800, 
          easing: smoothEasing
        }),
        -1,
        false
      )
    );

    // Burbuja 6
    bubble6.value = withDelay(
      2500,
      withRepeat(
        withTiming(1, { 
          duration: 4900, 
          easing: smoothEasing
        }),
        -1,
        false
      )
    );

    // Burbuja 7
    bubble7.value = withDelay(
      3000,
      withRepeat(
        withTiming(1, { 
          duration: 5300, 
          easing: smoothEasing
        }),
        -1,
        false
      )
    );

    // Burbuja 8
    bubble8.value = withDelay(
      3500,
      withRepeat(
        withTiming(1, { 
          duration: 5100, 
          easing: smoothEasing
        }),
        -1,
        false
      )
    );

    // Burbuja 9
    bubble9.value = withDelay(
      4000,
      withRepeat(
        withTiming(1, { 
          duration: 5600, 
          easing: smoothEasing
        }),
        -1,
        false
      )
    );

    // Burbuja 10
    bubble10.value = withDelay(
      4500,
      withRepeat(
        withTiming(1, { 
          duration: 4700, 
          easing: smoothEasing
        }),
        -1,
        false
      )
    );
  }, []);

  // Base grande con movimiento de lámpara de lava
  const baseAnimatedStyle = useAnimatedStyle(() => {
    // Movimiento horizontal ondulante
    const translateX = interpolate(
      baseProgress.value, 
      [0, 0.25, 0.5, 0.75, 1], 
      [0, 35, 0, -35, 0]
    );
    
    // Escala horizontal (se estira y comprime)
    const scaleX = interpolate(
      baseProgress.value, 
      [0, 0.2, 0.4, 0.6, 0.8, 1], 
      [1, 1.18, 1.05, 1.15, 1.08, 1]
    );
    
    // Escala vertical (respiración)
    const scaleY = interpolate(
      baseProgress.value, 
      [0, 0.3, 0.5, 0.7, 1], 
      [1, 0.88, 1.08, 0.92, 1]
    );
    
    // Movimiento vertical sutil
    const translateY = interpolate(
      baseProgress.value, 
      [0, 0.5, 1], 
      [0, -20, 0]
    );
    
    return {
      transform: [
        { translateX },
        { translateY },
        { scaleX },
        { scaleY },
      ],
      opacity: 0.9,
    };
  });

  // Función helper para crear estilos de burbujas que salen de la base
  const createBubbleStyle = (
    progress: SharedValue<number>, 
    maxHeight: number,
    startX: number
  ) => {
    return useAnimatedStyle(() => {
      // Inicia desde la parte superior de la base
      const translateY = interpolate(
        progress.value, 
        [0, 0.1, 1], 
        [0, -30, -height * maxHeight]
      );
      
      // Movimiento horizontal ondulante
      const translateX = interpolate(
        progress.value, 
        [0, 0.2, 0.4, 0.6, 0.8, 1], 
        [startX, startX + 25, startX - 18, startX + 22, startX - 12, startX + 5]
      );
      
      // Escala: empieza pequeña, crece al separarse, se encoge arriba
      const scale = interpolate(
        progress.value, 
        [0, 0.05, 0.12, 0.5, 0.88, 1], 
        [0, 0.35, 0.55, 0.7, 0.45, 0]
      );
      
      // Rotación suave
      const rotate = interpolate(progress.value, [0, 1], [0, 200]);
      
      return {
        transform: [
          { translateX },
          { translateY },
          { scale },
          { rotate: `${rotate}deg` },
        ],
        opacity: interpolate(
          progress.value, 
          [0, 0.05, 0.12, 0.5, 0.88, 1], 
          [0, 0.5, 0.85, 0.9, 0.55, 0]
        ),
      };
    });
  };

  const bubble1Style = createBubbleStyle(bubble1, 0.85, -45);
  const bubble2Style = createBubbleStyle(bubble2, 0.88, 25);
  const bubble3Style = createBubbleStyle(bubble3, 0.82, -65);
  const bubble4Style = createBubbleStyle(bubble4, 0.9, 45);
  const bubble5Style = createBubbleStyle(bubble5, 0.86, -25);
  const bubble6Style = createBubbleStyle(bubble6, 0.84, 65);
  const bubble7Style = createBubbleStyle(bubble7, 0.87, 0);
  const bubble8Style = createBubbleStyle(bubble8, 0.89, -50);
  const bubble9Style = createBubbleStyle(bubble9, 0.83, 35);
  const bubble10Style = createBubbleStyle(bubble10, 0.91, -15);

  return (
    <View style={styles.container}>
      {/* Fondo blanco */}
      <View style={styles.whiteBackground} />
      
      {/* Base grande con movimiento de lava - Color #64cd69 */}
      <Animated.View style={[styles.baseContainer, baseAnimatedStyle]}>
        <LinearGradient
          colors={['#64cd69', '#7dd77f', '#64cd69']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.base}
        />
      </Animated.View>

      {/* Burbujas que salen de la base */}
      <Animated.View style={[styles.bubbleContainer, bubble1Style]}>
        <LinearGradient
          colors={['#64cd69', '#7dd77f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bubbleGradient}
        />
      </Animated.View>

      <Animated.View style={[styles.bubbleContainer, bubble2Style]}>
        <LinearGradient
          colors={['#7dd77f', '#64cd69']}
          start={{ x: 0.2, y: 0.2 }}
          end={{ x: 0.8, y: 0.8 }}
          style={styles.bubbleGradient}
        />
      </Animated.View>

      <Animated.View style={[styles.bubbleContainer, bubble3Style]}>
        <LinearGradient
          colors={['#64cd69', '#7dd77f']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={styles.bubbleGradient}
        />
      </Animated.View>

      <Animated.View style={[styles.bubbleContainer, bubble4Style]}>
        <LinearGradient
          colors={['#7dd77f', '#64cd69']}
          start={{ x: 0.3, y: 0.3 }}
          end={{ x: 0.7, y: 0.7 }}
          style={styles.bubbleGradient}
        />
      </Animated.View>

      <Animated.View style={[styles.bubbleContainer, bubble5Style]}>
        <LinearGradient
          colors={['#64cd69', '#7dd77f']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bubbleGradient}
        />
      </Animated.View>

      <Animated.View style={[styles.bubbleContainer, bubble6Style]}>
        <LinearGradient
          colors={['#7dd77f', '#64cd69']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.bubbleGradient}
        />
      </Animated.View>

      <Animated.View style={[styles.bubbleContainer, bubble7Style]}>
        <LinearGradient
          colors={['#64cd69', '#7dd77f']}
          start={{ x: 0.6, y: 0.4 }}
          end={{ x: 0.4, y: 0.6 }}
          style={styles.bubbleGradient}
        />
      </Animated.View>

      <Animated.View style={[styles.bubbleContainer, bubble8Style]}>
        <LinearGradient
          colors={['#7dd77f', '#64cd69']}
          start={{ x: 0.4, y: 0.6 }}
          end={{ x: 0.6, y: 0.4 }}
          style={styles.bubbleGradient}
        />
      </Animated.View>

      <Animated.View style={[styles.bubbleContainer, bubble9Style]}>
        <LinearGradient
          colors={['#64cd69', '#7dd77f']}
          start={{ x: 0.7, y: 0.3 }}
          end={{ x: 0.3, y: 0.7 }}
          style={styles.bubbleGradient}
        />
      </Animated.View>

      <Animated.View style={[styles.bubbleContainer, bubble10Style]}>
        <LinearGradient
          colors={['#7dd77f', '#64cd69']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={styles.bubbleGradient}
        />
      </Animated.View>

      {/* Blur estilo iOS */}
      <BlurView intensity={55} tint="light" style={styles.blurOverlay} />
      
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  whiteBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  // Base grande con movimiento
  baseContainer: {
    position: 'absolute',
    width: '120%',
    height: 450,
    left: '-10%',
    bottom: -80,
  },
  base: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 280,
    borderTopRightRadius: 280,
  },
  bubbleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
  },
  // Todas las burbujas usan el mismo contenedor
  bubbleContainer: {
    position: 'absolute',
    width: 65,
    height: 65,
    left: '50%',
    bottom: 220, // Salen desde la parte superior de la base
    marginLeft: -32.5,
  },
  blurOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
});