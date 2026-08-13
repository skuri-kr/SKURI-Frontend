import {renderHook, waitFor} from '@testing-library/react-native';

import {inquiryApiClient} from '../../data/api/inquiryApiClient';
import {useInquiryHistoryData} from '../useInquiryHistoryData';

const getMyInquiries = jest.spyOn(inquiryApiClient, 'getMyInquiries');

describe('useInquiryHistoryData', () => {
  afterEach(() => {
    getMyInquiries.mockReset();
  });

  it('원문 줄바꿈과 사용자 공개 답변을 보존한다', async () => {
    getMyInquiries.mockResolvedValue({
      data: [
        {
          answer: '문제를 확인했고 다음 배포에 반영하겠습니다.',
          attachments: [],
          content: '첫 번째 줄입니다.\n두 번째 줄입니다.\n세 번째 줄입니다.',
          createdAt: '2026-08-13T03:00:00Z',
          id: 'inquiry-1',
          status: 'RESOLVED',
          subject: '앱 오류 문의',
          type: 'BUG',
          updatedAt: '2026-08-13T03:30:00Z',
        },
      ],
      success: true,
    } as never);

    const {result} = renderHook(() => useInquiryHistoryData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.items[0]).toMatchObject({
      adminAnswer: '문제를 확인했고 다음 배포에 반영하겠습니다.',
      content: '첫 번째 줄입니다.\n두 번째 줄입니다.\n세 번째 줄입니다.',
    });
  });

  it('답변이 없으면 관리자 답변 데이터를 만들지 않는다', async () => {
    getMyInquiries.mockResolvedValue({
      data: [
        {
          answer: null,
          attachments: [],
          content: '답변이 아직 없는 문의입니다.',
          createdAt: '2026-08-13T03:00:00Z',
          id: 'inquiry-1',
          status: 'PENDING',
          subject: '앱 오류 문의',
          type: 'BUG',
          updatedAt: '2026-08-13T03:00:00Z',
        },
      ],
      success: true,
    } as never);

    const {result} = renderHook(() => useInquiryHistoryData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.items[0].adminAnswer).toBeUndefined();
  });
});
