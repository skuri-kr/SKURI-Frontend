import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import {type CampusStackParamList} from '@/app/navigation/types';
import {
  LegalDocumentScreenSkeleton,
  StackHeader,
  StateCard,
} from '@/shared/design-system/components';
import {
  COLORS,
  SPACING,
} from '@/shared/design-system/tokens';

import {LegalDocumentHeroCard} from '../components/LegalDocumentHeroCard';
import {LegalDocumentSectionCard} from '../components/LegalDocumentSectionCard';
import {useLegalDocumentData} from '../hooks/useLegalDocumentData';
import type {LegalDocumentKey} from '../model/legalDocumentSource';

interface LegalDocumentScreenProps {
  documentKey: LegalDocumentKey;
  fallbackTitle: string;
}

export const LegalDocumentScreen = ({
  documentKey,
  fallbackTitle,
}: LegalDocumentScreenProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<CampusStackParamList>>();
  const {data, error, loading, reload} = useLegalDocumentData(documentKey);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StackHeader
        onPressBack={() => navigation.goBack()}
        title={data?.title ?? fallbackTitle}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {loading && !data ? (
          <LegalDocumentScreenSkeleton />
        ) : null}

        {error && !data ? (
          <StateCard
            actionLabel="다시 시도"
            description={error}
            icon={
              <Icon
                color={COLORS.accent.orange}
                name="alert-circle-outline"
                size={28}
              />
            }
            onPressAction={() => {
              reload().catch(() => undefined);
            }}
            title="문서를 불러오지 못했습니다"
          />
        ) : null}

        {data ? (
          <>
            <LegalDocumentHeroCard banner={data.banner} />

            <View style={styles.sectionList}>
              {data.sections.map(section => (
                <LegalDocumentSectionCard key={section.id} section={section} />
              ))}
            </View>

            <View style={styles.footer}>
              {data.footerLines.map((line, index) => (
                <Text key={`${line}-${index}`} style={styles.footerLine}>
                  {line}
                </Text>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
    paddingHorizontal: SPACING.lg,
    paddingTop: 20,
  },
  footer: {
    marginTop: 24,
  },
  footerLine: {
    color: COLORS.text.muted,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  safeArea: {
    backgroundColor: COLORS.background.page,
    flex: 1,
  },
  sectionList: {
    gap: SPACING.lg,
    marginTop: 20,
  },
});
