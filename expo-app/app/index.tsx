import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <WebView source={{ uri: 'https://necxis-assignment-one.vercel.app/' }} />
    </>
  );
}
