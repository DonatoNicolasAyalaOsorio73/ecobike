import React, { FC, useMemo, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native'; // Importamos Dimensions
import Svg, { Path } from 'react-native-svg';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { interpolatePath } from 'react-native-redash';

import { SCREEN_WIDTH } from '../../../constants/Screen';
import usePath from '../../../hooks/usePath';
import { getPathXCenter } from '../../../utils/Path';
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
  const progress = useSharedValue(1);

  const handleMoveCircle = (currentPath: string) => {
    circleXCoordinate.value = getPathXCenter(currentPath);
  };

  const selectIcon = (routeName: string) => {
    switch (routeName) {
      case 'Casa':
        return 'home';
      case 'Mapa':
        return 'map';
      case 'Puntos':
        return 'award';
      case 'Usuario':
        return 'user';
      default:
        return 'home';
    }
  };

  const animatedProps = useAnimatedProps(() => {
    const currentPath = interpolatePath(
      progress.value,
      Array.from({ length: curvedPaths.length }, (_, index) => index + 1),
      curvedPaths,
    );
    runOnJS(handleMoveCircle)(currentPath);
    return {
      d: `${containerPath} ${currentPath}`,
    };
  });

  const handleTabPress = (index: number, tab: string) => {
    navigation.navigate(tab);
    progress.value = withTiming(index);
  };

  return (
    <View style={styles.tabBarContainer}>
      <Svg width={Dimensions.get('window').width} height={tHeight} style={styles.shadowMd}>
        <AnimatedPath fill={'#ADF14B'} animatedProps={animatedProps} />
      </Svg>
      <AnimatedCircle circleX={circleXCoordinate} />
      <View
        style={[
          styles.tabItemsContainer,
          {
            height: tHeight,
            width: Dimensions.get('window').width, // Usamos las dimensiones de la ventana
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
              activeIndex={state.index + 1}
              index={index}
              onTabPress={() => handleTabPress(index + 1, route.name)}
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
    bottom: 0, // Ajustamos el valor de 'bottom' para que esté en la parte inferior de la pantalla
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
