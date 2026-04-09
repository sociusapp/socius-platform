import React from 'react';
import AppDialog from './AppDialog';

const CustomModal = ({
  visible,
  title,
  message,
  buttonText,
  onButtonPress,
  onClose,
}) => {
  return (
    <AppDialog
      visible={visible}
      type="info"
      title={title}
      message={message}
      onClose={onClose}
      actions={[
        {
          label: buttonText || 'OK',
          style: 'primary',
          onPress: onButtonPress || onClose,
        },
      ]}
    />
  );
};

export default CustomModal;
