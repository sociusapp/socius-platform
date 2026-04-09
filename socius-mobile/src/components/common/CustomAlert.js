import React from 'react';
import AppDialog from './AppDialog';

const CustomAlert = ({
  visible,
  title,
  message,
  buttons = [],
  icon,
  iconColor,
  onClose,
  type,
}) => {
  const mappedActions = (Array.isArray(buttons) ? buttons : []).map((btn) => {
    const rawStyle = String(btn?.style || btn?.type || '').toLowerCase();
    let style = 'primary';
    if (rawStyle === 'cancel') style = 'cancel';
    if (rawStyle === 'destructive') style = 'primary';
    return {
      label: btn?.text || 'OK',
      style,
      onPress: () => {
        if (onClose) onClose();
        btn?.onPress?.();
      },
    };
  });

  return (
    <AppDialog
      visible={visible}
      type={type}
      title={title}
      message={message}
      icon={icon}
      iconColor={iconColor}
      actions={mappedActions}
      onClose={onClose}
      onCancel={onClose}
      onConfirm={onClose}
    />
  );
};

export default CustomAlert;
