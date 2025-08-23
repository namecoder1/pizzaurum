import * as React from "react";
import { Platform, TextInput, type TextInputProps } from "react-native";
import { cn } from "~/lib/utils";

type InputProps = TextInputProps & {
  className?: string;
  placeholderClassName?: string;
  id?: string;
};

function Input({ className, placeholderClassName, id, ...props }: InputProps) {
  const os = Platform.OS;

  if (os === "web") {
    // Filter out React Native specific props for web
    const {
      allowFontScaling,
      autoCapitalize,
      autoCorrect,
      autoFocus,
      blurOnSubmit,
      caretHidden,
      clearButtonMode,
      clearTextOnFocus,
      contextMenuHidden,
      dataDetectorTypes,
      defaultValue,
      disableFullscreenUI,
      editable,
      enablesReturnKeyAutomatically,
      importantForAutofill,
      inlineImageLeft,
      inlineImagePadding,
      inputAccessoryViewID,
      keyboardAppearance,
      keyboardType,
      maxFontSizeMultiplier,
      multiline,
      numberOfLines,
      onBlur,
      onChange,
      onChangeText,
      onContentSizeChange,
      onEndEditing,
      onFocus,
      onKeyPress,
      onLayout,
      onScroll,
      onSelectionChange,
      onSubmitEditing,
      passwordRules,
      placeholder,
      placeholderTextColor,
      returnKeyLabel,
      returnKeyType,
      scrollEnabled,
      secureTextEntry,
      selection,
      selectionColor,
      selectTextOnFocus,
      showSoftInputOnFocus,
      spellCheck,
      textAlign,
      textBreakStrategy,
      textContentType,
      underlineColorAndroid,
      value,
      ...webProps
    } = props as any;

    return (
      <input
        id={id}
        type={secureTextEntry ? "password" : "text"}
        autoComplete="on"
        className={cn(
          "web:flex h-10 native:h-12 web:w-full rounded-xl border border-input bg-background px-3 web:py-2 text-base lg:text-sm native:text-lg native:leading-[1.25] placeholder:text-muted-foreground web:ring-offset-background file:border-0 file:bg-transparent file:font-medium web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2",
          className
        )}
        defaultValue={defaultValue}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          if (onChangeText) {
            onChangeText(e.target.value);
          }
          if (onChange) {
            onChange(e as any);
          }
        }}
        onBlur={onBlur ? (e) => onBlur(e as any) : undefined}
        onFocus={onFocus ? (e) => onFocus(e as any) : undefined}
        {...webProps}
      />
    );
  }

  return (
    <TextInput
      className={cn(
        "web:flex h-10 native:h-12 web:w-full rounded-xl border border-input bg-background px-3 web:py-2 text-base lg:text-sm native:text-lg native:leading-[1.25] placeholder:text-muted-foreground web:ring-offset-background file:border-0 file:bg-transparent file:font-medium web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2",
        props.editable === false && "opacity-50 web:cursor-not-allowed",
        className
      )}
      placeholderClassName={cn("text-muted-foreground", placeholderClassName)}
      {...props}
    />
  );
}

export { Input };
