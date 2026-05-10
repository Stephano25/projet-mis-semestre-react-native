import { useEffect } from 'react';
import { View, Text, Animated } from 'react-native';

export default function Toast({ message, visible, onHide }: { message: string; visible: boolean; onHide: () => void }) {
  const opacity = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(onHide);
      }, 2000);
    }
  }, [visible]);

  if (!visible) return null;
  return (
    <Animated.View style={{ opacity, position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: 'black', padding: 10, borderRadius: 8 }}>
      <Text style={{ color: 'white' }}>{message}</Text>
    </Animated.View>
  );
}