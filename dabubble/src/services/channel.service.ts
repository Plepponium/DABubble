import { inject, Injectable } from '@angular/core';
import { Firestore, collectionData, collection, addDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Channel } from '../models/channel.class';

@Injectable({ providedIn: 'root' })
export class ChannelService {
  private firestore = inject(Firestore);

  constructor() { }

  getChannels(): Observable<Channel[]> {
    const channelsCollection = collection(this.firestore, 'channels');
    return collectionData(channelsCollection, { idField: 'id' }) as Observable<Channel[]>;
  }

  getChatsForChannel(channelId: string): Observable<any[]> {
    const chatsCollection = collection(this.firestore, `channels/${channelId}/chats`);
    return collectionData(chatsCollection, { idField: 'id' }) as Observable<any[]>;
  }

  addChannel(channel: Partial<Channel>): Promise<any> {
    const channelsCollection = collection(this.firestore, 'channels');
    return addDoc(channelsCollection, channel);
  }

  addChatToChannel(channelId: string, chat: any): Promise<any> {
    const chatsCollection = collection(this.firestore, `channels/${channelId}/chats`);
    return addDoc(chatsCollection, chat);
  }
}