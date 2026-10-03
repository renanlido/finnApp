import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
// Importa só os pesos usados pelo design system (o índice do pacote traz todos os arquivos).
import { InstrumentSans_400Regular } from '@expo-google-fonts/instrument-sans/400Regular';
import { InstrumentSans_600SemiBold } from '@expo-google-fonts/instrument-sans/600SemiBold';
import { InstrumentSans_700Bold } from '@expo-google-fonts/instrument-sans/700Bold';
import { Urbanist_700Bold } from '@expo-google-fonts/urbanist/700Bold';
import { Urbanist_800ExtraBold } from '@expo-google-fonts/urbanist/800ExtraBold';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { HojeScreen } from './src/screens/HojeScreen';

export default function App() {
  const [loaded] = useFonts({
    Urbanist_700Bold,
    Urbanist_800ExtraBold,
    InstrumentSans_400Regular,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
  });
  if (!loaded) return null;
  return (
    <ThemeProvider>
      <HojeScreen />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
