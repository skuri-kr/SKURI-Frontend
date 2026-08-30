import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {type CampusStackParamList} from '@/app/navigation/types';
import {useAds} from '@/shared/ads';
import {
  SettingsRow,
  SettingsSection,
  StackHeader,
} from '@/shared/design-system/components';
import {COLORS, SPACING} from '@/shared/design-system/tokens';
import {useScreenView} from '@/shared/hooks/useScreenView';

import {useAppSettingData} from '../hooks/useAppSettingData';

export const SettingScreen = () => {
  useScreenView();

  const navigation = useNavigation<NativeStackNavigationProp<CampusStackParamList>>();
  const {privacyOptionsRequired, showPrivacyOptions} = useAds();
  const {data} = useAppSettingData(privacyOptionsRequired);

  const handlePressRow = React.useCallback(
    (actionKey: string) => {
      switch (actionKey) {
        case 'termsOfUse':
          navigation.navigate('TermsOfUse');
          return;
        case 'privacyPolicy':
          navigation.navigate('PrivacyPolicy');
          return;
        case 'adPrivacy':
          showPrivacyOptions()
            .then(result => {
              if (result === 'shown') {
                return;
              }

              if (result === 'notRequired') {
                Alert.alert(
                  '광고 개인정보 설정',
                  '현재 지역에서는 별도의 광고 동의 변경이 필요하지 않습니다. 기기의 광고 추적 설정은 운영체제 설정에서 변경할 수 있습니다.',
                );
                return;
              }

              Alert.alert(
                '광고 개인정보 설정',
                '설정 화면을 불러오지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도해주세요.',
              );
            })
            .catch(() => undefined);
          return;
        default:
          return;
      }
    },
    [navigation, showPrivacyOptions],
  );

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StackHeader
        onPressBack={() => navigation.goBack()}
        title="앱 설정"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {data.sections.map(section => (
          <SettingsSection key={section.id} style={styles.section} title={section.title}>
            {section.items.map((item, index) => (
              <SettingsRow
                key={item.id}
                accessoryType={item.accessoryType}
                disabled={item.disabled}
                iconBackgroundColor={item.iconBackgroundColor}
                iconBoxSize={36}
                iconColor={item.iconColor}
                iconName={item.iconName}
                minHeight={index === 0 && section.items.length === 1 ? 70 : 68}
                onPress={
                  item.accessoryType === 'chevron'
                    ? () => handlePressRow(item.actionKey)
                    : undefined
                }
                showDivider={index < section.items.length - 1}
                subtitle={item.subtitle}
                title={item.title}
                titleWeight="500"
                toggleValue={item.toggleValue}
                valueLabel={item.valueLabel}
              />
            ))}
          </SettingsSection>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.background.page,
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: SPACING.xxl,
  },
});
