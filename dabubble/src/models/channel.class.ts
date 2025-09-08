export class Channel {
  id!: string;
  name: string = '';
  description?: string;
  user: string = '';
  createdBy?: string;
  createdAt?: any;
  lastMessage?: any;
  chats?: string;

  constructor(init?: Partial<Channel>) {
    Object.assign(this, init);
  }

  //   static fromFirestore(doc: any): Channel {
  //     const data = doc.data ? doc.data() : doc;
  //     return new Channel({
  //       id: doc.id ?? data.id,
  //       name: data.name ?? '',
  //       user: data.user ?? '',
  //       createdAt: data.createdAt,
  //       lastMessage: data.lastMessage,
  //       chats: data.chats
  //     });
  //   }
}