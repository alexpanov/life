import { useFonts } from "expo-font";
import {
  LibreBodoni_500Medium,
  LibreBodoni_500Medium_Italic,
  LibreBodoni_600SemiBold,
  LibreBodoni_600SemiBold_Italic,
  LibreBodoni_700Bold,
  LibreBodoni_700Bold_Italic,
} from "@expo-google-fonts/libre-bodoni";
import {
  LibreBaskerville_400Regular,
  LibreBaskerville_400Regular_Italic,
  LibreBaskerville_700Bold,
  LibreBaskerville_700Bold_Italic,
} from "@expo-google-fonts/libre-baskerville";
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_400Regular_Italic,
  IBMPlexSans_600SemiBold,
} from "@expo-google-fonts/ibm-plex-sans";
import { nativeTypeface } from "../../packages/design/src/typography";

export function useGameFonts() {
  return useFonts({
    [nativeTypeface.displayMedium]: LibreBodoni_500Medium,
    [nativeTypeface.displayMediumItalic]: LibreBodoni_500Medium_Italic,
    [nativeTypeface.display]: LibreBodoni_600SemiBold,
    [nativeTypeface.displayItalic]: LibreBodoni_600SemiBold_Italic,
    [nativeTypeface.displayBold]: LibreBodoni_700Bold,
    [nativeTypeface.displayBoldItalic]: LibreBodoni_700Bold_Italic,
    [nativeTypeface.text]: LibreBaskerville_400Regular,
    [nativeTypeface.textItalic]: LibreBaskerville_400Regular_Italic,
    [nativeTypeface.textBold]: LibreBaskerville_700Bold,
    [nativeTypeface.textBoldItalic]: LibreBaskerville_700Bold_Italic,
    [nativeTypeface.sans]: IBMPlexSans_400Regular,
    [nativeTypeface.sansItalic]: IBMPlexSans_400Regular_Italic,
    [nativeTypeface.sansBold]: IBMPlexSans_600SemiBold,
  });
}
