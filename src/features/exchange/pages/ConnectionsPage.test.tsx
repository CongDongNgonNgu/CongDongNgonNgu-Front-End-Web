import { act as flushReact, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ConnectionsPageView } from './ConnectionsPage';
import type { ConnectionListApi, ConnectionListItem, ExchangeRelationshipResponse } from '../exchange.types';

afterEach(cleanup);
const item = (id = 'one'): ConnectionListItem => ({connectionId:id,targetUserId:'user-'+id,
  displayName:'Nguyễn Thị Thu Hương '+id,state:'CONNECTED',updatedAt:'2026-10-09T00:00:00.000Z'});
function api(): ConnectionListApi {
  return {listConnections:vi.fn().mockResolvedValue({items:[item()],nextCursor:null}),
    acceptConnection:vi.fn(),declineConnection:vi.fn(),cancelConnection:vi.fn(),disconnect:vi.fn()};
}
function view(client: ConnectionListApi, authenticated = true) {
  return render(<MemoryRouter><ConnectionsPageView api={client} authenticated={authenticated}/></MemoryRouter>);
}
describe('Connections page', () => {
  it('does not let an old account refresh unlock or dismiss a new account mutation',async()=>{
    const client=api();
    let finishOldRefresh!:(page:{items:ConnectionListItem[];nextCursor:null})=>void;
    let finishNewMutation!:(response:ExchangeRelationshipResponse)=>void;
    vi.mocked(client.listConnections).mockResolvedValueOnce({items:[item()],nextCursor:null})
      .mockImplementationOnce(()=>new Promise(resolve=>{finishOldRefresh=resolve;}))
      .mockResolvedValueOnce({items:[item('new')],nextCursor:null})
      .mockResolvedValue({items:[],nextCursor:null});
    vi.mocked(client.disconnect).mockResolvedValueOnce({state:'NONE'} as ExchangeRelationshipResponse)
      .mockImplementationOnce(()=>new Promise(resolve=>{finishNewMutation=resolve;}));
    const mounted=render(<MemoryRouter><ConnectionsPageView api={client} authenticated actorKey='old'/></MemoryRouter>);
    await screen.findByText(item().displayName);
    await userEvent.click(screen.getByRole('button',{name:'Hủy kết nối'}));
    await userEvent.click(screen.getByRole('button',{name:'Xác nhận hủy kết nối'}));
    await waitFor(()=>expect(client.listConnections).toHaveBeenCalledTimes(2));
    mounted.rerender(<MemoryRouter><ConnectionsPageView api={client} authenticated actorKey='new'/></MemoryRouter>);
    await screen.findByText(item('new').displayName);
    await userEvent.click(screen.getByRole('button',{name:'Hủy kết nối'}));
    await userEvent.click(screen.getByRole('button',{name:'Xác nhận hủy kết nối'}));
    await waitFor(()=>expect(client.disconnect).toHaveBeenCalledTimes(2));
    await flushReact(async()=>{finishOldRefresh({items:[],nextCursor:null});});
    await waitFor(()=>expect(screen.getByRole('button',{name:'Xác nhận hủy kết nối'})).toBeDisabled());
    expect(screen.getByRole('dialog')).toHaveTextContent(item('new').displayName);
    await userEvent.click(screen.getByRole('button',{name:'Xác nhận hủy kết nối'}));
    expect(client.disconnect).toHaveBeenCalledTimes(2);
    finishNewMutation({state:'NONE'} as ExchangeRelationshipResponse);
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it.each([401,403])('clears private rows when a subsequent page is denied with %s', async status => {
    const client=api();vi.mocked(client.listConnections)
      .mockResolvedValueOnce({items:[item()],nextCursor:'next'})
      .mockRejectedValueOnce({status});
    view(client);await screen.findByText(item().displayName);
    await userEvent.click(screen.getByRole('button',{name:'Tải thêm'}));
    await waitFor(()=>expect(screen.queryByText(item().displayName)).not.toBeInTheDocument());
    expect(screen.queryByRole('button',{name:'Tải thêm'})).not.toBeInTheDocument();
  });
  it('discards old removal confirmation across logout and a new login', async () => {
    const client=api();const mounted=view(client);
    await screen.findByText(item().displayName);
    await userEvent.click(screen.getByRole('button',{name:'Hủy kết nối'}));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    mounted.rerender(<MemoryRouter><ConnectionsPageView api={client} authenticated={false}/></MemoryRouter>);
    vi.mocked(client.listConnections).mockResolvedValue({items:[],nextCursor:null});
    mounted.rerender(<MemoryRouter><ConnectionsPageView api={client} authenticated/></MemoryRouter>);
    await waitFor(()=>expect(client.listConnections).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('keeps empty scan pages navigable and deduplicates repeated connection rows', async () => {
    const client=api();
    vi.mocked(client.listConnections).mockResolvedValueOnce({items:[],nextCursor:'opaque-first'})
      .mockResolvedValueOnce({items:[item()],nextCursor:'opaque-second'})
      .mockResolvedValueOnce({items:[item(),item('two')],nextCursor:null});
    view(client);
    await userEvent.click(await screen.findByRole('button',{name:'Tải thêm'}));
    await screen.findByText(item().displayName);
    await userEvent.click(screen.getByRole('button',{name:'Tải thêm'}));
    await screen.findByText(item('two').displayName);
    expect(screen.getAllByText(item().displayName)).toHaveLength(1);
    expect(client.listConnections).toHaveBeenLastCalledWith({kind:'CONNECTED',limit:20,cursor:'opaque-second'});
    expect(screen.queryByRole('button',{name:'Tải thêm'})).not.toBeInTheDocument();
  });
  it('requires explicit disconnect confirmation and refreshes current server state', async () => {
    const client=api();
    vi.mocked(client.disconnect).mockResolvedValue({state:'NONE'} as ExchangeRelationshipResponse);
    view(client);
    await screen.findByText(item().displayName);
    await userEvent.click(screen.getByRole('button',{name:'Hủy kết nối'}));
    expect(client.disconnect).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    vi.mocked(client.listConnections).mockResolvedValue({items:[],nextCursor:null});
    await userEvent.click(screen.getByRole('button',{name:'Xác nhận hủy kết nối'}));
    await waitFor(()=>expect(client.disconnect).toHaveBeenCalledWith(item().targetUserId));
    await waitFor(()=>expect(screen.queryByText(item().displayName)).not.toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('ignores a late response from a previous tab', async () => {
    const client=api();
    let finish!: (value: {items:ConnectionListItem[];nextCursor:null})=>void;
    vi.mocked(client.listConnections).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}))
      .mockResolvedValueOnce({items:[{...item('incoming'),state:'INCOMING_PENDING'}],nextCursor:null});
    view(client);
    await userEvent.click(screen.getByRole('button',{name:'Lời mời đến'}));
    await screen.findByText(item('incoming').displayName);
    finish({items:[item('stale')],nextCursor:null});
    await waitFor(()=>expect(client.listConnections).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(item('stale').displayName)).not.toBeInTheDocument();
  });
  it('does not fetch or show private rows after logout', async () => {
    const client=api();const mounted=view(client);
    await screen.findByText(item().displayName);
    mounted.rerender(<MemoryRouter><ConnectionsPageView api={client} authenticated={false}/></MemoryRouter>);
    expect(screen.queryByText(item().displayName)).not.toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Đăng nhập'})).toBeInTheDocument();
    expect(client.listConnections).toHaveBeenCalledTimes(1);
  });
});
