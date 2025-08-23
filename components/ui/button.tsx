import React from "react";
import { Platform, Text, TouchableOpacity } from "react-native";

const Button = ({
  disabled = false,
  icon,
  text,
  textColor,
  onPress,
  variant = "primary",
  className
}: {
  disabled?: boolean;
  icon?: React.ReactNode;
  text?: string;
  textColor?: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "destructive" | "black" | "bordered" | "link";
  className?: string;
}) => {
  const buttonClass = variant === "outline"
    ? "hover:bg-primary/10 transition-all duration-300 py-2 px-3 rounded-xl flex-row justify-center items-center gap-2 w-fit"
    : variant === "destructive"
      ? "w-fit flex items-center justify-center gap-x-2 border bg-destructive text-white border-destructive/60 py-2 px-3 rounded-xl hover:bg-destructive/80 transition-all duration-300"
      : variant === "black"
        ? "w-fit flex items-center justify-center gap-x-2 border bg-black text-white border-black py-2 px-3 rounded-xl hover:bg-black/80 transition-all duration-300"
      : variant === "bordered"
        ? "w-fit flex items-center justify-center gap-x-2 border border-border py-2 px-3 rounded-xl hover:bg-border/20 transition-all duration-300"
      : variant === "link"
        ? "w-fit flex items-center justify-center gap-x-2 text-primary"
      : "w-fit flex items-center justify-center gap-x-2 border border-primary/60 py-2 px-3 rounded-xl hover:bg-primary/10 transition-all duration-300";

  const disabledClass ="bg-gray-100 text-black cursor-not-allowed p-2 flex flex-row items-center justify-center w-full rounded-xl";

  const renderWeb = () => (
    <button onClick={onPress} disabled={disabled} className={disabled ? disabledClass : `${buttonClass} ${className}`}>
      {icon && icon}
      {text && <span className={`text-sm ${disabled ? "text-gray-400" : textColor ? textColor : variant === "destructive" ? "text-white" : "text-primary"}`}>{text}</span>}
    </button>
  );

  const renderMobile = () => (
    <TouchableOpacity onPress={onPress} disabled={disabled} className={disabled ? disabledClass : `flex-row ${buttonClass} ${className}`}>
      {icon && icon}
      {text && <Text className={`mb-0.5 ${disabled ? "text-gray-400" : textColor ? textColor : variant === "destructive" ? "text-white" : "text-primary"}`}>{text}</Text>}
    </TouchableOpacity>
  );

  switch (Platform.OS) {
    case "web":
      return renderWeb();
    case "ios":
      return renderMobile();
    case "android":
      return renderMobile();
    default:
      return renderWeb();
  }
};

export default Button;
