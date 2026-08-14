import {httpClient} from './httpClient';
import type {ApiSuccessResponse} from './apiResponse';

interface DepartmentDto {
  name: string;
}

let cachedDepartments: string[] | null = null;
let pendingRequest: Promise<string[]> | null = null;

export const getDepartments = async (): Promise<string[]> => {
  if (cachedDepartments) {
    return cachedDepartments;
  }

  if (!pendingRequest) {
    pendingRequest = httpClient
      .get<ApiSuccessResponse<DepartmentDto[]>>('/v1/departments')
      .then(response =>
        Array.from(
          new Set(
            response.data
              .map(department => department.name.trim())
              .filter(Boolean),
          ),
        ),
      )
      .then(departments => {
        if (departments.length === 0) {
          throw new Error('학과 목록이 비어 있습니다.');
        }
        cachedDepartments = departments;
        return departments;
      })
      .finally(() => {
        pendingRequest = null;
      });
  }

  return pendingRequest;
};

export const resetDepartmentsCache = () => {
  cachedDepartments = null;
  pendingRequest = null;
};
