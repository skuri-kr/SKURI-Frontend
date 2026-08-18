import React from 'react';
import type {ImageSourcePropType} from 'react-native';

import {useMyPageRepository} from '@/di';
import {COLORS} from '@/shared/design-system/tokens';
import type {MyPageSource} from '../model/myPageSource';
import type {
  MyPageMenuActionKey,
  MyPageStatKey,
} from '../model/myPageSource';
import type {MyPageScreenViewData} from '../model/myPageViewData';

type MyPageMenuTone = 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'gray';

interface MyPageMenuItemConfig {
  actionKey: MyPageMenuActionKey;
  iconName: string;
  imageSource?: ImageSourcePropType;
  id: string;
  label: string;
  tone: MyPageMenuTone;
}

interface MyPageMenuSectionConfig {
  id: string;
  items: MyPageMenuItemConfig[];
  title: string;
}

interface MyPageStatConfig {
  actionKey: MyPageStatKey;
  id: string;
  label: string;
}

const MY_PAGE_PROFILE_EDIT_LABEL = '프로필 수정';
const MY_PAGE_MENU_SECTIONS: MyPageMenuSectionConfig[] = [
  {
    id: 'friend',
    title: '친구',
    items: [
      {
        actionKey: 'friendHub',
        iconName: 'people-outline',
        id: 'friend-hub',
        label: '친구',
        tone: 'green',
      },
    ],
  },
  {
    id: 'activity',
    title: '내 활동',
    items: [
      {
        actionKey: 'myPosts',
        iconName: 'document-text-outline',
        id: 'my-posts',
        label: '내가 쓴 글',
        tone: 'blue',
      },
      {
        actionKey: 'bookmarks',
        iconName: 'bookmark-outline',
        id: 'bookmarks',
        label: '북마크',
        tone: 'green',
      },
      {
        actionKey: 'taxiHistory',
        iconName: 'car-outline',
        id: 'taxi-history',
        label: '택시 이용 내역',
        tone: 'orange',
      },
    ],
  },
  {
    id: 'minecraft',
    title: '마인크래프트 서버',
    items: [
      {
        actionKey: 'minecraftAccount',
        iconName: 'cube-outline',
        id: 'minecraft-account',
        label: '마인크래프트 계정 등록',
        tone: 'green',
        imageSource: require('../../../../assets/images/minecraft/steve_face.png'),
      },
      {
        actionKey: 'minecraftServer',
        iconName: 'server-outline',
        id: 'minecraft-server',
        label: '마인크래프트 서버 정보',
        tone: 'blue',
        imageSource: require('../../../../assets/images/minecraft/grass.png'),
      },
    ],
  },
  {
    id: 'settings',
    title: '설정',
    items: [
      {
        actionKey: 'notificationSettings',
        iconName: 'notifications-outline',
        id: 'notification-settings',
        label: '알림 설정',
        tone: 'purple',
      },
      {
        actionKey: 'accountManagement',
        iconName: 'card-outline',
        id: 'account-management',
        label: '계좌 관리',
        tone: 'pink',
      },
      {
        actionKey: 'inquiries',
        iconName: 'headset-outline',
        id: 'inquiries',
        label: '문의하기',
        tone: 'blue',
      },
      {
        actionKey: 'inquiryHistory',
        iconName: 'file-tray-full-outline',
        id: 'inquiry-history',
        label: '문의내역',
        tone: 'green',
      },
      {
        actionKey: 'appSettings',
        iconName: 'settings-outline',
        id: 'app-settings',
        label: '앱 설정',
        tone: 'gray',
      },
    ],
  },
];

const MY_PAGE_STAT_CONFIGS: MyPageStatConfig[] = [
  {
    actionKey: 'myPosts',
    id: 'post-count',
    label: '작성한 글',
  },
  {
    actionKey: 'bookmarks',
    id: 'bookmark-count',
    label: '북마크',
  },
  {
    actionKey: 'taxiHistory',
    id: 'taxi-usage-count',
    label: '택시 이용',
  },
];

const getToneColors = (tone: MyPageMenuTone) => {
  switch (tone) {
    case 'blue':
      return {
        iconBackgroundColor: COLORS.accent.blueSoft,
        iconColor: COLORS.accent.blue,
      };
    case 'green':
      return {
        iconBackgroundColor: COLORS.brand.primaryTint,
        iconColor: COLORS.brand.primary,
      };
    case 'orange':
      return {
        iconBackgroundColor: COLORS.accent.orangeSoft,
        iconColor: COLORS.accent.orange,
      };
    case 'purple':
      return {
        iconBackgroundColor: COLORS.accent.purpleSoft,
        iconColor: COLORS.accent.purple,
      };
    case 'pink':
      return {
        iconBackgroundColor: COLORS.accent.pinkSoft,
        iconColor: COLORS.accent.pink,
      };
    case 'gray':
    default:
      return {
        iconBackgroundColor: COLORS.background.subtle,
        iconColor: COLORS.text.secondary,
      };
  }
};

const toViewData = (source: MyPageSource): MyPageScreenViewData => ({
  profile: {
    avatarLabel: source.profile.displayName.slice(0, 1) || '?',
    displayName: source.profile.displayName,
    email: source.profile.email,
    editLabel: MY_PAGE_PROFILE_EDIT_LABEL,
    photoUrl: source.profile.photoUrl,
    subtitle: source.profile.subtitle,
  },
  sections: MY_PAGE_MENU_SECTIONS.map(section => ({
    id: section.id,
    items: section.items.map(item => {
      const toneColors = getToneColors(item.tone);

      return {
        actionKey: item.actionKey,
        imageSource: item.imageSource,
        iconBackgroundColor: toneColors.iconBackgroundColor,
        iconColor: toneColors.iconColor,
        iconName: item.iconName,
        id: item.id,
        label: item.label,
      };
    }),
    title: section.title,
  })),
  stats: MY_PAGE_STAT_CONFIGS.map(stat => ({
    actionKey: stat.actionKey,
    id: stat.id,
    label: stat.label,
    valueLabel: `${source.stats[stat.actionKey]}`,
  })),
});

export const useMyPageData = () => {
  const myPageRepository = useMyPageRepository();
  const [data, setData] = React.useState<MyPageScreenViewData>();
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);

      const source = await myPageRepository.getMyPage();
      setData(toViewData(source));
    } catch (caughtError) {
      console.error('Failed to fetch my page data', caughtError);
      setError('마이페이지를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [myPageRepository]);

  React.useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  return {
    data,
    error,
    loading,
    reload,
  };
};
