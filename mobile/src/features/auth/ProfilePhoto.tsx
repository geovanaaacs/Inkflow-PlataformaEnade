import Ionicons from "@expo/vector-icons/Ionicons";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar, ErrorMessage } from "../../components/ui";
import { errorMessage } from "../../lib/format";
import { colors, spacing, themed } from "../../theme";
import { removePhoto, uploadPhoto } from "./api";
import { useAuth } from "./AuthProvider";

/** Side of the square photo saved in the database (database/12_foto_perfil.sql). */
const PHOTO_SIZE = 256;

/** Square crop → 256 x 256 JPEG → data URL. */
async function toDataUrl(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: PHOTO_SIZE, height: PHOTO_SIZE });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!saved.base64) throw new Error("Não foi possível ler a imagem.");
  return `data:image/jpeg;base64,${saved.base64}`;
}

/** Photo at the top of "Editar perfil": choose from the gallery, take one, or remove. */
export function ProfilePhoto() {
  const { user, refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  async function pick(source: "gallery" | "camera") {
    setError(null);
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 };
    let result: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Permita o acesso à câmera nas configurações do celular para tirar a foto.");
        return;
      }
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }
    if (result.canceled || !result.assets[0]) return;

    setBusy(true);
    try {
      await uploadPhoto(await toDataUrl(result.assets[0].uri));
      await refreshUser();
    } catch (caught) {
      setError(errorMessage(caught, "Não foi possível salvar a foto."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await removePhoto();
      await refreshUser();
    } catch (caught) {
      setError(errorMessage(caught, "Não foi possível remover a foto."));
    } finally {
      setBusy(false);
    }
  }

  function confirmRemove() {
    Alert.alert("Remover foto", "Sua foto de perfil será apagada.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => void remove() },
    ]);
  }

  function choose() {
    const buttons: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[] = [
      { text: "Escolher da galeria", onPress: () => void pick("gallery") },
      { text: "Tirar foto", onPress: () => void pick("camera") },
    ];
    if (user?.photoUrl) buttons.push({ text: "Remover foto", style: "destructive", onPress: confirmRemove });
    buttons.push({ text: "Cancelar", style: "cancel" });
    Alert.alert("Foto de perfil", undefined, buttons);
  }

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={user.photoUrl ? "Alterar foto de perfil" : "Adicionar foto de perfil"}
        onPress={choose}
        disabled={busy}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Avatar name={user.name} photoUrl={user.photoUrl} size={96} />
        <View style={styles.badge}>
          {busy ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="camera" size={16} color={colors.onBrand} />}
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={choose} disabled={busy} hitSlop={8}>
        <Text style={styles.link}>{user.photoUrl ? "Alterar foto" : "Adicionar foto"}</Text>
      </Pressable>
      <ErrorMessage message={error} />
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  wrapper: { alignItems: "center", gap: spacing(2) },
  pressed: { opacity: 0.7 },
  badge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand600,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  link: { color: colors.brand600, fontSize: 15, fontWeight: "700" },
}));
