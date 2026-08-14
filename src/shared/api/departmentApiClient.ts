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
      .then(response => response.data.map(department => department.name))
      .then(departments => {
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
