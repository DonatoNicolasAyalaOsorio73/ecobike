import React from 'react';
import {StyleSheet} from 'react-native';
import Animated, {useAnimatedStyle, withSpring, SharedValue} from 'react-native-reanimated';
import Svg, {Circle} from 'react-native-svg';

const AnimatedCircle = ({circleX}: {circleX: SharedValue<number>}) => {
  const circleContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withSpring(circleX.value, {
            damping: 15,
            stiffness: 150,
          }),
        },
      ],
    };
  }, []);

  return (
    <Animated.View style={[styles.container, circleContainerStyle]}>
      <Svg width={60} height={60}>
        <Circle
          cx={30}
          cy={30}
          r={25}
          fill="#54CD64"
          strokeWidth={3}
          stroke="#fff"
        />
      </Svg>
    </Animated.View>
  );
};

export default AnimatedCircle;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -30,
    left: 0,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
