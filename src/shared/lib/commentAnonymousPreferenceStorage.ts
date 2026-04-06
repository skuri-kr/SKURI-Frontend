import AsyncStorage from '@react-native-async-storage/async-storage';

const COMMENT_ANONYMOUS_PREFERENCE_STORAGE_KEY =
  '@sktaxi/comment-anonymous-preference/v1';

let cachedCommentAnonymousPreference: boolean | null = null;

export const getCommentAnonymousPreference = async (): Promise<boolean> => {
  if (cachedCommentAnonymousPreference !== null) {
    return cachedCommentAnonymousPreference;
  }

  try {
    const stored = await AsyncStorage.getItem(
      COMMENT_ANONYMOUS_PREFERENCE_STORAGE_KEY,
    );

    if (stored === null) {
      cachedCommentAnonymousPreference = true;
      return cachedCommentAnonymousPreference;
    }

    cachedCommentAnonymousPreference = JSON.parse(stored) === false ? false : true;
    return cachedCommentAnonymousPreference;
  } catch (error) {
    console.warn('댓글 익명 설정을 불러오지 못했습니다.', error);
    cachedCommentAnonymousPreference = true;
    return cachedCommentAnonymousPreference;
  }
};

export const setCommentAnonymousPreference = async (value: boolean) => {
  cachedCommentAnonymousPreference = value;

  try {
    await AsyncStorage.setItem(
      COMMENT_ANONYMOUS_PREFERENCE_STORAGE_KEY,
      JSON.stringify(value),
    );
  } catch (error) {
    console.warn('댓글 익명 설정을 저장하지 못했습니다.', error);
    throw error;
  }
};
