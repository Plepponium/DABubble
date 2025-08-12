export class User {
    uid: string;
    name: string;
    email: string;
    password: string;
    photoURL: string;
    createdAt: any;
    lastSeen: any;
    presence: 'online' | 'offline' | 'idle';

    constructor(obj?: any) {
        this.uid = obj ? obj.uid : '';
        this.name = obj ? obj.name : '';
        this.email = obj ? obj.email : '';
        this.password = obj ? obj.password : '';
        this.photoURL = obj ? obj.photoURL : '';
        this.createdAt = obj ? obj.createdAt : '';
        this.lastSeen = obj ? obj.lastSeen : '';
        this.presence = obj ? obj.presence : '';
    }
}