import React from 'react';
import {Alert, StyleSheet, Text, type TextProps} from 'react-native';

import {openExternalWebUrl} from '@/shared/lib/device/openExternalWebUrl';
import {
  linkifyContentSegments,
  linkifyContentText,
} from '@/shared/lib/url/contentLinks';
import type {ContentDetailTextSegmentViewData} from '@/shared/types/contentDetailViewData';

import {COLORS} from '../tokens';

interface LinkifiedTextProps extends TextProps {
  segments?: ContentDetailTextSegmentViewData[];
  text: string;
}

const showOpenUrlError = () => {
  Alert.alert('링크 열기 오류', '외부 브라우저에서 링크를 열지 못했습니다.');
};

export const LinkifiedText = ({
  segments,
  style,
  text,
  ...textProps
}: LinkifiedTextProps) => {
  const renderedSegments = React.useMemo(
    () =>
      segments ? linkifyContentSegments(segments) : linkifyContentText(text),
    [segments, text],
  );

  return (
    <Text {...textProps} style={style}>
      {renderedSegments.map((segment, index) =>
        segment.type === 'link' ? (
          <Text
            key={`${segment.url}-${index}`}
            accessibilityRole="link"
            onPress={() => {
              openExternalWebUrl(segment.url).catch(showOpenUrlError);
            }}
            style={styles.link}>
            {segment.text}
          </Text>
        ) : (
          <React.Fragment key={`text-${index}`}>{segment.text}</React.Fragment>
        ),
      )}
    </Text>
  );
};

const styles = StyleSheet.create({
  link: {
    color: COLORS.accent.blue,
    textDecorationLine: 'underline',
  },
});
