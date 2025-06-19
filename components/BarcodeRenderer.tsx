import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import {
  PinchGestureHandler,
  PinchGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/hooks/useTheme';

export type BarcodeRendererProps = {
  code: string;
  codeType: 'barcode' | 'qrcode';
  width?: number;
  height?: number;
};

const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  code,
  codeType,
  width,
  height,
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const windowWidth = Dimensions.get('window').width - 64;

  const defaultBarcodeWidth = 2;
  const defaultBarcodeHeight = 100;
  const defaultQrSize = 200;

  const barcodeWidth = width ?? defaultBarcodeWidth;
  const barcodeHeight = height ?? defaultBarcodeHeight;
  const qrSize = height ?? width ?? defaultQrSize;
  const containerWidth = codeType === 'barcode' ? windowWidth : qrSize;
  const containerHeight = codeType === 'barcode' ? barcodeHeight : qrSize;

  const generateHtml = () => {
    const backgroundColor = colors.backgroundMedium;
    const foregroundColor = colors.textPrimary;

    if (codeType === 'barcode') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
          <style>body{margin:0;padding:0;display:flex;justify-content:center;align-items:center;height:100vh;background-color:${backgroundColor};}</style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body>
          <svg id="barcode"></svg>
          <script>
            JsBarcode('#barcode', '${code}', {
              format: 'CODE128',
              lineColor: '${foregroundColor}',
              background: '${backgroundColor}',
              width: ${barcodeWidth},
              height: ${barcodeHeight},
              displayValue: false
            });
          </script>
        </body>
        </html>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <style>body{margin:0;padding:0;display:flex;justify-content:center;align-items:center;height:100vh;background-color:${backgroundColor};}#qrcode{padding:0;margin:0;}</style>
        <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
      </head>
      <body>
        <div id="qrcode"></div>
        <script>
          const qr = qrcode(0, 'H');
          qr.addData('${code}');
          qr.make();
          document.getElementById('qrcode').innerHTML = qr.createImgTag(${qrSize}, ${qrSize});
        </script>
      </body>
      </html>
    `;
  };

  const pinchGestureHandler = useAnimatedGestureHandler<PinchGestureHandlerGestureEvent>({
    onActive: (event) => {
      scale.value = Math.max(0.5, Math.min(event.scale, 3));
    },
    onEnd: () => {
      if (scale.value < 0.7) scale.value = withSpring(0.7);
      else if (scale.value > 3) scale.value = withSpring(3);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundMedium }]}>
      <PinchGestureHandler onGestureEvent={pinchGestureHandler}>
        <Animated.View style={[styles.webViewContainer, animatedStyle, { width: containerWidth, height: containerHeight }]}>            
          <WebView
            style={[styles.webView, { backgroundColor: colors.backgroundMedium }]} 
            source={{ html: generateHtml() }}
            originWhitelist={['about:blank']}
            scalesPageToFit={false}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </PinchGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  webViewContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
  },
  instructions: {
    alignItems: 'center',
  },
});

export default BarcodeRenderer;