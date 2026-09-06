# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.
# REGLAS MAESTRAS DEL PROYECTO (Expo & React Native)

1. **Versiones:** Este proyecto usa la última versión de Expo (SDK 50+). NUNCA uses documentación antigua de Expo.
2. **Navegación:** Usamos EXPO ROUTER (enrutamiento basado en archivos en la carpeta `app/`). NO uses React Navigation clásico.
3. **Cámara:** Para la cámara y escaneo de códigos QR, utiliza ÚNICAMENTE la nueva API `<CameraView>` de `expo-camera`. No uses los métodos obsoletos de `BarCodeScanner`.
4. **Firebase:** Usamos el SDK modular de Firebase Web v9+.
5. **Estilos:** Usa `StyleSheet.create` con colores profesionales. Mantenlo limpio y moderno.