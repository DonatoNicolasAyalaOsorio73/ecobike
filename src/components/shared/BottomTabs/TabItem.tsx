import { Pressable, StyleSheet, Text, View } from 'react-native';
import React, { FC, useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

type TabItemProps = {
  label: string;
  icon: string;
  index: number;
  activeIndex: number;
  onTabPress: () => void;
};

const TabItem: FC<TabItemProps> = ({ label, icon, index, activeIndex, onTabPress }) => {
  const iconOpacity = useSharedValue(activeIndex === index ? 1 : 0.5);
  const iconScale = useSharedValue(activeIndex === index ? 1.2 : 1);
  const textOpacity = useSharedValue(activeIndex === index ? 1 : 0.6);

  useEffect(() => {
    if (activeIndex === index) {
      iconOpacity.value = withTiming(1, { duration: 300 });
      iconScale.value = withSpring(1.2, {
        damping: 12,
        stiffness: 200,
      });
      textOpacity.value = withTiming(1, { duration: 300 });
    } else {
      iconOpacity.value = withTiming(0.5, { duration: 300 });
      iconScale.value = withSpring(1, {
        damping: 12,
        stiffness: 200,
      });
      textOpacity.value = withTiming(0.6, { duration: 300 });
    }
  }, [activeIndex, index]);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      opacity: iconOpacity.value,
      transform: [{ scale: iconScale.value }],
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
    };
  });

  return (
    <Pressable
      style={styles.container}
      onPress={onTabPress}
    >
      <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
        <Feather
          name={icon as any}
          size={24}
          color={activeIndex === index ? '#54CD64' : '#353147'}
        />
      </Animated.View>
      <Animated.Text style={[styles.label, animatedTextStyle]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
};

export default TabItem;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#353147',
  },
});
