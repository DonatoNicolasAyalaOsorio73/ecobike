import { getAuth } from 'firebase/auth';

export const getCurrentUser = async () => {
  try {
    const auth = getAuth();
    return auth.currentUser;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export default { getCurrentUser };
