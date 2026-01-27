export class Channel {
  id!: string;
  name!: string;
  description?: string;
  participants!: string[];
  createdBy?: string;
  createdByName?: string;
  createdAt?: any;
  lastMessage?: any;
  chats?: string;

  constructor(init?: Partial<Channel>) {
    Object.assign(this, init);
  }
}