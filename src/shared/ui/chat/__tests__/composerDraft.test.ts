import {restoreComposerDraftAfterEdit} from '../composerDraft';

describe('composerDraft', () => {
  it('수정 저장 중 새로 입력한 초안은 덮어쓰지 않는다', () => {
    expect(
      restoreComposerDraftAfterEdit({
        currentValue: '수정할 메시지',
        previousDraft: '기존 초안',
        submittedValue: '수정할 메시지',
      }),
    ).toBe('기존 초안');

    expect(
      restoreComposerDraftAfterEdit({
        currentValue: '새 메시지 초안',
        previousDraft: '기존 초안',
        submittedValue: '수정할 메시지',
      }),
    ).toBe('새 메시지 초안');
  });
});
