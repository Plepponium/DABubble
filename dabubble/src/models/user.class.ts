export class User {
    name: string = '';
    email: string = '';
    password: string = '';
    photoURL: string = 'assets/user-icons/default-user.svg';
    createdAt?: any;
    lastSeen?: any;
    presence: 'online' | 'offline' | 'idle' = 'offline';

    constructor(obj?: Partial<User>) {
        Object.assign(this, obj);
    }
}
