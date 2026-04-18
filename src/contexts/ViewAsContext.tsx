import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile, AppRole } from '@/types/database';

interface TeamMember {
  profile: Profile;
  role: AppRole;
}

interface ViewAsContextType {
  /** The profile being "viewed as", or null if viewing as self */
  viewAsProfile: Profile | null;
  viewAsRole: AppRole | null;
  /** The effective profile (viewed-as or real) */
  effectiveProfile: Profile | null;
  effectiveRole: AppRole | null;
  effectiveUserId: string | null;
  /** Whether currently impersonating */
  isViewingAs: boolean;
  /** Available team members to view as */
  teamMembers: TeamMember[];
  /** Set viewed collaborator (null = back to self) */
  setViewAs: (profile: Profile | null, role?: AppRole | null) => void;
  /** Clear impersonation */
  clearViewAs: () => void;
}

const ViewAsContext = createContext<ViewAsContextType | undefined>(undefined);

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const { profile: realProfile, role: realRole, user, isAdmin } = useAuth();
  const [viewAsProfile, setViewAsProfile] = useState<Profile | null>(null);
  const [viewAsRole, setViewAsRole] = useState<AppRole | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Load team members when admin
  useEffect(() => {
    if (!isAdmin || !user) {
      setTeamMembers([]);
      return;
    }

    let cancelled = false;

    (async () => {
      // Get all profiles in the same org
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (cancelled || !profiles) return;

      // Get all roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('*');

      if (cancelled || !roles) return;

      const roleMap = new Map(roles.map(r => [r.user_id, r.role as AppRole]));

      const members: TeamMember[] = profiles
        .filter(p => {
          if (p.user_id === user.id) return false; // exclude self
          const r = roleMap.get(p.user_id);
          // exclude clients (and any user without a team role)
          return r === 'owner' || r === 'admin' || r === 'barber';
        })
        .map(p => ({
          profile: p as Profile,
          role: roleMap.get(p.user_id) || 'barber' as AppRole,
        }));

      setTeamMembers(members);
    })();

    return () => { cancelled = true; };
  }, [isAdmin, user]);

  const setViewAs = useCallback((profile: Profile | null, role?: AppRole | null) => {
    setViewAsProfile(profile);
    setViewAsRole(role ?? null);
  }, []);

  const clearViewAs = useCallback(() => {
    setViewAsProfile(null);
    setViewAsRole(null);
  }, []);

  const isViewingAs = viewAsProfile !== null;
  const effectiveProfile = isViewingAs ? viewAsProfile : realProfile;
  const effectiveRole = isViewingAs ? viewAsRole : realRole;
  const effectiveUserId = isViewingAs ? viewAsProfile?.user_id ?? null : user?.id ?? null;

  return (
    <ViewAsContext.Provider value={{
      viewAsProfile,
      viewAsRole,
      effectiveProfile,
      effectiveRole,
      effectiveUserId,
      isViewingAs,
      teamMembers,
      setViewAs,
      clearViewAs,
    }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  const context = useContext(ViewAsContext);
  if (!context) {
    throw new Error('useViewAs must be used within a ViewAsProvider');
  }
  return context;
}
