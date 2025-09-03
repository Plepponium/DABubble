export class User {
    uid!: string;
    name: string = '';
    email: string = '';
    password: string = '';
    img: string = 'default-user';
    createdAt?: any;
    lastSeen?: any;
    presence: 'online' | 'offline' | 'idle' = 'offline';

    constructor(obj?: Partial<User>) {
        Object.assign(this, obj);
    }
}
