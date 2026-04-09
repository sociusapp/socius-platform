import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const TYPE_CONFIG = {
  success: { defaultPrimaryLabel: 'Done', icon: 'check-circle', iconColor: '#22C55E' },
  error: { defaultPrimaryLabel: 'OK', icon: 'alert-circle', iconColor: '#EF4444' },
  info: { defaultPrimaryLabel: 'OK', icon: 'information', iconColor: '#3B82F6' },
  confirmation: { defaultPrimaryLabel: 'Continue', defaultCancelLabel: 'Cancel', icon: 'help-circle', iconColor: '#DC5C69' },
  warning: { defaultPrimaryLabel: 'Continue', defaultCancelLabel: 'Cancel', icon: 'alert', iconColor: '#F59E0B' },
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();
const isCancelText = (text) => ['cancel', 'not now', 'close'].includes(normalizeText(text));
const isContinueText = (text) => ['continue', 'confirm', 'proceed', 'yes'].includes(normalizeText(text));
const isOkText = (text) => ['ok', 'done', 'got it'].includes(normalizeText(text));

const inferType = (type, actions) => {
  const safe = Array.isArray(actions) ? actions.filter(Boolean) : [];
  const cancelAction = safe.find((a) => a.style === 'cancel' || isCancelText(a.label));
  const hasNonCancel = safe.some((a) => a !== cancelAction);
  // Default prop type="info" must not squash two-button alerts into a single "OK" dialog.
  if (cancelAction && hasNonCancel) return 'confirmation';
  if (type && TYPE_CONFIG[type]) return type;
  if (safe.some((a) => a.style === 'cancel' || isCancelText(a.label))) return 'confirmation';
  return 'info';
};

const uniqueByLabel = (actions) => {
  const seen = new Set();
  const out = [];
  for (const action of actions) {
    const key = normalizeText(action?.label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(action);
  }
  return out;
};

const buildActions = ({ type, actions, onConfirm, onCancel }) => {
  const safeActions = uniqueByLabel(Array.isArray(actions) ? actions.filter(Boolean) : []);
  const resolvedType = inferType(type, safeActions);
  const cfg = TYPE_CONFIG[resolvedType];

  if (resolvedType === 'success' || resolvedType === 'error' || resolvedType === 'info') {
    const acknowledgement =
      safeActions.find((a) => isOkText(a.label)) ||
      safeActions.find((a) => isContinueText(a.label)) ||
      safeActions.find((a) => a.style !== 'cancel') ||
      null;
    return {
      type: resolvedType,
      actions: [
        {
          label: acknowledgement?.label || cfg.defaultPrimaryLabel,
          style: 'primary',
          onPress: acknowledgement?.onPress || onConfirm || null,
        },
      ],
    };
  }

  const cancelAction = safeActions.find((a) => a.style === 'cancel' || isCancelText(a.label));
  let primaryAction =
    safeActions.find((a) => a !== cancelAction && (isContinueText(a.label) || a.style === 'primary')) ||
    safeActions.find((a) => a !== cancelAction && a.style !== 'cancel') ||
    null;

  if (!primaryAction && safeActions.find((a) => isOkText(a.label))) {
    primaryAction = safeActions.find((a) => isOkText(a.label));
  }

  // Dismiss / non-destructive first; primary (often destructive) second — easier to avoid mis-taps.
  return {
    type: resolvedType,
    actions: [
      {
        label: cancelAction?.label || cfg.defaultCancelLabel || 'Cancel',
        style: 'cancel',
        onPress: cancelAction?.onPress || onCancel || null,
      },
      {
        label: primaryAction?.label || cfg.defaultPrimaryLabel,
        style: 'primary',
        onPress: primaryAction?.onPress || onConfirm || null,
      },
    ],
  };
};

const AppDialog = ({
  visible,
  type = 'info',
  title,
  message,
  icon,
  iconColor,
  actions = [],
  onConfirm,
  onCancel,
  onClose,
}) => {
  const normalized = buildActions({ type, actions, onConfirm, onCancel });
  const cfg = TYPE_CONFIG[normalized.type];
  const renderIcon = icon || cfg.icon;
  const renderIconColor = iconColor || cfg.iconColor;

  const handleAction = (action) => {
    if (action?.onPress) action.onPress();
    else if (onClose) onClose();
  };

  return (
    <Modal transparent visible={!!visible} onRequestClose={onClose} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.backdrop} />
        <View style={styles.dialog}>
          {renderIcon ? (
            <View style={[styles.iconContainer, { backgroundColor: `${renderIconColor}20` }]}>
              <Icon name={renderIcon} size={30} color={renderIconColor} />
            </View>
          ) : null}
          {!!title ? <Text style={styles.title}>{title}</Text> : null}
          {!!message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            {normalized.actions.map((action, idx) => (
              <TouchableOpacity
                key={`${normalizeText(action.label)}-${idx}`}
                activeOpacity={0.85}
                style={[styles.button, action.style === 'cancel' ? styles.cancelButton : styles.primaryButton]}
                onPress={() => handleAction(action)}
              >
                <Text style={[styles.buttonText, action.style === 'cancel' ? styles.cancelText : styles.primaryText]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  dialog: {
    width: width * 0.86,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  iconContainer: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  button: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: '#C93F46',
  },
  cancelButton: {
    backgroundColor: '#EEF2F7',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  cancelText: {
    color: '#475569',
  },
});

export default AppDialog;
