import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, Platform } from 'react-native';
import { Camera, CameraView } from 'expo-camera';

type CodeScannerProps = {
  onCodeScanned: (data: string, type: 'barcode' | 'qrcode') => void;
};

const CodeScanner: React.FC<CodeScannerProps> = ({ onCodeScanned }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const frameWidth = screenWidth - 32;
  const frameHeight = (frameWidth * 3) / 4;

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      }
    })();
  }, []);

  const handleCodeScanned = ({ type, data }: { type: string; data: string }) => {
    // Rozlíšenie, či ide o QR kód alebo iný barcode typ
    const codeType = type.toLowerCase().includes('qr') ? 'qrcode' : 'barcode';
    onCodeScanned(data, codeType);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera scanning is not available on web</Text>
      </View>
    );
  }

  return (
    <View style={[styles.cameraContainer, { width: frameWidth, height: frameHeight }]}>
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={handleCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39"],
        }}
      />
      <View style={[styles.overlay, { width: frameWidth, height: frameHeight }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
  },
});

export default CodeScanner;
