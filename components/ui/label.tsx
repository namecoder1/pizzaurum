import * as LabelPrimitive from "@rn-primitives/label";
import * as React from "react";
import { Platform } from "react-native";
import { cn } from "~/lib/utils";

function Label({
  className,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  ...props
}: LabelPrimitive.TextProps & {
  ref?: React.RefObject<LabelPrimitive.TextRef>;
}) {
  const { id, ...rest } = props;
  const os = Platform.OS;

  if (os === "web") {
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
      <label
        htmlFor={id}
        className={cn(
          "text-sm text-foreground native:text-base font-medium leading-none web:peer-disabled:cursor-not-allowed web:peer-disabled:opacity-70",
          className
        )}
        {...webProps}
      />
    );
  }

  return (
    <LabelPrimitive.Root
      className="web:cursor-default"
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <LabelPrimitive.Text
        className={cn(
          "text-sm text-foreground native:text-base font-medium leading-none web:peer-disabled:cursor-not-allowed web:peer-disabled:opacity-70",
          className
        )}
        {...props}
      />
    </LabelPrimitive.Root>
  );
}

export { Label };
