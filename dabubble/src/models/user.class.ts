export interface User {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    createdAt?: any;
    lastSeen?: any;
    presence?: 'online' | 'offline' | 'idle';
}