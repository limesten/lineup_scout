'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface SpotifyUser {
    displayName: string | null;
    email: string;
    isPremium: boolean;
}

interface SpotifyAuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: SpotifyUser | null;
    login: () => void;
    logout: () => Promise<void>;
}

const SpotifyAuthContext = createContext<SpotifyAuthContextType | undefined>(undefined);

export function SpotifyAuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<SpotifyUser | null>(null);

    useEffect(() => {
        async function checkSession() {
            try {
                const res = await fetch('/api/auth/spotify/session');
                const data = await res.json();
                setIsAuthenticated(data.authenticated);
                setUser(data.user ?? null);
            } catch (error) {
                console.error('Failed to check session:', error);
                setIsAuthenticated(false);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        }

        checkSession();
    }, []);

    const login = useCallback(() => {
        window.location.href = '/api/auth/spotify';
    }, []);

    const logout = useCallback(async () => {
        try {
            await fetch('/api/auth/spotify/logout', { method: 'POST' });
            setIsAuthenticated(false);
            setUser(null);
        } catch (error) {
            console.error('Failed to logout:', error);
        }
    }, []);

    return (
        <SpotifyAuthContext.Provider
            value={{
                isAuthenticated,
                isLoading,
                user,
                login,
                logout,
            }}
        >
            {children}
        </SpotifyAuthContext.Provider>
    );
}

export function useSpotifyAuth(): SpotifyAuthContextType {
    const context = useContext(SpotifyAuthContext);
    if (context === undefined) {
        throw new Error('useSpotifyAuth must be used within a SpotifyAuthProvider');
    }
    return context;
}
