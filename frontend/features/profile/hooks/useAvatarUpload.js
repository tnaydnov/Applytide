import { useRef, useState } from "react";
import { useToast } from "../../../lib/toast";
import { uploadAvatar } from "../../../services/user";
import { useAuth } from "../../../contexts/AuthContext";

export default function useAvatarUpload() {
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const toast = useToast();
  const { refreshUser } = useAuth();

  const select = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const upload = async () => {
    if (!avatarFile) return;
    setLoading(true);
    try {
      await uploadAvatar(avatarFile);
      toast.success("Avatar updated successfully!");
      await refreshUser?.();
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (e) {
      toast.error(e?.message || "Failed to upload avatar");
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  return {
    fileInputRef,
    avatarFile,
    avatarPreview,
    loading,
    select,
    upload,
    cancel,
  };
}
