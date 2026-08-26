import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import TabItem from './TabItem';
import AnimatedCircle from './AnimatedCircle';
import { useSharedValue } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const tabs = [
  { label: 'Inicio', icon: 'home' },
  { label: 'Actividad', icon: 'activity' },
  { label: 'Premios', icon: 'gift' },
  { label: 'Perfil', icon: 'user' },
];

type BottomTabsProps = {
  onTabChange: (index: number) => void;
};

const BottomTabs = ({ onTabChange }: BottomTabsProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const circleX = useSharedValue(0);

  const handleTabPress = (index: number) => {
    setActiveIndex(index);
    onTabChange(index);
    const tabWidth = width / tabs.length;
    circleX.value = index * tabWidth + tabWidth / 2 - 30;
  };

  return (
    <View style={styles.container}>
      <AnimatedCircle circleX={circleX} />
      <View style={styles.tabsContainer}>
        {tabs.map((tab, index) => (
          <TabItem
            key={index}
            label={tab.label}
            icon={tab.icon}
            index={index}
            activeIndex={activeIndex}
            onTabPress={() => handleTabPress(index)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    height: 60,
  },
});

export default BottomTabs;