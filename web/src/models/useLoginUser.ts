import { useEffect, useState } from 'react';
import { getLoginUser, onLoginUserChange, setLoginUser, User } from '@/api/base/user';
import { userApi } from '@/api';

export default function useLoginUser() {
  const [user, setUser] = useState<User | null>(() => getLoginUser());

  useEffect(() => {
    if (user?.token) {
      // 每次初始化 都查询最新的用户信息然后写入本地
      userApi.getLoginUserByToken(user.token).then((newUser) => setLoginUser(newUser));
    }
    onLoginUserChange((user) => setUser(user)); // 监听 user 变更
  }, []);

  return {
    user,
    setUser(user: User | null) {
      setLoginUser(user);
    },
    refreshUser() {
      if (user?.token) {
        userApi.getLoginUserByToken(user.token).then((newUser) => setLoginUser(newUser));
      }
    },
  };
}
