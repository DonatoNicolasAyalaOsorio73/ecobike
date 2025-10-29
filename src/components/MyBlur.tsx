import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { 
  useSharedValue,
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  Easing 
} from 'react-native-reanimated';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export default function MyBlur({ children, ...props }: any) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { 
        duration: 20000, 
        easing: Easing.linear 
      }),
      -1,
      false
    );

    scale.value = withRepeat(
      withTiming(1.3, { 
        duration: 4000, 
        easing: Easing.inOut(Easing.ease) 
      }),
      -1,
      true
    );
  }, []);

  const circleAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
        { scale: scale.value }
      ],
    };
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8F5E9', '#81C784', '#4CAF50']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
        {...props}
      />
      
      <Animated.View style={[styles.blurCircleContainer, circleAnimatedStyle]}>
        <LinearGradient
          colors={['rgba(76, 175, 80, 0.8)', 'rgba(129, 199, 132, 0.9)', 'rgba(46, 125, 50, 0.7)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.circleGradient}
        />
      </Animated.View>

      <BlurView intensity={40} style={styles.blurOverlay} />
      
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
    height: '100%',
  },
  blurCircleContainer: {
    position: 'absolute',
    width: 400,
    height: 400,
    top: '50%',
    left: '50%',
    marginLeft: -200,
    marginTop: -200,
  },
  circleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 200,
  },
  blurOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
});