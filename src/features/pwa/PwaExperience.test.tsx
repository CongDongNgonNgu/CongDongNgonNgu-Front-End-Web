import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PwaExperience } from './PwaExperience';

afterEach(cleanup);

describe('PwaExperience', () => {
  it('truthfully explains that protected actions need network while offline', () => {
    render(<PwaExperience online={false} installSurface="none" updateReady={false} />);

    expect(screen.getByRole('status')).toHaveTextContent(/đang ngoại tuyến/i);
    expect(screen.getByRole('status')).toHaveTextContent(/đăng nhập, cộng đồng, AI và thanh toán cần kết nối mạng/i);
  });

  it('offers a browser install action without blocking the page', async () => {
    const user = userEvent.setup();
    const onInstall = vi.fn().mockResolvedValue(undefined);
    render(<PwaExperience online installSurface="browser-prompt" updateReady={false} onInstall={onInstall} />);

    await user.click(screen.getByRole('button', { name: 'Cài ứng dụng' }));
    expect(onInstall).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Đóng hướng dẫn cài đặt' })).toBeVisible();
  });

  it('shows honest iOS manual guidance instead of pretending to automate installation', () => {
    render(<PwaExperience online installSurface="ios-guide" updateReady={false} />);

    expect(screen.getByText(/Chia sẻ/)).toBeVisible();
    expect(screen.getByText(/Thêm vào Màn hình chính/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Cài ứng dụng' })).not.toBeInTheDocument();
  });

  it('offers a safe refresh when a new version is waiting', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<PwaExperience online installSurface="none" updateReady onUpdate={onUpdate} />);

    await user.click(screen.getByRole('button', { name: 'Cập nhật ứng dụng' }));
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});
