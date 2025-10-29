import React, { FC } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { SCREEN_WIDTH } from '../../../constants/Screen';
import usePath from '../../../hooks/usePath';
import TabItem from './TabItem';
import AnimatedCircle from './AnimatedCircle';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const CustomBottomTab: FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { containerPath, curvedPaths, tHeight } = usePath();
  const circleXCoordinate = useSharedValue(0);
  const progress = useSharedValue(0);

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
      default:
        return 'map';
    }
  };

  const animatedProps = useAnimatedProps(() => {
    const index = Math.round(progress.value);
    const currentPath = curvedPaths[index] || curvedPaths[0];

    return {
      d: `${containerPath} ${currentPath}`,
    };
  });

  const handleTabPress = (index: number, tab: string) => {
    navigation.navigate(tab);
    progress.value = withTiming(index, { duration: 300 });

    // Calcular posición X del círculo
    const tabWidth = SCREEN_WIDTH / state.routes.length;
    circleXCoordinate.value = withTiming(tabWidth * index + tabWidth / 2, {
      duration: 300,
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
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 3 },
  },
});
