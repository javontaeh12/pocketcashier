import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  user: User | null;
  businessId: string | null;
  isDeveloper: boolean;
  impersonatedBusinessId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  impersonateBusiness: (businessId: string | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [impersonatedBusinessId, setImpersonatedBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const devStatus = await checkDeveloperStatus(session.user.id);
        setIsDeveloper(devStatus);
        if (!devStatus) {
          await loadBusinessId(session.user.id);
        }
      } else {
        await loadBusinessFromUrl();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const devStatus = await checkDeveloperStatus(session.user.id);
          setIsDeveloper(devStatus);
          if (!devStatus) {
            await loadBusinessId(session.user.id);
          }
        } else {
          await loadBusinessFromUrl();
        }
      })();
    });

    const handlePopState = () => {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session?.user) {
          await loadBusinessFromUrl();
        }
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const checkDeveloperStatus = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('developer_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    return !!data;
  };

  const loadBusinessFromUrl = async () => {
    const pathname = window.location.pathname;
    const urlSlug = pathname.split('/')[1];
    const reservedPaths = ['square-callback', 'admin'];

    if (urlSlug && !reservedPaths.includes(urlSlug.toLowerCase()) && !urlSlug.startsWith('#')) {
      const { data } = await supabase
        .from('businesses')
        .select('id')
        .eq('url_slug', urlSlug)
        .maybeSingle();

      if (data) {
        setBusinessId(data.id);
      } else {
        setBusinessId(null);
      }
    } else {
      setBusinessId(null);
    }
  };

  const loadBusinessId = async (userId: string) => {
    let { data } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) {
      const { data: unassignedBusiness } = await supabase
        .from('businesses')
        .select('id')
        .is('user_id', null)
        .maybeSingle();

      if (unassignedBusiness) {
        const { data: updated } = await supabase
          .from('businesses')
          .update({ user_id: userId })
          .eq('id', unassignedBusiness.id)
          .select()
          .maybeSingle();

        data = updated;
      } else {
        const { data: newBusiness } = await supabase
          .from('businesses')
          .insert({ name: 'My Business', user_id: userId })
          .select()
          .maybeSingle();

        data = newBusiness;
      }
    }

    setBusinessId(data?.id || null);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      await loadBusinessId(data.user.id);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch (err) {
      console.error('Sign out error:', err);
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem('supabase.auth.token');
        } catch (e) {
          console.warn('Could not clear localStorage:', e);
        }
      }
    }
    setUser(null);
    setIsDeveloper(false);
    setImpersonatedBusinessId(null);
    await loadBusinessFromUrl();
  };

  const impersonateBusiness = (businessId: string | null) => {
    setImpersonatedBusinessId(businessId);
  };

  return (
    <AuthContext.Provider value={{
      user,
      businessId: impersonatedBusinessId || businessId,
      isDeveloper,
      impersonatedBusinessId,
      loading,
      signIn,
      signUp,
      signOut,
      impersonateBusiness
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
