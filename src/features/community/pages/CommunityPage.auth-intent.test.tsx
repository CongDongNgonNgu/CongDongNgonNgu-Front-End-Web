import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { UiLocaleProvider } from '../../ui-locale/UiLocaleProvider';
import { CommunityPage, type CommunityPageApi } from './CommunityPage';
vi.mock('../../auth/AuthProvider',()=>({useAuth:()=>({status:'unauthenticated',user:null})}));
afterEach(()=>{cleanup();localStorage.removeItem('congdongngonngu.ui-locale.v1');});
function LoginIntent(){const location=useLocation();return <output aria-label='return-route'>{location.state?.from}</output>;}
it('preserves saved search filters as the sign-in return route',async()=>{
 localStorage.setItem('congdongngonngu.ui-locale.v1','en');const user=userEvent.setup();
 const api={listPosts:vi.fn()} as unknown as CommunityPageApi;
 render(<UiLocaleProvider><MemoryRouter initialEntries={['/community?q=literal&savedByMe=true&sort=USEFUL']}><Routes><Route path='/community' element={<CommunityPage api={api} catalogApi={{listLanguages:vi.fn().mockResolvedValue([])}}/>}/><Route path='/login' element={<LoginIntent/>}/></Routes></MemoryRouter></UiLocaleProvider>);
 await user.click(await screen.findByRole('button',{name:'Sign in to view saved posts'}));
 expect(screen.getByLabelText('return-route')).toHaveTextContent('/community?q=literal&savedByMe=true&sort=USEFUL');
 expect(api.listPosts).not.toHaveBeenCalled();
});
