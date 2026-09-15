import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../../services/api-client';
import { CommunityCorrectionRequestPageView } from './CommunityCorrectionRequestPage';
import { CommunityQuestionRequestPageView } from './CommunityQuestionRequestPage';
import type { CommunityPost } from '../community.types';
import type { CommunityRequestApi } from '../corrections.types';

afterEach(cleanup);

const languages = [
  {
    code: 'en',
    slug: 'english',
    nativeName: 'English',
    englishName: 'English',
    vietnameseName: 'Tiếng Anh',
    direction: 'ltr' as const,
    active: true,
    launch: true,
    sortOrder: 1,
  },
  {
    code: 'ja',
    slug: 'japanese',
    nativeName: '日本語',
    englishName: 'Japanese',
    vietnameseName: 'Tiếng Nhật',
    direction: 'ltr' as const,
    active: true,
    launch: true,
    sortOrder: 2,
  },
  {
    code: 'xx',
    slug: 'inactive',
    nativeName: 'Inactive',
    englishName: 'Inactive',
    vietnameseName: 'Không hoạt động',
    direction: 'ltr' as const,
    active: false,
    launch: false,
    sortOrder: 3,
  },
];

function createApi(overrides: Partial<CommunityRequestApi> = {}): CommunityRequestApi {
  return {
    createCorrectionRequest: vi.fn(),
    getCorrectionRequest: vi.fn(),
    createQuestion: vi.fn(),
    getQuestion: vi.fn(),
    ...overrides,
  };
}

function LocationPath() {
  const location = useLocation();
  return <output aria-label='location-path'>{location.pathname}</output>;
}

function renderView(element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/community/ask/correction']}>
      {element}
      <LocationPath />
    </MemoryRouter>,
  );
}

function fillCorrectionRequiredFields() {
  fireEvent.change(screen.getByLabelText(/Ngôn ngữ mục tiêu/), { target: { value: 'en' } });
  fireEvent.change(screen.getByLabelText(/Câu hoặc đoạn văn bản cần sửa/), {
    target: { value: '  I has a book.\n😀  ' },
  });
  fireEvent.click(screen.getByRole('radio', { name: /Ngữ pháp/ }));
}

function fillQuestionRequiredFields() {
  fireEvent.change(screen.getByLabelText(/Ngôn ngữ mục tiêu/), { target: { value: 'ja' } });
  fireEvent.change(screen.getByLabelText(/Nội dung câu hỏi/), {
    target: { value: '  これは自然な言い方ですか？  ' },
  });
}

describe('CommunityCorrectionRequestPageView', () => {
  it('uses only active catalog languages and exposes all correction intents', async () => {
    renderView(
      <CommunityCorrectionRequestPageView
        api={createApi()}
        catalogApi={{ listLanguages: vi.fn().mockResolvedValue(languages) }}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Nhờ cộng đồng sửa giúp' })).toBeVisible();
    expect(screen.getByRole('option', { name: /English/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Japanese/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Inactive/ })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Ngữ pháp/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Phong cách diễn đạt/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Cách nói tự nhiên/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Phát âm/ })).toBeInTheDocument();
  });

  it('shows required validation before making a request', async () => {
    const api = createApi();
    const user = userEvent.setup();
    renderView(
      <CommunityCorrectionRequestPageView
        api={api}
        catalogApi={{ listLanguages: vi.fn().mockResolvedValue(languages) }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu sửa' }));

    expect(screen.getByText('Vui lòng chọn ngôn ngữ mục tiêu.')).toBeVisible();
    expect(screen.getByText('Nội dung cần có chữ hoặc ký tự khác khoảng trắng.')).toBeVisible();
    expect(screen.getByText('Vui lòng chọn mục tiêu cần cộng đồng hỗ trợ.')).toBeVisible();
    expect(api.createCorrectionRequest).not.toHaveBeenCalled();
  });

  it('preserves exact correction text and redirects with the returned post id', async () => {
    const api = createApi({
      createCorrectionRequest: vi.fn().mockResolvedValue({
        post: { id: 'correction-post-1' },
        correction: {},
      }),
    });
    renderView(
      <CommunityCorrectionRequestPageView
        api={api}
        catalogApi={{ listLanguages: vi.fn().mockResolvedValue(languages) }}
      />,
    );

    await waitFor(() => expect(screen.getByRole('option', { name: /English/ })).toBeInTheDocument());
    fillCorrectionRequiredFields();
    fireEvent.change(screen.getByLabelText('Bối cảnh (không bắt buộc)'), {
      target: { value: 'Classroom context' },
    });
    fireEvent.change(screen.getByLabelText('Chủ đề'), { target: { value: 'school' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu sửa' }));

    await waitFor(() => expect(api.createCorrectionRequest).toHaveBeenCalledWith({
      languageCode: 'en',
      originalText: '  I has a book.\n😀  ',
      correctionIntent: 'GRAMMAR',
      context: 'Classroom context',
      topic: 'school',
      visibility: 'PUBLIC',
    }));
    await waitFor(() => expect(screen.getByLabelText('location-path')).toHaveTextContent('/community/posts/correction-post-1'));
  });

  it('prevents duplicate correction submits and keeps input after a rate limit', async () => {
    let rejectRequest: (error: unknown) => void = () => undefined;
    const api = createApi({
      createCorrectionRequest: vi.fn().mockImplementation(() => new Promise((_, reject) => {
        rejectRequest = reject;
      })),
    });
    renderView(
      <CommunityCorrectionRequestPageView
        api={api}
        catalogApi={{ listLanguages: vi.fn().mockResolvedValue(languages) }}
      />,
    );

    await waitFor(() => expect(screen.getByRole('option', { name: /English/ })).toBeInTheDocument());
    fillCorrectionRequiredFields();
    const submit = screen.getByRole('button', { name: 'Gửi yêu cầu sửa' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(api.createCorrectionRequest).toHaveBeenCalledOnce();
    expect(submit).toBeDisabled();

    rejectRequest(new ApiClientError('rate limited', 429, 'CORRECTIONS_RATE_LIMITED'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng thử lại sau ít phút');
    expect(screen.getByLabelText(/Câu hoặc đoạn văn bản cần sửa/)).toHaveValue('  I has a book.\n😀  ');
  });
});

describe('CommunityQuestionRequestPageView', () => {
  it('submits only supported question fields and redirects to the created post', async () => {
    const post = { id: 'question-post-1' } as CommunityPost;
    const api = createApi({ createQuestion: vi.fn().mockResolvedValue(post) });
    renderView(
      <CommunityQuestionRequestPageView
        api={api}
        catalogApi={{ listLanguages: vi.fn().mockResolvedValue(languages) }}
      />,
    );

    await waitFor(() => expect(screen.getByRole('option', { name: /Japanese/ })).toBeInTheDocument());
    fillQuestionRequiredFields();
    fireEvent.change(screen.getByLabelText('Chủ đề'), { target: { value: 'travel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng câu hỏi' }));

    await waitFor(() => expect(api.createQuestion).toHaveBeenCalledWith({
      languageCode: 'ja',
      content: '  これは自然な言い方ですか？  ',
      topic: 'travel',
      visibility: 'PUBLIC',
    }));
    await waitFor(() => expect(screen.getByLabelText('location-path')).toHaveTextContent('/community/posts/question-post-1'));
    expect(screen.queryByLabelText(/Tiêu đề/)).not.toBeInTheDocument();
  });

  it('keeps question content after an API failure', async () => {
    const api = createApi({
      createQuestion: vi.fn().mockRejectedValue(new ApiClientError('server error', 500, 'INTERNAL_ERROR')),
    });
    renderView(
      <CommunityQuestionRequestPageView
        api={api}
        catalogApi={{ listLanguages: vi.fn().mockResolvedValue(languages) }}
      />,
    );

    await waitFor(() => expect(screen.getByRole('option', { name: /English/ })).toBeInTheDocument());
    fillQuestionRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng câu hỏi' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Hệ thống đang bận');
    expect(screen.getByLabelText(/Nội dung câu hỏi/)).toHaveValue('  これは自然な言い方ですか？  ');
  });
});
