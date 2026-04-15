import { create } from 'zustand';

const useAuthStore = create((set) => ({
  token: localStorage.getItem('adminToken') || null,
  user: JSON.parse(localStorage.getItem('adminUser') || 'null'),
  scope: localStorage.getItem('adminScope') || null,

  setAuth: (token, user) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(user));
    localStorage.setItem('adminScope', user.scope ?? '');
    set({ token, user, scope: user.scope ?? null });
  },

  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminScope');
    set({ token: null, user: null, scope: null });
  },
}));

export default useAuthStore;
