import {httpClient} from '../httpClient';
import {getDepartments, resetDepartmentsCache} from '../departmentApiClient';

jest.mock('../httpClient', () => ({
  httpClient: {
    get: jest.fn(),
  },
}));

const mockedGet = jest.mocked(httpClient.get);

describe('departmentApiClient', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    resetDepartmentsCache();
  });

  afterEach(() => {
    resetDepartmentsCache();
  });

  it('학과명을 정리하고 중복 제거한 뒤 성공 응답만 캐시한다', async () => {
    mockedGet.mockResolvedValue({
      data: [
        {name: ' 컴퓨터공학과 '},
        {name: '컴퓨터공학과'},
        {name: '정보통신공학과'},
      ],
      success: true,
    });

    await expect(getDepartments()).resolves.toEqual([
      '컴퓨터공학과',
      '정보통신공학과',
    ]);
    await expect(getDepartments()).resolves.toEqual([
      '컴퓨터공학과',
      '정보통신공학과',
    ]);
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('빈 학과 목록은 캐시하지 않아 다음 호출에서 다시 요청한다', async () => {
    mockedGet
      .mockResolvedValueOnce({data: [], success: true})
      .mockResolvedValueOnce({
        data: [{name: '컴퓨터공학과'}],
        success: true,
      });

    await expect(getDepartments()).rejects.toThrow(
      '학과 목록이 비어 있습니다.',
    );
    await expect(getDepartments()).resolves.toEqual(['컴퓨터공학과']);
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });
});
