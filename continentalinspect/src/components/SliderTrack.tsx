import { useRef, type ReactNode } from 'react';
import { PanResponder, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type SliderTrackProps = {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  onRatioChange: (ratio: number) => void;
};

/**
 * Horizontal drag track. Uses window pageX so the value does not jump when
 * fill/knob layout changes under the finger, and does not yield to a ScrollView.
 */
export function SliderTrack({ style, children, onRatioChange }: SliderTrackProps) {
  const trackRef = useRef<View>(null);
  const pageXRef = useRef(0);
  const widthRef = useRef(1);
  const onRatioRef = useRef(onRatioChange);
  onRatioRef.current = onRatioChange;

  const applyPageX = (pageX: number) => {
    const ratio = (pageX - pageXRef.current) / widthRef.current;
    onRatioRef.current(Math.max(0, Math.min(1, ratio)));
  };

  const measureTrack = (after?: (pageX: number) => void, pageX = 0) => {
    trackRef.current?.measureInWindow((x, _y, width) => {
      pageXRef.current = x;
      widthRef.current = Math.max(1, width);
      after?.(pageX);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (event) => {
        measureTrack(applyPageX, event.nativeEvent.pageX);
      },
      onPanResponderMove: (event) => {
        applyPageX(event.nativeEvent.pageX);
      },
    }),
  ).current;

  return (
    <View
      ref={trackRef}
      collapsable={false}
      style={[styles.hit, style]}
      onLayout={(event) => {
        widthRef.current = Math.max(1, event.nativeEvent.layout.width);
        measureTrack();
      }}
      {...panResponder.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    justifyContent: 'center',
  },
});
