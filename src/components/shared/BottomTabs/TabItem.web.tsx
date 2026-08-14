import { Pressable, StyleSheet, Text } from 'react-native';
import React, { FC, useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { getPathXCenterByIndex } from '../../../utils/Path';
import usePath from '../../../hooks/usePath';
import { SCREEN_WIDTH } from '../../../constants/Screen';

export type TabProps = {
  label: string;
  icon: string;
  index: number;
  activeIndex: number;
  onTabPress: () => void;
};

const ICON_SIZE = 25;
const LABEL_WIDTH = SCREEN_WIDTH / 4;

// ponytail: @expo/vector-icons doesn't support setNativeProps on web so we skip
// animatedProps for color — position animations (translateY/X) still run via CSS
const TabItem: FC<TabProps> = ({ label, icon, index, activeIndex, onTabPress }) => {
  const { curvedPaths } = usePath();
  const animatedActiveIndex = useSharedValue(activeIndex);
  const iconPosition = getPathXCenterByIndex(curvedPaths, index);
  const labelPosition = getPathXCenterByIndex(curvedPaths, index);

  const tabStyle = useAnimatedStyle(() => {
    const translateY = animatedActiveIndex.value - 1 === index ? -15 : 20;
    const iconPositionX = iconPosition - index * ICON_SIZE;
    return {
      width: ICON_SIZE,
      height: ICON_SIZE,
      transform: [
        { translateY: withTiming(translateY) },
        { translateX: iconPositionX - ICON_SIZE / 2 },
      ],
    };
  });

  const labelContainerStyle = useAnimatedStyle(() => {
    const translateY = animatedActiveIndex.value - 1 === index ? 36 : 100;
    return {
      transform: [
        { translateY: withTiming(translateY) },
        { translateX: labelPosition - LABEL_WIDTH / 2 },
      ],
    };
  });

  useEffect(() => {
    animatedActiveIndex.value = activeIndex;
  }, [activeIndex]);

  return (
    <>
      <Animated.View style={tabStyle}>
        <Pressable
          testID={`tab${label}`}
          hitSlop={{ top: 30, bottom: 30, left: 50, right: 50 }}
          onPress={onTabPress}
        >
          <Feather name={icon as any} size={25} color="#3e3742" />
        </Pressable>
      </Animated.View>
      <Animated.View style={[labelContainerStyle, styles.labelContainer]}>
        <Text style={styles.label}>{label}</Text>
      </Animated.View>
    </>
  );
};

export default TabItem;

const styles = StyleSheet.create({
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    width: LABEL_WIDTH,
  },
  label: {
    color: 'white',
    fontSize: 17,
  },
});
