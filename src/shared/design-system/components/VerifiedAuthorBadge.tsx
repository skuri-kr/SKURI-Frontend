import React from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import {COLORS} from '../tokens';

export const VerifiedAuthorBadge = () => (
  <MaterialIcons
    accessibilityLabel="운영자 인증됨"
    accessibilityRole="image"
    color={COLORS.brand.primary}
    name="verified"
    size={16}
  />
);
