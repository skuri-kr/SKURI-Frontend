import React from 'react';

import {getDepartments, resetDepartmentsCache} from '../api/departmentApiClient';

export const useDepartments = () => {
  const [departments, setDepartments] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async (force = false) => {
    setLoading(true);
    setError(undefined);

    try {
      if (force) {
        resetDepartmentsCache();
      }
      setDepartments(await getDepartments());
    } catch (loadError) {
      console.error(loadError);
      setDepartments([]);
      setError('학과 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  return {
    departments,
    error,
    loading,
    reload: () => load(true),
  };
};
