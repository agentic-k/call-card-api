// types.ts      # Shared type definitions (User, Session, etc.)

// ADHD tip: Define only what you need, keep it flat

export interface User {
    id: string;
    email?: string;
}

export interface Session {
    user: User;
    expires_at: number;
}
