import React, { FC, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { SCREEN_WIDTH } from '../../../constants/Screen';
import usePath from '../../../hooks/usePath';
import TabItem from './TabItem';
import AnimatedCircle from './AnimatedCircle';
import { getPathXCenterByIndex } from '../../../utils/Path';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const CustomBottomTab: FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { containerPath, curvedPaths, tHeight } = usePath();
  const circleXCoordinate = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    const centerX = getPathXCenterByIndex(curvedPaths, state.index);
    circleXCoordinate.value = withTiming(centerX - 30, {
      duration: 400,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [state.index]);

  const selectIcon = (routeName: string) => {
    switch (routeName) {
      case 'Mapa':
        return 'map';
      case 'Puntos':
        return 'award';
      case 'Amigos':
        return 'users';
      case 'Usuario':
        return 'user';
      case 'AdminPanel':
        return 'settings';
      default:
        return 'map';
    }
  };

  const animatedProps = useAnimatedProps(() => {
    const currentPath = curvedPaths[Math.round(progress.value)] || curvedPaths[0];
    return {
      d: `${containerPath} ${currentPath}`,
    };
  });

  const handleTabPress = (index: number, tab: string) => {
    navigation.navigate(tab);
    progress.value = withTiming(index, {
      duration: 400,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  };

  return (
    <View style={styles.tabBarContainer}>
      <Svg
        width={Dimensions.get('window').width}
        height={tHeight}
        style={styles.shadowMd}
      >
        <AnimatedPath fill={'#54CD64'} animatedProps={animatedProps} />
      </Svg>
      <AnimatedCircle circleX={circleXCoordinate} />
      <View
        style={[
          styles.tabItemsContainer,
          {
            height: tHeight,
            width: Dimensions.get('window').width,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ? options.tabBarLabel : route.name;
          return (
            <TabItem
              key={index.toString()}
              label={label as string}
              icon={selectIcon(route.name)}
              activeIndex={state.index}
              index={index}
              onTabPress={() => handleTabPress(index, route.name)}
            />
          );
        })}
      </View>
    </View>
  );
};

export default CustomBottomTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    zIndex: 2,
  },
  tabItemsContainer: {
    position: 'absolute',
    flexDirection: 'row',
    width: '100%',
  },
  shadowMd: {
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
