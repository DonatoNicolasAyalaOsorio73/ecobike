import {
  add,
  Canvas,
  Circle,
  LinearGradient,
  vec,
  sub,
  Fill,
  useLoop,
  mix,
  BackdropFilter,
  Blur,
} from '@shopify/react-native-skia';
import * as React from 'react';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const c = vec(width / 2, (height / 2) * 1.5);
const r = c.x - 32;

export default function MyBlur() {
  const progress = useLoop({ duration: 50 });

  const start = sub(c, vec(0, mix(progress.current, r, r)));
  const end = add(c, vec(0, mix(progress.current, r, r / 2)));

  return (
    <Canvas style={{ width: '100%', height: '100%', position: 'absolute' }}>
      <Fill color={'#e5e8ef'} />
      <Circle c={c} r={r}>
        <LinearGradient start={start} end={end} colors={['#ADF14B', '#54CD64']} />
      </Circle>
      <BackdropFilter filter={<Blur blur={20} />}>
        <Fill color={'#DFE3E610'} />
      </BackdropFilter>
    </Canvas>
  );
}
