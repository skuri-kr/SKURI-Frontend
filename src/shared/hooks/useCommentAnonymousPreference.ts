import React from 'react';

import {
  getCommentAnonymousPreference,
  setCommentAnonymousPreference,
} from '@/shared/lib/commentAnonymousPreferenceStorage';

export const useCommentAnonymousPreference = () => {
  const [isAnonymous, setIsAnonymous] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    getCommentAnonymousPreference()
      .then(storedValue => {
        if (!isMounted) {
          return;
        }

        setIsAnonymous(storedValue);
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  const updateAnonymousPreference = React.useCallback((value: boolean) => {
    setIsAnonymous(value);
    setCommentAnonymousPreference(value).catch(() => undefined);
  }, []);

  const toggleAnonymousPreference = React.useCallback(() => {
    updateAnonymousPreference(!isAnonymous);
  }, [isAnonymous, updateAnonymousPreference]);

  return {
    isAnonymous,
    setAnonymousPreference: updateAnonymousPreference,
    toggleAnonymousPreference,
  };
};
