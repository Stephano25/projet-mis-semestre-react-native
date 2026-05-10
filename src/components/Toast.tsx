import { useEffect, useRef } from 'react';
import { Text, Animated } from 'react-native';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
}

export default function Toast({ message, visible, onHide }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onHide());
    }, 2000);

    return () => clearTimeout(timer);
  }, [visible, onHide, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        opacity,
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        zIndex: 999,
      }}
    >
      <Text style={{ color: 'white', fontSize: 14 }}>{message}</Text>
    </Animated.View>
  );
}